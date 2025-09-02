import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Ambil semua purchase orders
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');

    const skip = (page - 1) * limit;

    // Build filter conditions
    const where: any = {
      type: 'PURCHASE'
    };

    if (status) {
      where.status = status;
    }

    const [purchases, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          supplier: {
            select: {
              id: true,
              name: true,
              contact: true,
              phone: true
            }
          },
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
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.transaction.count({ where })
    ]);

    return NextResponse.json({
      purchases,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching purchases:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data pembelian' },
      { status: 500 }
    );
  }
}

// POST - Buat production order baru
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      items, 
      notes
    } = body;

    // Validasi input
    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'Items tidak boleh kosong' },
        { status: 400 }
      );
    }

    // Hitung total biaya produksi
    let total = 0;
    const transactionItems: Array<{
      productId: string;
      variantId?: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }> = [];

    // Validasi items dan hitung total
    for (const item of items) {
      if (item.variantId) {
        const variant = await prisma.productVariant.findUnique({
          where: { id: item.variantId },
          include: { product: true }
        });

        if (!variant) {
          return NextResponse.json(
            { error: `Varian produk dengan ID ${item.variantId} tidak ditemukan` },
            { status: 400 }
          );
        }

        const itemTotal = Number(item.unitPrice || variant.product.costPrice) * item.quantity;
        total += itemTotal;

        transactionItems.push({
          productId: variant.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice || variant.product.costPrice),
          totalPrice: itemTotal
        });
      }
    }

    // Generate production number
    const invoiceNumber = `PROD-${Date.now()}`;

    // Pastikan ada user default untuk transaksi
    let defaultUser = await prisma.user.findFirst({
      where: { email: 'admin@kelola-inventory.com' }
    });

    if (!defaultUser) {
      defaultUser = await prisma.user.create({
        data: {
          email: 'admin@kelola-inventory.com',
          name: 'Administrator',
          password: 'hashed_password', // TODO: Hash proper password
          role: 'OWNER'
        }
      });
    }

    // Buat production order dengan Prisma transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Buat production order
      const production = await tx.transaction.create({
        data: {
          type: 'PURCHASE', // Gunakan PURCHASE type untuk production orders
          invoiceNumber,
          totalAmount: total,
          notes: `Production Order: ${notes || 'Produksi barang jadi'}`,
          status: 'PENDING',
          userId: defaultUser.id, // Gunakan user default yang sudah ada
          items: {
            create: transactionItems
          }
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
          }
        }
      });

      // 2. Update stok (menambah karena produksi selesai)
      for (const item of items) {
        console.log(`Updating stock for variant ${item.variantId}, adding ${item.quantity} units`);
        
        // Update stok variant (produksi menambah stok)
        const updatedVariant = await tx.productVariant.update({
          where: { id: item.variantId },
          data: {
            stock: {
              increment: item.quantity
            }
          }
        });
        
        console.log(`Stock updated successfully. New stock: ${updatedVariant.stock}`);

        // Buat stock movement
        await tx.stockMovement.create({
          data: {
            variantId: item.variantId,
            type: 'IN',
            quantity: item.quantity,
            reason: 'PRODUCTION',
            reference: production.invoiceNumber,
            createdBy: "cm3jcpr1s0000140hwjjcchcj" // TODO: Ambil dari session
          }
        });
      }

      return production;
    });

    return NextResponse.json({
      message: 'Production Order berhasil dibuat dan stok telah diupdate',
      production: result
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating production order:', error);
    return NextResponse.json(
      { error: 'Gagal membuat production order' },
      { status: 500 }
    );
  }
}
