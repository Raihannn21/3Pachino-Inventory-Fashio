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
        product: { select: { name: true } },
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

    // Create stock adjustment record
    const adjustment = await prisma.stockAdjustment.create({
      data: {
        variantId,
        adjustmentType,
        quantity,
        stockBefore: currentStock,
        stockAfter: newStock,
        reason,
        notes,
        createdBy: firstUser.id, // Use actual user ID
      }
    });

    // Update variant stock
    await prisma.productVariant.update({
      where: { id: variantId },
      data: { stock: newStock }
    });

    return NextResponse.json({
      success: true,
      adjustment,
      message: `Stock ${adjustmentType === 'INCREASE' ? 'bertambah' : 'berkurang'} ${quantity} unit`
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

    if (!variantId) {
      return NextResponse.json(
        { error: 'Variant ID is required' },
        { status: 400 }
      );
    }

    const adjustments = await prisma.stockAdjustment.findMany({
      where: { variantId },
      include: {
        user: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50 // Limit to last 50 adjustments
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
