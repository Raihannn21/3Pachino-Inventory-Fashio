import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Ambil reorder suggestions
export async function GET(request: NextRequest) {
  try {
    // Ambil semua variants yang perlu di-reorder
    const variants = await prisma.productVariant.findMany({
      where: {
        OR: [
          { stock: { lte: prisma.productVariant.fields.minStock } }, // Stock <= minStock
          { stock: 0 } // Out of stock
        ],
        isActive: true
      },
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
          where: {
            type: 'OUT'
          },
          orderBy: { createdAt: 'desc' },
          take: 10 // Last 10 outbound movements untuk trend analysis
        }
      }
    });

    // Hitung sales velocity dan reorder suggestions
    const reorderSuggestions = variants.map(variant => {
      const currentStock = variant.stock;
      const minStock = variant.minStock;
      const maxStock = Math.max(minStock * 3, 50); // Dynamic max stock
      
      // Hitung average daily sales dari stock movements
      const recentMovements = variant.stockMovements.slice(0, 10);
      const totalSold = recentMovements.reduce((sum, movement) => sum + movement.quantity, 0);
      const daysSpan = recentMovements.length > 0 ? 30 : 1; // Assume 30 days span
      const avgDailySales = totalSold / daysSpan;
      
      // Lead time estimation (days to restock)
      const leadTime = 7; // Default 1 week lead time
      
      // Safety stock calculation
      const safetyStock = Math.max(avgDailySales * leadTime, minStock);
      
      // Suggested order quantity
      const suggestedQuantity = Math.max(
        maxStock - currentStock, // Fill to max
        safetyStock + (avgDailySales * leadTime) - currentStock // Safety + lead time demand
      );

      // Priority calculation
      let priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
      if (currentStock <= 0) {
        priority = 'URGENT';
      } else if (currentStock <= minStock / 2) {
        priority = 'HIGH';
      } else if (currentStock <= minStock) {
        priority = 'MEDIUM';
      }

      // Days until stockout prediction
      const daysUntilStockout = avgDailySales > 0 ? Math.floor(currentStock / avgDailySales) : 999;

      return {
        id: variant.id,
        product: variant.product,
        size: variant.size,
        color: variant.color,
        currentStock,
        minStock,
        maxStock,
        suggestedQuantity: Math.ceil(suggestedQuantity),
        priority,
        avgDailySales: Math.round(avgDailySales * 100) / 100,
        daysUntilStockout,
        leadTime,
        safetyStock: Math.ceil(safetyStock),
        estimatedCost: Math.ceil(suggestedQuantity) * Number(variant.product.costPrice),
        potentialRevenue: Math.ceil(suggestedQuantity) * Number(variant.product.sellingPrice)
      };
    });

    // Sort by priority and days until stockout
    const sortedSuggestions = reorderSuggestions.sort((a, b) => {
      const priorityOrder = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.daysUntilStockout - b.daysUntilStockout;
    });

    // Calculate summary statistics
    const summary = {
      totalItems: sortedSuggestions.length,
      urgentItems: sortedSuggestions.filter(s => s.priority === 'URGENT').length,
      highPriorityItems: sortedSuggestions.filter(s => s.priority === 'HIGH').length,
      totalEstimatedCost: sortedSuggestions.reduce((sum, s) => sum + s.estimatedCost, 0),
      totalPotentialRevenue: sortedSuggestions.reduce((sum, s) => sum + s.potentialRevenue, 0),
      avgDaysUntilStockout: sortedSuggestions.length > 0 
        ? sortedSuggestions.reduce((sum, s) => sum + s.daysUntilStockout, 0) / sortedSuggestions.length 
        : 0
    };

    return NextResponse.json({
      suggestions: sortedSuggestions,
      summary
    });

  } catch (error) {
    console.error('Error generating reorder suggestions:', error);
    return NextResponse.json(
      { error: 'Gagal generate reorder suggestions' },
      { status: 500 }
    );
  }
}

// POST - Create production order from reorder suggestions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { selectedItems, notes } = body;

    if (!selectedItems || selectedItems.length === 0) {
      return NextResponse.json(
        { error: 'Tidak ada item yang dipilih' },
        { status: 400 }
      );
    }

    // Create a new production order (purchase transaction)
    const invoiceNumber = `PO-${Date.now()}`;
    
    const transaction = await prisma.transaction.create({
      data: {
        type: 'PURCHASE',
        invoiceNumber,
        userId: 'system', // TODO: Get from auth session
        totalAmount: selectedItems.reduce((sum: number, item: any) => sum + item.estimatedCost, 0),
        notes: notes || 'Auto-generated from reorder suggestions',
        status: 'PENDING',
        items: {
          create: selectedItems.map((item: any) => ({
            productId: item.product.id,
            variantId: item.id,
            quantity: item.suggestedQuantity,
            unitPrice: item.product.costPrice,
            totalPrice: item.suggestedQuantity * Number(item.product.costPrice)
          }))
        }
      },
      include: {
        items: {
          include: {
            product: true,
            variant: {
              include: {
                size: true,
                color: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json({
      message: 'Production order berhasil dibuat!',
      transaction,
      summary: {
        totalItems: selectedItems.length,
        totalCost: transaction.totalAmount,
        invoiceNumber: transaction.invoiceNumber
      }
    });

  } catch (error) {
    console.error('Error creating production order:', error);
    return NextResponse.json(
      { error: 'Gagal membuat production order' },
      { status: 500 }
    );
  }
}
