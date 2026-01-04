import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { variantId, adjustmentType, quantity, reason, notes } = body;

    // Validate required fields
    if (!variantId || !adjustmentType || !quantity || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get current variant
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: { 
          select: { 
            name: true, 
            costPrice: true,
            sellingPrice: true 
          } 
        },
        size: { select: { name: true } },
        color: { select: { name: true } }
      }
    });

    if (!variant) {
      return NextResponse.json(
        { error: 'Variant not found' },
        { status: 404 }
      );
    }

    const currentStock = variant.stock;
    let newStock: number;

    if (adjustmentType === 'INCREASE') {
      newStock = currentStock + quantity;
    } else if (adjustmentType === 'DECREASE') {
      newStock = currentStock - quantity;
      if (newStock < 0) {
        return NextResponse.json(
          { error: 'Stock tidak boleh negatif' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid adjustment type' },
        { status: 400 }
      );
    }

    // Get first available user as fallback (TODO: implement proper auth)
    const firstUser = await prisma.user.findFirst({
      select: { id: true }
    });

    if (!firstUser) {
      return NextResponse.json(
        { error: 'No users found in system' },
        { status: 500 }
      );
    }

    // Use Prisma transaction for atomic operations
    const result = await prisma.$transaction(async (tx) => {
      // Create stock adjustment record
      const adjustment = await tx.stockAdjustment.create({
        data: {
          variantId,
          adjustmentType,
          quantity,
          stockBefore: currentStock,
          stockAfter: newStock,
          reason,
          notes,
          createdBy: firstUser.id,
        }
      });

      // Update variant stock
      await tx.productVariant.update({
        where: { id: variantId },
        data: { stock: newStock }
      });

      // If this is a production adjustment, create a production order record
      if (reason === 'PRODUCTION' && adjustmentType === 'INCREASE') {
        const invoiceNumber = `PROD-ADJ-${Date.now()}`;
        
        // Calculate unit price (use variant's cost price or product's cost price)
        const unitPrice = variant.costPrice || Number(variant.product.costPrice) || 0;
        const totalAmount = unitPrice * quantity;

        // Create production order transaction
        const productionOrder = await tx.transaction.create({
          data: {
            type: 'PURCHASE', // Use PURCHASE type for production orders
            invoiceNumber,
            totalAmount,
            notes: `Auto-generated from stock adjustment: ${notes || 'Produksi barang jadi'}`,
            status: 'COMPLETED', // Mark as completed since stock already adjusted
            userId: firstUser.id,
            items: {
              create: {
                productId: variant.productId,
                variantId: variant.id,
                quantity,
                unitPrice,
                totalPrice: totalAmount
              }
            }
          }
        });

        // Create stock movement record
        await tx.stockMovement.create({
          data: {
            variantId,
            type: 'IN',
            quantity,
            reason: 'PRODUCTION',
            reference: invoiceNumber,
            createdBy: firstUser.id
          }
        });

        return { adjustment, productionOrder };
      }

      return { adjustment };
    });

    return NextResponse.json({
      success: true,
      adjustment: result.adjustment,
      productionOrder: result.productionOrder,
      message: `Stock ${adjustmentType === 'INCREASE' ? 'bertambah' : 'berkurang'} ${quantity} unit${reason === 'PRODUCTION' && adjustmentType === 'INCREASE' ? '. Production order telah dibuat otomatis.' : ''}`
    });

  } catch (error) {
    console.error('Error creating stock adjustment:', error);
    return NextResponse.json(
      { error: 'Failed to create stock adjustment' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const variantId = searchParams.get('variantId');

    // Support fetching all adjustments or adjustments for a specific variant
    const adjustments = await prisma.stockAdjustment.findMany({
      where: variantId ? { variantId } : {},
      include: {
        user: {
          select: { name: true }
        },
        variant: {
          include: {
            product: {
              select: { name: true }
            },
            size: {
              select: { name: true }
            },
            color: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: variantId ? 50 : 200 // More results when fetching all
    });

    return NextResponse.json({ adjustments });

  } catch (error) {
    console.error('Error fetching adjustment history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch adjustment history' },
      { status: 500 }
    );
  }
}
