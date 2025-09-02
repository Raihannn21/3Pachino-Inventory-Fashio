import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: true,
        brand: true,
        variants: {
          include: {
            size: true,
            color: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      sku,
      categoryId,
      costPrice,
      sellingPrice,
    } = body;

    // Check if SKU already exists
    const existingProduct = await prisma.product.findUnique({
      where: { sku },
    });

    if (existingProduct) {
      return NextResponse.json(
        { error: 'SKU already exists' },
        { status: 400 }
      );
    }

    // Get or create 3Pachino brand
    let brand = await prisma.brand.findFirst({
      where: { name: '3Pachino' },
    });

    if (!brand) {
      brand = await prisma.brand.create({
        data: { name: '3Pachino' },
      });
    }

    const product = await prisma.product.create({
      data: {
        name,
        sku,
        categoryId,
        brandId: brand.id,
        costPrice: parseFloat(costPrice.toString()),
        sellingPrice: parseFloat(sellingPrice.toString()),
      },
      include: {
        category: true,
        brand: true,
        variants: {
          include: {
            size: true,
            color: true,
          },
        },
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}
