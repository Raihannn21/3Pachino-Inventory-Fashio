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
      // 1. Buat record stock adjustment
      const adjustment = await tx.stockAdjustment.create({
        data: {
          variantId,
          adjustmentType,
          reason,
          quantity: Math.abs(adjustmentQuantity),
          stockBefore,
          stockAfter,
          notes: notes || '',
          reference: '',
          createdBy: 'system-user' // TODO: Get from auth session
        }
      });

      // 2. Update stock variant
      await tx.productVariant.update({
        where: { id: variantId },
        data: { stock: stockAfter }
      });

      return adjustment;
    });

    const message = reason === 'PRODUCTION' && adjustmentType === 'INCREASE' ? 
      'Stock adjustment berhasil! Untuk produksi, mohon buat record produksi manual di menu Produksi.' : 
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
