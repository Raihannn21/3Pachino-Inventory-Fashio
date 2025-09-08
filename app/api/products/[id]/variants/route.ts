import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateBarcode } from '@/lib/barcode';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { sizeId, colorId, stock, minStock, sellingPrice } = body;

    // Check if variant already exists
    const existingVariant = await prisma.productVariant.findFirst({
      where: {
        productId: id,
        sizeId,
        colorId,
      },
    });

    if (existingVariant) {
      return NextResponse.json(
        { error: 'Variant with this size and color already exists' },
        { status: 400 }
      );
    }

    // Get product, size, and color data for barcode generation
    const product = await prisma.product.findUnique({
      where: { id },
      select: { sku: true },
    });

    const size = await prisma.size.findUnique({
      where: { id: sizeId },
      select: { name: true },
    });

    const color = await prisma.color.findUnique({
      where: { id: colorId },
      select: { name: true },
    });

    if (!product || !size || !color) {
      return NextResponse.json(
        { error: 'Product, size, or color not found' },
        { status: 404 }
      );
    }

    // Generate barcode otomatis
    let barcode;
    let attempts = 0;
    do {
      barcode = generateBarcode(product.sku, size.name, color.name);
      const existingBarcode = await prisma.productVariant.findUnique({
        where: { barcode },
      });
      if (!existingBarcode) break;
      attempts++;
    } while (attempts < 10); // Max 10 attempts to avoid infinite loop

    if (attempts >= 10) {
      return NextResponse.json(
        { error: 'Unable to generate unique barcode' },
        { status: 500 }
      );
    }

    // Prepare variant data
    const variantData: any = {
      productId: id,
      sizeId,
      colorId,
      stock: parseInt(stock),
      minStock: parseInt(minStock),
      barcode: barcode,
    };

    // TODO: Add selling price when Prisma client is regenerated
    // if (sellingPrice !== undefined && sellingPrice !== null) {
    //   variantData.sellingPrice = parseFloat(sellingPrice);
    // }

    const variant = await prisma.productVariant.create({
      data: variantData,
      include: {
        size: true,
        color: true,
        product: {
          select: {
            name: true,
            sku: true,
          },
        },
      },
    });

    // Create stock movement record
    await prisma.stockMovement.create({
      data: {
        variantId: variant.id,
        type: 'IN',
        quantity: parseInt(stock),
        reason: 'Initial stock',
        reference: 'INITIAL',
      },
    });

    return NextResponse.json(variant, { status: 201 });
  } catch (error) {
    console.error('Error creating variant:', error);
    return NextResponse.json(
      { error: 'Failed to create variant' },
      { status: 500 }
    );
  }
}
