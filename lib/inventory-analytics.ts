import { prisma } from '@/lib/prisma';

// Calculate days of inventory remaining for a product variant
export const calculateDaysRemaining = async (variantId: string, days: number = 30): Promise<number | null> => {
  try {
    // Get current stock
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      select: { stock: true },
    });

    if (!variant) return null;

    // Calculate average daily sales from transaction items in the last X days
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    const salesData = await prisma.transactionItem.aggregate({
      where: {
        variantId: variantId,
        transaction: {
          type: 'SALE',
          createdAt: {
            gte: dateFrom,
          },
        },
      },
      _sum: {
        quantity: true,
      },
    });

    const totalSold = salesData._sum.quantity || 0;
    const averageDailySales = totalSold / days;

    // If no sales, return null (can't calculate)
    if (averageDailySales === 0) return null;

    // Calculate days remaining
    const daysRemaining = variant.stock / averageDailySales;
    
    return Math.round(daysRemaining);
  } catch (error) {
    console.error('Error calculating days remaining:', error);
    return null;
  }
};

// Get inventory status based on days remaining
export const getInventoryStatus = (daysRemaining: number | null) => {
  if (daysRemaining === null) {
    return {
      status: 'unknown',
      color: 'gray',
      message: 'Data penjualan tidak cukup',
      priority: 0,
    };
  }

  if (daysRemaining <= 7) {
    return {
      status: 'critical',
      color: 'red',
      message: 'Stok kritis! Perlu produksi segera',
      priority: 3,
    };
  }

  if (daysRemaining <= 14) {
    return {
      status: 'warning',
      color: 'yellow',
      message: 'Stok rendah, perlu diperhatikan',
      priority: 2,
    };
  }

  if (daysRemaining <= 30) {
    return {
      status: 'normal',
      color: 'blue',
      message: 'Stok normal',
      priority: 1,
    };
  }

  return {
    status: 'safe',
    color: 'green',
    message: 'Stok aman',
    priority: 0,
  };
};

// Calculate all variants with low stock (days remaining < threshold)
export const getLowStockVariants = async (threshold: number = 14) => {
  try {
    const variants = await prisma.productVariant.findMany({
      where: {
        isActive: true,
        stock: {
          gt: 0, // Only variants with stock
        },
      },
      include: {
        product: {
          select: {
            name: true,
            sku: true,
          },
        },
        size: {
          select: {
            name: true,
          },
        },
        color: {
          select: {
            name: true,
          },
        },
      },
    });

    const lowStockVariants = [];

    for (const variant of variants) {
      const daysRemaining = await calculateDaysRemaining(variant.id);
      
      if (daysRemaining !== null && daysRemaining <= threshold) {
        lowStockVariants.push({
          ...variant,
          daysRemaining,
          status: getInventoryStatus(daysRemaining),
        });
      }
    }

    // Sort by priority (most critical first)
    lowStockVariants.sort((a, b) => b.status.priority - a.status.priority);

    return lowStockVariants;
  } catch (error) {
    console.error('Error getting low stock variants:', error);
    return [];
  }
};

// Calculate reorder point based on lead time and safety stock
export const calculateReorderPoint = (
  averageDailySales: number,
  leadTimeDays: number,
  safetyStockDays: number = 7
): number => {
  return Math.ceil(averageDailySales * (leadTimeDays + safetyStockDays));
};

// Get production recommendations
export const getProductionRecommendations = async () => {
  try {
    const lowStockVariants = await getLowStockVariants(21); // 3 weeks threshold
    
    const recommendations = lowStockVariants.map(variant => {
      const leadTime = 7; // Assume 7 days production lead time
      const safetyStock = 7; // 7 days safety stock
      
      const averageDailySales = variant.stock / (variant.daysRemaining || 1);
      const recommendedQuantity = calculateReorderPoint(averageDailySales, leadTime, safetyStock);
      
      return {
        variant,
        recommendedQuantity: Math.max(recommendedQuantity - variant.stock, 0),
        urgency: variant.status.priority,
        reason: `Stok akan habis dalam ${variant.daysRemaining} hari`,
      };
    });

    return recommendations.filter(r => r.recommendedQuantity > 0);
  } catch (error) {
    console.error('Error getting production recommendations:', error);
    return [];
  }
};
