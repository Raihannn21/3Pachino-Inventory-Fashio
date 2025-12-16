import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity-logger';

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

    // Log activity
    const session = await getServerSession(authOptions);
    if (session?.user) {
      await logActivity({
        userId: session.user.id,
        action: 'UPDATE',
        resource: 'products',
        resourceId: product.id,
        metadata: { productName: product.name, changes: updateData }
      }, request);
    }

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

    console.log('Attempting to delete product:', id);

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        variants: true
      }
    });

    if (!product) {
      console.log('Product not found:', id);
      return NextResponse.json(
        { error: 'Produk tidak ditemukan' },
        { status: 404 }
      );
    }

    console.log('Product found:', { id: product.id, name: product.name, variantCount: product.variants.length });

    // Check if any variant has transactions
    const transactionCount = await prisma.transactionItem.count({
      where: { 
        variant: {
          productId: id
        }
      }
    });

    console.log('Transaction count:', transactionCount);

    if (transactionCount > 0) {
      return NextResponse.json(
        { error: 'Tidak dapat menghapus produk yang sudah memiliki riwayat transaksi' },
        { status: 400 }
      );
    }

    // Check if any variant has stock adjustments
    const adjustmentCount = await prisma.stockAdjustment.count({
      where: { 
        variant: {
          productId: id
        }
      }
    });

    console.log('Stock adjustment count:', adjustmentCount);

    if (adjustmentCount > 0) {
      return NextResponse.json(
        { error: 'Tidak dapat menghapus produk yang sudah memiliki riwayat adjustment stok' },
        { status: 400 }
      );
    }

    // Clean up stock movements for all variants
    const stockMovementCount = await prisma.stockMovement.count({
      where: { 
        variant: {
          productId: id
        }
      }
    });

    console.log('Stock movement count:', stockMovementCount);

    if (stockMovementCount > 0) {
      console.log('Cleaning up stock movements before deletion...');
      await prisma.stockMovement.deleteMany({
        where: { 
          variant: {
            productId: id
          }
        }
      });
      console.log(`Deleted ${stockMovementCount} stock movements`);
    }

    console.log('All checks passed, deleting product and its variants...');

    // Delete all variants first (cascade should handle this, but being explicit)
    await prisma.productVariant.deleteMany({
      where: { productId: id }
    });

    // Delete the product
    await prisma.product.delete({
      where: { id },
    });

    console.log('Product deleted successfully');

    // Log activity
    const session = await getServerSession(authOptions);
    if (session?.user) {
      await logActivity({
        userId: session.user.id,
        action: 'DELETE',
        resource: 'products',
        resourceId: id,
        metadata: { productName: product.name, sku: product.sku }
      }, request);
    }

    return NextResponse.json({ message: 'Produk berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Gagal menghapus produk', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
