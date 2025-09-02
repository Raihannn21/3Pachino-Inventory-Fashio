import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { variantId, newStock, reason, userId } = await request.json();

    // Validasi input
    if (!variantId || typeof newStock !== 'number' || newStock < 0) {
      return NextResponse.json(
        { error: 'Data tidak valid' },
        { status: 400 }
      );
    }

    if (!reason || reason.trim() === '') {
      return NextResponse.json(
        { error: 'Alasan penyesuaian stok harus diisi' },
        { status: 400 }
      );
    }

    // Get current variant
    const currentVariant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: true,
        size: true,
        color: true
      }
    });

    if (!currentVariant) {
      return NextResponse.json(
        { error: 'Varian produk tidak ditemukan' },
        { status: 404 }
      );
    }

    const stockDifference = newStock - currentVariant.stock;

    if (stockDifference === 0) {
      return NextResponse.json(
        { error: 'Stok baru sama dengan stok saat ini' },
        { status: 400 }
      );
    }

    // Use transaction untuk memastikan data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Update stock
      const updatedVariant = await tx.productVariant.update({
        where: { id: variantId },
        data: { stock: newStock },
        include: {
          product: true,
          size: true,
          color: true
        }
      });

      // Create stock movement record
      await tx.stockMovement.create({
        data: {
          variantId: variantId,
          type: stockDifference > 0 ? 'IN' : 'OUT',
          quantity: Math.abs(stockDifference),
          reason: reason.trim(),
          reference: 'MANUAL_ADJUSTMENT',
          createdBy: userId || 'SYSTEM',
        },
      });

      return updatedVariant;
    });

    return NextResponse.json({
      message: 'Stok berhasil disesuaikan',
      variant: result,
      adjustment: {
        previousStock: currentVariant.stock,
        newStock: newStock,
        difference: stockDifference,
        reason: reason.trim()
      }
    });

  } catch (error) {
    console.error('Error adjusting stock:', error);
    return NextResponse.json(
      { error: 'Gagal menyesuaikan stok' },
      { status: 500 }
    );
  }
}
