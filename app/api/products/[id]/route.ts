import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        brand: true ,
        variants: {
          include: {
            size: true,
            color: true,
          },
          orderBy: [
            { size: { sortOrder: 'asc' } },
            { color: { name: 'asc' } }
          ]
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      name,
      sku,
      description,
      season,
      gender,
      categoryId,
      brandId,
      costPrice,
      sellingPrice,
    } = body;

    // Get current product data
    const currentProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!currentProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Check if SKU already exists (exclude current product) - only if SKU is being updated
    if (sku && sku !== currentProduct.sku) {
      const existingProduct = await prisma.product.findFirst({
        where: { 
          sku,
          NOT: { id }
        },
      });

      if (existingProduct) {
        return NextResponse.json(
          { error: 'SKU already exists' },
          { status: 400 }
        );
      }
    }

    // Build update data object with only provided fields
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (sku !== undefined) updateData.sku = sku;
    if (description !== undefined) updateData.description = description;
    if (season !== undefined && season !== null && season !== '') updateData.season = season;
    if (gender !== undefined && gender !== null && gender !== '') updateData.gender = gender;
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (brandId !== undefined) updateData.brandId = brandId;
    if (costPrice !== undefined) updateData.costPrice = parseFloat(costPrice);
    if (sellingPrice !== undefined) updateData.sellingPrice = parseFloat(sellingPrice);

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}
