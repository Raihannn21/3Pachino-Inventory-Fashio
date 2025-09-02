import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Ambil data inventory dengan analytics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const alertsOnly = searchParams.get('alertsOnly') === 'true';
    const category = searchParams.get('category');
    const brand = searchParams.get('brand');
    
    // Base query untuk variants dengan stock
    let whereClause: any = {};
    
    if (category || brand) {
      whereClause.product = {};
      if (category) whereClause.product.categoryId = category;
      if (brand) whereClause.product.brandId = brand;
    }

    // Ambil semua variants dengan stock dan product details
    const variants = await prisma.productVariant.findMany({
      where: whereClause,
      include: {
        product: {
          include: {
            category: true,
            brand: true
          }
        },
        size: true,
        color: true,
        stockMovements: {
          orderBy: { createdAt: 'desc' },
          take: 1 // Get latest stock movement
        }
      }
    });

    // Hitung stock analytics untuk setiap variant
    const inventoryData = variants.map(variant => {
      const currentStock = variant.stock;
      const reservedStock = 0; // Placeholder for reserved stock logic
      const availableStock = currentStock - reservedStock;
      const minStock = variant.minStock;
      const maxStock = Math.max(minStock * 3, 50); // Dynamic max stock calculation
      
      // Hitung status stock
      let stockStatus: 'CRITICAL' | 'LOW' | 'NORMAL' | 'OVERSTOCK' = 'NORMAL';
      if (availableStock <= 0) {
        stockStatus = 'CRITICAL';
      } else if (availableStock <= minStock) {
        stockStatus = 'LOW';
      } else if (availableStock >= maxStock) {
        stockStatus = 'OVERSTOCK';
      }

      // Hitung days of stock (estimasi berapa hari stock akan habis)
      // Berdasarkan rata-rata penjualan harian
      const avgDailySales = 2; // Placeholder, nanti akan dihitung dari data transaksi
      const daysOfStock = availableStock > 0 ? Math.floor(availableStock / avgDailySales) : 0;
      
      // Hitung inventory value
      const inventoryValue = currentStock * Number(variant.product.sellingPrice);
      
      return {
        id: variant.id,
        product: variant.product,
        size: variant.size,
        color: variant.color,
        barcode: variant.barcode,
        currentStock,
        reservedStock,
        availableStock,
        minStock,
        maxStock,
        stockStatus,
        daysOfStock,
        inventoryValue,
        lastUpdated: variant.updatedAt,
        lastMovement: variant.stockMovements[0] || null,
        // Reorder suggestion
        suggestedReorder: stockStatus === 'LOW' || stockStatus === 'CRITICAL' ? 
          Math.max(maxStock - currentStock, minStock * 2) : 0
      };
    });

    // Filter untuk alerts only jika diminta
    const filteredData = alertsOnly 
      ? inventoryData.filter(item => 
          item.stockStatus === 'CRITICAL' || 
          item.stockStatus === 'LOW' || 
          item.stockStatus === 'OVERSTOCK'
        )
      : inventoryData;

    // Hitung summary statistics
    const summary = {
      totalProducts: inventoryData.length,
      totalValue: inventoryData.reduce((sum, item) => sum + item.inventoryValue, 0),
      criticalStock: inventoryData.filter(item => item.stockStatus === 'CRITICAL').length,
      lowStock: inventoryData.filter(item => item.stockStatus === 'LOW').length,
      normalStock: inventoryData.filter(item => item.stockStatus === 'NORMAL').length,
      overStock: inventoryData.filter(item => item.stockStatus === 'OVERSTOCK').length,
      avgDaysOfStock: inventoryData.length > 0 
        ? inventoryData.reduce((sum, item) => sum + item.daysOfStock, 0) / inventoryData.length 
        : 0,
      totalReorderSuggestions: inventoryData.filter(item => item.suggestedReorder > 0).length
    };

    // Ambil categories dan brands untuk filter
    const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
    const brands = await prisma.brand.findMany({ orderBy: { name: 'asc' } });

    return NextResponse.json({
      inventory: filteredData.sort((a, b) => {
        // Sort by stock status priority: CRITICAL -> LOW -> OVERSTOCK -> NORMAL
        const statusPriority = { CRITICAL: 4, LOW: 3, OVERSTOCK: 2, NORMAL: 1 };
        return statusPriority[b.stockStatus] - statusPriority[a.stockStatus];
      }),
      summary,
      filters: {
        categories,
        brands
      }
    });

  } catch (error) {
    console.error('Error fetching inventory data:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data inventory' },
      { status: 500 }
    );
  }
}

// POST - Update stock levels
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { variantId, adjustment, type, reason, reference } = body;

    if (!variantId || adjustment === undefined) {
      return NextResponse.json(
        { error: 'Variant ID dan adjustment wajib diisi' },
        { status: 400 }
      );
    }

    // Ambil current variant dengan stock
    const currentVariant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { product: true }
    });

    if (!currentVariant) {
      return NextResponse.json(
        { error: 'Variant tidak ditemukan' },
        { status: 404 }
      );
    }

    const newQuantity = Math.max(0, currentVariant.stock + adjustment);
    
    // Update stock pada variant
    const updatedVariant = await prisma.productVariant.update({
      where: { id: variantId },
      data: {
        stock: newQuantity,
        updatedAt: new Date()
      }
    });

    // Create stock movement record
    const stockMovement = await prisma.stockMovement.create({
      data: {
        variantId,
        type: type as any, // 'IN', 'OUT', 'ADJUSTMENT'
        quantity: Math.abs(adjustment),
        reason: reason || 'Manual adjustment',
        reference: reference || null,
        createdBy: 'system', // TODO: Get from auth session
      }
    });

    return NextResponse.json({
      message: 'Stock berhasil diupdate',
      variant: updatedVariant,
      movement: {
        id: stockMovement.id,
        type,
        adjustment,
        previousStock: currentVariant.stock,
        newStock: newQuantity
      }
    });

  } catch (error) {
    console.error('Error updating stock:', error);
    return NextResponse.json(
      { error: 'Gagal mengupdate stock' },
      { status: 500 }
    );
  }
}
