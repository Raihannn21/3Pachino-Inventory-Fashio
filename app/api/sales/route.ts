import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity-logger';

// GET - Ambil semua transaksi penjualan
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const skip = (page - 1) * limit;

    // Build filter conditions
    const where: any = {
      type: 'SALE'
    };

    if (startDate && endDate) {
      where.transactionDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const [sales, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          supplier: true, // Include customer/supplier info
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
      sales,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching sales:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data penjualan' },
      { status: 500 }
    );
  }
}

// POST - Buat transaksi penjualan baru
export async function POST(request: NextRequest) {
  try {
    // Get current session
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Silakan login terlebih dahulu' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      customerId, // Add customer ID
      customerName, 
      customerPhone, 
      items, 
      notes,
      discount = 0,
      tax = 0
    } = body;

    // Validasi input
    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'Items tidak boleh kosong' },
        { status: 400 }
      );
    }

    // Get current user from database
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email! }
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User tidak ditemukan' },
        { status: 404 }
      );
    }

    // Validasi input
    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'Items tidak boleh kosong' },
        { status: 400 }
      );
    }

    // Hitung total
    let subtotal = 0;
    const transactionItems: Array<{
      productId: string;
      variantId?: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }> = [];

    // Validasi stok dan hitung total
    for (const item of items) {
      // Determine which variant to check/deduct stock from
      // If item has substituteFromVariantId, validate/deduct from that instead
      const variantIdToCheck = item.substituteFromVariantId || item.variantId;
      
      const variant = await prisma.productVariant.findUnique({
        where: { id: variantIdToCheck },
        include: { product: true }
      });

      if (!variant) {
        return NextResponse.json(
          { error: `Varian produk dengan ID ${variantIdToCheck} tidak ditemukan` },
          { status: 400 }
        );
      }

      if (variant.stock < item.quantity) {
        return NextResponse.json(
          { error: `Stok tidak mencukupi untuk ${variant.product.name}. Stok tersisa: ${variant.stock}` },
          { status: 400 }
        );
      }

      // PRIORITAS: 1) custom price dari frontend (nego), 2) variant.sellingPrice, 3) product.sellingPrice
      const price = item.price ?? variant.sellingPrice ?? Number(variant.product.sellingPrice);
      const itemTotal = price * item.quantity;
      subtotal += itemTotal;

      transactionItems.push({
        productId: variant.productId,
        variantId: item.variantId, // Keep original requested variant for customer receipt
        quantity: item.quantity,
        unitPrice: price,
        totalPrice: itemTotal
      });
    }

    // Discount sekarang dalam bentuk nominal (Rp), bukan persen
    const discountAmount = discount; // discount sudah dalam bentuk rupiah
    const taxAmount = ((subtotal - discountAmount) * tax) / 100;
    const total = subtotal - discountAmount + taxAmount;

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now()}`;

    // Buat transaksi dengan Prisma transaction
    const result = await prisma.$transaction(async (tx) => {
      // Handle customer - buat customer baru jika diperlukan
      let finalCustomerId = customerId;
      
      if (!customerId && customerName) {
        // Cek apakah customer sudah ada berdasarkan nama atau phone
        let existingCustomer = null;
        if (customerPhone) {
          existingCustomer = await tx.supplier.findFirst({
            where: { phone: customerPhone }
          });
        }
        
        if (!existingCustomer) {
          // Buat customer baru
          const newCustomer = await tx.supplier.create({
            data: {
              name: customerName,
              phone: customerPhone,
              contact: customerPhone
            }
          });
          finalCustomerId = newCustomer.id;
        } else {
          finalCustomerId = existingCustomer.id;
        }
      }

      // 1. Buat transaksi
      const transactionData: any = {
        type: 'SALE',
        invoiceNumber,
        totalAmount: total,
        notes: notes || undefined,
        userId: currentUser.id,
        items: {
          create: transactionItems
        }
      };

      // Hanya set supplierId jika ada customer
      if (finalCustomerId) {
        transactionData.supplierId = finalCustomerId;
      }

      const transaction = await tx.transaction.create({
        data: transactionData,
        include: {
          supplier: true, // Include customer info
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

      // 2. Update stok dan buat stock movement
      for (const item of items) {
        // Use substitute variant for stock deduction if present
        const variantIdToDeduct = item.substituteFromVariantId || item.variantId;
        
        // Update stok variant
        await tx.productVariant.update({
          where: { id: variantIdToDeduct },
          data: {
            stock: {
              decrement: item.quantity
            }
          }
        });

        // Buat stock movement - record actual variant that was sold
        await tx.stockMovement.create({
          data: {
            variantId: variantIdToDeduct,
            type: 'OUT',
            quantity: item.quantity,
            reason: 'SALE',
            reference: transaction.invoiceNumber,
            createdBy: "cm3jcpr1s0000140hwjjcchcj" // TODO: Ambil dari session
          }
        });
      }

      return transaction;
    });

    // Log activity
    await logActivity({
      userId: currentUser.id,
      action: 'CREATE',
      resource: 'sales',
      resourceId: result.id,
      metadata: { 
        invoiceNumber: result.invoiceNumber,
        totalAmount: result.totalAmount,
        itemCount: items.length
      }
    }, request);

    return NextResponse.json({
      message: 'Transaksi penjualan berhasil dibuat',
      transaction: result
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating sale:', error);
    return NextResponse.json(
      { error: 'Gagal membuat transaksi penjualan' },
      { status: 500 }
    );
  }
}
