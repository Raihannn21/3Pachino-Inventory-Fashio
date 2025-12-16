import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity-logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const transaction = await prisma.transaction.findUnique({
      where: { 
        id,
        type: 'PURCHASE'
      },
      include: {
        supplier: true,
        items: {
          include: {
            variant: {
              include: {
                product: {
                  include: {
                    category: true,
                    brand: true
                  }
                },
                size: true,
                color: true
              }
            }
          }
        }
      }
    });

    if (!transaction) {
      return NextResponse.json(
        { error: 'Purchase not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(transaction);
  } catch (error) {
    console.error('Error fetching purchase:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchase' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check if transaction exists
    const transaction = await prisma.transaction.findUnique({
      where: { 
        id,
        type: 'PURCHASE'
      },
      include: {
        items: true
      }
    });

    if (!transaction) {
      return NextResponse.json(
        { error: 'Purchase not found' },
        { status: 404 }
      );
    }

    // Check if purchase can be deleted (e.g., only pending purchases)
    if (transaction.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Hanya production order dengan status PENDING yang dapat dihapus' },
        { status: 400 }
      );
    }

    // Delete in transaction to ensure data consistency
    await prisma.$transaction(async (tx) => {
      // Delete transaction items first
      await tx.transactionItem.deleteMany({
        where: { transactionId: id }
      });

      // Delete the transaction
      await tx.transaction.delete({
        where: { id }
      });
    });

    // Log activity
    const session = await getServerSession(authOptions);
    if (session?.user) {
      await logActivity({
        userId: session.user.id,
        action: 'DELETE',
        resource: 'purchases',
        resourceId: id,
        metadata: { invoiceNumber: transaction.invoiceNumber }
      }, request);
    }

    return NextResponse.json({ 
      message: 'Purchase deleted successfully' 
    });

  } catch (error) {
    console.error('Error deleting purchase:', error);
    return NextResponse.json(
      { error: 'Failed to delete purchase' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const { supplierId, notes, items, status } = body;

    // Check if transaction exists
    const existingTransaction = await prisma.transaction.findUnique({
      where: { 
        id,
        type: 'PURCHASE'
      }
    });

    if (!existingTransaction) {
      return NextResponse.json(
        { error: 'Purchase not found' },
        { status: 404 }
      );
    }

    // Update transaction in transaction
    const updatedTransaction = await prisma.$transaction(async (tx) => {
      // Delete existing items
      await tx.transactionItem.deleteMany({
        where: { transactionId: id }
      });

      // Calculate new total
      const totalAmount = items.reduce((sum: number, item: any) => 
        sum + (item.quantity * item.unitPrice), 0
      );

      // Update transaction
      const transaction = await tx.transaction.update({
        where: { id },
        data: {
          supplierId,
          notes,
          totalAmount,
          status: status || existingTransaction.status
        }
      });

      // Create new items
      if (items && items.length > 0) {
        await tx.transactionItem.createMany({
          data: items.map((item: any) => ({
            transactionId: id,
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice
          }))
        });
      }

      return transaction;
    });

    // Log activity
    const session = await getServerSession(authOptions);
    if (session?.user) {
      await logActivity({
        userId: session.user.id,
        action: 'UPDATE',
        resource: 'purchases',
        resourceId: id,
        metadata: { 
          invoiceNumber: updatedTransaction.invoiceNumber,
          status: updatedTransaction.status
        }
      }, request);
    }

    return NextResponse.json(updatedTransaction);

  } catch (error) {
    console.error('Error updating purchase:', error);
    return NextResponse.json(
      { error: 'Failed to update purchase' },
      { status: 500 }
    );
  }
}
