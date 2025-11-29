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

    // Update status ke COMPLETED dan tambah stock
    const updatedPurchase = await prisma.$transaction(async (tx) => {
      // 1. Get items dari purchase order
      const purchaseWithItems = await tx.transaction.findUnique({
        where: { id },
        include: {
          items: true
        }
      });

      if (!purchaseWithItems) {
        throw new Error('Purchase order tidak ditemukan');
      }

      // 2. Update stock untuk setiap item
      for (const item of purchaseWithItems.items) {
        if (item.variantId) {
          console.log(`Adding stock for variant ${item.variantId}, quantity: ${item.quantity}`);
          
          // Update stok variant (produksi menambah stok)
          const updatedVariant = await tx.productVariant.update({
            where: { id: item.variantId },
            data: {
              stock: {
                increment: item.quantity
              }
            }
          });
          
          console.log(`Stock updated. New stock: ${updatedVariant.stock}`);

          // Buat stock movement
          await tx.stockMovement.create({
            data: {
              variantId: item.variantId,
              type: 'IN',
              quantity: item.quantity,
              reason: 'PRODUCTION',
              reference: purchaseWithItems.invoiceNumber,
              createdBy: "cm3jcpr1s0000140hwjjcchcj" // TODO: Ambil dari session
            }
          });
        }
      }

      // 3. Update status ke COMPLETED
      const updated = await tx.transaction.update({
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

      return updated;
    });

    return NextResponse.json({
      message: 'Production order berhasil diselesaikan dan stok telah ditambahkan',
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
