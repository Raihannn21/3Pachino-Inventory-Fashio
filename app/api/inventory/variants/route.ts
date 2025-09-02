import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lowStockOnly = searchParams.get('lowStock') === 'true';

    let whereCondition = {};
    
    if (lowStockOnly) {
      // Filter hanya yang stoknya <= minStock
      whereCondition = {
        OR: [
          { stock: { lte: prisma.productVariant.fields.minStock } },
          { stock: 0 }
        ]
      };
    }

    const variants = await prisma.productVariant.findMany({
      where: whereCondition,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            category: true,
            brand: true
          }
        },
        size: {
          select: {
            name: true
          }
        },
        color: {
          select: {
            name: true,
            hexCode: true
          }
        }
      },
      orderBy: [
        { product: { name: 'asc' } },
        { size: { sortOrder: 'asc' } },
        { color: { name: 'asc' } }
      ]
    });

    // Tambahkan informasi status stok
    const variantsWithStatus = variants.map(variant => ({
      ...variant,
      stockStatus: variant.stock === 0 ? 'out_of_stock' :
                   variant.stock <= variant.minStock ? 'low_stock' : 'normal'
    }));

    return NextResponse.json({
      variants: variantsWithStatus,
      total: variants.length,
      lowStockCount: variants.filter(v => v.stock <= v.minStock).length,
      outOfStockCount: variants.filter(v => v.stock === 0).length
    });

  } catch (error) {
    console.error('Error fetching variants:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data varian' },
      { status: 500 }
    );
  }
}
