import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) {
  try {
    const { id, variantId } = await params;
    const body = await request.json();
    const { minStock, sellingPrice } = body;

    // Get current variant
    const currentVariant = await prisma.productVariant.findUnique({
      where: { id: variantId },
    });

    if (!currentVariant) {
      return NextResponse.json(
        { error: 'Variant not found' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: any = {
      minStock: parseInt(minStock),
    };

    // Update selling price if provided (cost price always uses product price)
    if (sellingPrice !== undefined) {
      updateData.sellingPrice = sellingPrice === null ? null : parseFloat(sellingPrice);
    }

    // Update variant
    const variant = await prisma.productVariant.update({
      where: { id: variantId },
      data: updateData,
      include: {
        size: true,
        color: true,
        product: {
          select: {
            name: true,
            sku: true,
          },
        },
      },
    });

    return NextResponse.json(variant);
  } catch (error) {
    console.error('Error updating variant:', error);
    return NextResponse.json(
      { error: 'Failed to update variant' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) {
  try {
    const { variantId } = await params;

    console.log('Attempting to delete variant:', variantId);

    // Check if variant exists
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId }
    });

    if (!variant) {
      console.log('Variant not found:', variantId);
      return NextResponse.json(
        { error: 'Varian tidak ditemukan' },
        { status: 404 }
      );
    }

    console.log('Variant found:', variant);

    // Check if variant has any transactions
    const transactionCount = await prisma.transactionItem.count({
      where: { variantId: variantId }
    });

    console.log('Transaction count:', transactionCount);

    if (transactionCount > 0) {
      return NextResponse.json(
        { error: 'Tidak dapat menghapus varian yang sudah memiliki riwayat transaksi' },
        { status: 400 }
      );
    }

    // Check if variant has any stock adjustments
    const adjustmentCount = await prisma.stockAdjustment.count({
      where: { variantId: variantId }
    });

    console.log('Stock adjustment count:', adjustmentCount);

    if (adjustmentCount > 0) {
      return NextResponse.json(
        { error: 'Tidak dapat menghapus varian yang sudah memiliki riwayat adjustment' },
        { status: 400 }
      );
    }

    // Check and clean up stock movements (these can be safely deleted if no transactions)
    const stockMovementCount = await prisma.stockMovement.count({
      where: { variantId: variantId }
    });

    console.log('Stock movement count:', stockMovementCount);

    if (stockMovementCount > 0) {
      console.log('Cleaning up stock movements before deletion...');
      await prisma.stockMovement.deleteMany({
        where: { variantId: variantId }
      });
      console.log(`Deleted ${stockMovementCount} stock movements`);
    }

    console.log('All checks passed, deleting variant...');

    // Delete the variant
    await prisma.productVariant.delete({
      where: { id: variantId },
    });

    console.log('Variant deleted successfully');

    return NextResponse.json({ message: 'Varian berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting variant:', error);
    return NextResponse.json(
      { error: 'Gagal menghapus varian', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
