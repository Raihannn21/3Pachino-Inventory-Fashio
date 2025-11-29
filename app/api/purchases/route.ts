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

    // Calculate total items across all purchases (not just current page)
    const allPurchases = await prisma.transaction.findMany({
      where,
      include: {
        items: {
          select: {
            quantity: true
          }
        }
      }
    });

    const totalItems = allPurchases.reduce((sum, p) => 
      sum + p.items.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0), 
    0);

    // Calculate total amount across all purchases
    const totalAmount = allPurchases.reduce((sum, p) => sum + Number(p.totalAmount || 0), 0);

    // Count pending orders
    const pendingCount = allPurchases.filter(p => p.status === 'PENDING').length;

    return NextResponse.json({
      purchases,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      stats: {
        totalItems,
        totalAmount,
        pendingCount
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

    // Buat production order (stock belum ditambah, menunggu status COMPLETED)
    const result = await prisma.transaction.create({
      data: {
        type: 'PURCHASE', // Gunakan PURCHASE type untuk production orders
        invoiceNumber,
        totalAmount: total,
        notes: `Production Order: ${notes || 'Produksi barang jadi'}`,
        status: 'PENDING', // Status PENDING, stock belum bertambah
        userId: defaultUser.id,
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

    return NextResponse.json({
      message: 'Production Order berhasil dibuat. Klik "Complete" untuk menambah stok.',
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
