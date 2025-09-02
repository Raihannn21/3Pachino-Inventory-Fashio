import { NextRequest, NextResponse } from 'next/server';
import { calculateDaysRemaining, getInventoryStatus, getLowStockVariants, getProductionRecommendations } from '@/lib/inventory-analytics';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const variantId = searchParams.get('variantId');
    const type = searchParams.get('type') || 'all';

    if (variantId) {
      // Get days remaining for specific variant
      const daysRemaining = await calculateDaysRemaining(variantId);
      const status = getInventoryStatus(daysRemaining);
      
      return NextResponse.json({
        variantId,
        daysRemaining,
        status,
      });
    }

    if (type === 'low-stock') {
      // Get all low stock variants
      const threshold = parseInt(searchParams.get('threshold') || '14');
      const lowStockVariants = await getLowStockVariants(threshold);
      
      return NextResponse.json({
        variants: lowStockVariants,
        total: lowStockVariants.length,
      });
    }

    // Default: return full analytics dashboard data
    const lowStockVariants = await getLowStockVariants(14);
    const productionRecommendations = await getProductionRecommendations();
    
    // Get total variants count
    const totalVariants = await prisma.productVariant.count({
      where: { isActive: true }
    });

    const criticalVariants = lowStockVariants.filter(v => v.stock === 0);
    const warningVariants = lowStockVariants.filter(v => v.stock > 0 && v.stock <= v.minStock);

    return NextResponse.json({
      lowStockVariants: lowStockVariants || [],
      productionRecommendations: productionRecommendations || [],
      totalVariants: totalVariants || 0,
      criticalStock: criticalVariants.length || 0,
      warningStock: warningVariants.length || 0,
    });
  } catch (error) {
    console.error('Error in inventory analytics:', error);
    return NextResponse.json({
      lowStockVariants: [],
      productionRecommendations: [],
      totalVariants: 0,
      criticalStock: 0,
      warningStock: 0,
      error: 'Failed to get inventory analytics'
    }, { status: 200 } // Return 200 with empty data instead of 500 }
    );
  }
}
