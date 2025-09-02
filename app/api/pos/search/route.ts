import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Cari produk untuk POS
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const barcode = searchParams.get('barcode');

    // Jika ada barcode, cari berdasarkan barcode
    if (barcode) {
      const variant = await prisma.productVariant.findUnique({
        where: { barcode },
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
      });

      if (!variant) {
        return NextResponse.json(
          { error: 'Produk dengan barcode tersebut tidak ditemukan' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        variants: [variant]
      });
    }

    // Pencarian berdasarkan nama produk, SKU, atau barcode
    const variants = await prisma.productVariant.findMany({
      where: {
        AND: [
          { isActive: true },
          { product: { isActive: true } },
          {
            OR: [
              {
                product: {
                  name: {
                    contains: search,
                    mode: 'insensitive'
                  }
                }
              },
              {
                product: {
                  sku: {
                    contains: search,
                    mode: 'insensitive'
                  }
                }
              },
              {
                barcode: {
                  contains: search,
                  mode: 'insensitive'
                }
              }
            ]
          }
        ]
      },
      include: {
        product: {
          include: {
            category: true,
            brand: true
          }
        },
        size: true,
        color: true
      },
      orderBy: [
        { product: { name: 'asc' } },
        { size: { sortOrder: 'asc' } },
        { color: { name: 'asc' } }
      ],
      take: search ? 50 : 100 // Show more products when not searching
    });

    return NextResponse.json({
      variants
    });

  } catch (error) {
    console.error('Error searching products:', error);
    return NextResponse.json(
      { error: 'Gagal mencari produk' },
      { status: 500 }
    );
  }
}
