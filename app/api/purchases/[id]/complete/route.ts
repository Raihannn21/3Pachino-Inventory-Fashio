import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PATCH - Complete purchase order (change status from PENDING to COMPLETED)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Cek apakah purchase order exists dan masih PENDING
    const purchase = await prisma.transaction.findUnique({
      where: { 
        id,
        type: 'PURCHASE'
      }
    });

    if (!purchase) {
      return NextResponse.json(
        { error: 'Production order tidak ditemukan' },
        { status: 404 }
      );
    }

    if (purchase.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Production order sudah selesai' },
        { status: 400 }
      );
    }

    if (purchase.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Production order sudah dibatalkan' },
        { status: 400 }
      );
    }

    // Update status ke COMPLETED
    const updatedPurchase = await prisma.transaction.update({
      where: { id },
      data: {
        status: 'COMPLETED'
      },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: true,
                size: true,
                color: true
              }
            },
            product: true
          }
        },
        supplier: true,
        user: true
      }
    });

    return NextResponse.json({
      message: 'Production order berhasil diselesaikan',
      purchase: updatedPurchase
    });

  } catch (error) {
    console.error('Error completing purchase:', error);
    return NextResponse.json(
      { error: 'Gagal menyelesaikan production order' },
      { status: 500 }
    );
  }
}
