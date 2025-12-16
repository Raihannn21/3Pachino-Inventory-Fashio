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
    const transactionId = id;

    const transaction = await prisma.transaction.findUnique({
      where: { 
        id: transactionId,
        type: 'SALE'
      },
      include: {
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
            },
            product: {
              include: {
                category: true,
                brand: true
              }
            }
          }
        },
        supplier: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaksi tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json(transaction);

  } catch (error) {
    console.error('Error fetching transaction detail:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil detail transaksi' },
      { status: 500 }
    );
  }
}

// DELETE - Hapus transaksi dan rollback inventory + profit
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const transactionId = id;

    // Ambil detail transaksi dengan items
    const transaction = await prisma.transaction.findUnique({
      where: { 
        id: transactionId,
        type: 'SALE'
      },
      include: {
        items: {
          include: {
            variant: true,
            product: true
          }
        }
      }
    });

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaksi tidak ditemukan' },
        { status: 404 }
      );
    }

    // Gunakan transaction database untuk memastikan atomicity
    await prisma.$transaction(async (tx) => {
      // 1. Kembalikan stock untuk setiap item
      for (const item of transaction.items) {
        if (item.variantId) {
          // Update stock variant
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: {
              stock: {
                increment: item.quantity
              }
            }
          });

          // Buat record stock movement untuk rollback
          await tx.stockMovement.create({
            data: {
              variantId: item.variantId,
              type: 'IN',
              quantity: item.quantity,
              reason: `Rollback dari penghapusan transaksi ${transaction.invoiceNumber}`
            }
          });
        }
      }

      // 2. Hapus semua items transaksi
      await tx.transactionItem.deleteMany({
        where: { transactionId: transaction.id }
      });

      // 3. Hapus stock movements yang terkait dengan transaksi ini (jika ada relasi)
      // Karena tidak ada field transactionId di StockMovement, kita skip bagian ini
      // Stock movements akan tetap ada sebagai record history

      // 4. Hapus transaksi
      await tx.transaction.delete({
        where: { id: transaction.id }
      });
    });

    // Log activity
    const session = await getServerSession(authOptions);
    if (session?.user) {
      await logActivity({
        userId: session.user.id,
        action: 'DELETE',
        resource: 'sales',
        resourceId: transaction.id,
        metadata: { 
          invoiceNumber: transaction.invoiceNumber,
          totalAmount: transaction.totalAmount,
          itemCount: transaction.items.length
        }
      }, request);
    }

    return NextResponse.json({
      message: 'Transaksi berhasil dihapus dan inventory telah dikembalikan',
      deletedTransaction: {
        id: transaction.id,
        invoiceNumber: transaction.invoiceNumber,
        totalAmount: transaction.totalAmount,
        itemCount: transaction.items.length
      }
    });

  } catch (error) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json(
      { error: 'Gagal menghapus transaksi' },
      { status: 500 }
    );
  }
}
