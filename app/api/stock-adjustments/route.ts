import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Get all stock adjustments with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const variantId = searchParams.get('variantId');
    const reason = searchParams.get('reason');
    const type = searchParams.get('type');

    const skip = (page - 1) * limit;

    // Build filter conditions
    const where: any = {};

    if (variantId) {
      where.variantId = variantId;
    }

    if (reason) {
      where.reason = reason;
    }

    if (type) {
      where.adjustmentType = type;
    }

    const [adjustments, total] = await Promise.all([
      prisma.stockAdjustment.findMany({
        where,
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
      prisma.stockAdjustment.count({ where })
    ]);

    return NextResponse.json({
      adjustments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching stock adjustments:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data stock adjustment' },
      { status: 500 }
    );
  }
}

// POST - Create new stock adjustment with enhanced audit trail
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      variantId,
      adjustmentType, // 'INCREASE' or 'DECREASE'
      quantity,
      previousStock,
      newStock,
      reason,
      notes
    } = body;

    // Validasi input
    if (!variantId || !adjustmentType || !reason || !quantity) {
      return NextResponse.json(
        { error: 'Field yang diperlukan: variantId, adjustmentType, reason, quantity' },
        { status: 400 }
      );
    }

    // Ambil data variant saat ini
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: true,
        size: true,
        color: true
      }
    });

    if (!variant) {
      return NextResponse.json(
        { error: 'Product variant tidak ditemukan' },
        { status: 404 }
      );
    }

    const stockBefore = variant.stock;
    const stockAfter = parseInt(newStock);
    const adjustmentQuantity = stockAfter - stockBefore;

    // Validasi stock tidak boleh negatif
    if (stockAfter < 0) {
      return NextResponse.json(
        { error: `Stock tidak boleh negatif. Stock akan menjadi: ${stockAfter}` },
        { status: 400 }
      );
    }

    // Mulai transaction
    const result = await prisma.$transaction(async (tx) => {
      // 0. Cek atau buat user system jika belum ada
      let systemUser = await tx.user.findFirst({
        where: { email: 'system@3pachino.com' }
      });

      if (!systemUser) {
        systemUser = await tx.user.create({
          data: {
            email: 'system@3pachino.com',
            name: 'System User',
            password: 'system123',
            role: 'OWNER'
          }
        });
      }

      // 1. Buat record stock adjustment
      const adjustment = await tx.stockAdjustment.create({
        data: {
          variantId,
          adjustmentType: adjustmentType as 'INCREASE' | 'DECREASE',
          reason: reason as any, // Cast to enum type
          quantity: Math.abs(adjustmentQuantity),
          stockBefore,
          stockAfter,
          notes: notes || '',
          reference: '',
          createdBy: systemUser.id
        }
      });

      // 2. Update stock variant
      await tx.productVariant.update({
        where: { id: variantId },
        data: { stock: stockAfter }
      });

      // 3. Jika alasan adalah PRODUCTION, buat record produksi otomatis
      if (reason === 'PRODUCTION' && adjustmentType === 'INCREASE') {
        console.log('Creating auto production record...');
        const costPrice = Number(variant.product.costPrice) || 0;
        const totalCost = costPrice * Math.abs(adjustmentQuantity);
        
        // Generate invoice number untuk produksi
        const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
        const invoiceNumber = `PROD-${timestamp}`;

        const productionRecord = await tx.transaction.create({
          data: {
            invoiceNumber,
            type: 'PURCHASE', // Menggunakan PURCHASE untuk produksi
            totalAmount: totalCost,
            notes: `Auto-generated dari stock adjustment produksi${notes ? ` - ${notes}` : ''}`,
            userId: systemUser.id,
            items: {
              create: {
                productId: variant.productId,
                variantId,
                quantity: Math.abs(adjustmentQuantity),
                unitPrice: costPrice,
                totalPrice: totalCost
              }
            }
          }
        });
        
        console.log('Production record created:', productionRecord.id);
      }

      return adjustment;
    });

    const message = reason === 'PRODUCTION' && adjustmentType === 'INCREASE' ? 
      'Stock adjustment berhasil dan record produksi telah dibuat secara otomatis! Cek di menu Produksi.' : 
      'Stock adjustment berhasil';

    return NextResponse.json({ 
      success: true, 
      adjustment: result,
      message
    });

  } catch (error) {
    console.error('Error creating stock adjustment:', error);
    return NextResponse.json(
      { error: 'Gagal membuat stock adjustment' },
      { status: 500 }
    );
  }
}
