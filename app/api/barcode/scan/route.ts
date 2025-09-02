import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const barcode = searchParams.get('barcode');

    if (!barcode) {
      return NextResponse.json(
        { error: 'Barcode parameter is required' },
        { status: 400 }
      );
    }

    // Find variant by barcode
    const variant = await prisma.productVariant.findUnique({
      where: { barcode },
      include: {
        product: {
          include: {
            category: true,
            brand: true,
          },
        },
        size: true,
        color: true,
      },
    });

    if (!variant) {
      return NextResponse.json(
        { error: 'Product variant not found' },
        { status: 404 }
      );
    }

    // Return product information
    return NextResponse.json({
      id: variant.id,
      barcode: variant.barcode,
      stock: variant.stock,
      minStock: variant.minStock,
      size: variant.size,
      color: variant.color,
      product: {
        id: variant.product.id,
        name: variant.product.name,
        sku: variant.product.sku,
        costPrice: variant.product.costPrice,
        sellingPrice: variant.product.sellingPrice,
        category: variant.product.category,
        brand: variant.product.brand,
      },
    });
  } catch (error) {
    console.error('Error scanning barcode:', error);
    return NextResponse.json(
      { error: 'Failed to scan barcode' },
      { status: 500 }
    );
  }
}
