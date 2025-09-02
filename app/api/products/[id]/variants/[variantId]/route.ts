import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) {
  try {
    const { id, variantId } = await params;
    const body = await request.json();
    const { minStock } = body;

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

    // Update only minStock (stock managed by production/adjustment systems)
    const variant = await prisma.productVariant.update({
      where: { id: variantId },
      data: {
        minStock: parseInt(minStock),
      },
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

    // Check if variant has any transactions
    const transactionCount = await prisma.transactionItem.count({
      where: { variantId: variantId }
    });

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

    if (adjustmentCount > 0) {
      return NextResponse.json(
        { error: 'Tidak dapat menghapus varian yang sudah memiliki riwayat adjustment' },
        { status: 400 }
      );
    }

    // If no related records, delete the variant
    await prisma.productVariant.delete({
      where: { id: variantId },
    });

    return NextResponse.json({ message: 'Varian berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting variant:', error);
    return NextResponse.json(
      { error: 'Gagal menghapus varian' },
      { status: 500 }
    );
  }
}
