import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "30"; // Default 30 days
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Calculate date range
    let dateFilter: any = {};
    if (startDate && endDate) {
      dateFilter = {
        transactionDate: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      };
    } else {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(period));
      dateFilter = {
        transactionDate: {
          gte: daysAgo,
        },
      };
    }

    // 1. Sales Overview
    const salesData = await prisma.transaction.findMany({
      where: {
        type: "SALE",
        ...dateFilter,
      },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        },
        items: {
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    const totalSales = salesData.reduce(
      (sum, sale) => sum + Number(sale.totalAmount),
      0
    );
    const totalTransactions = salesData.length;
    const totalItemsSold = salesData.reduce(
      (sum, sale) =>
        sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
      0
    );

    // 2. Daily Sales Trend (last 7 days) with Profit
    const dailySales = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));

      const daySales = await prisma.transaction.aggregate({
        where: {
          type: "SALE",
          transactionDate: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
        _sum: {
          totalAmount: true,
        },
        _count: true,
      });

      // Calculate daily profit
      const daySalesWithItems = await prisma.transaction.findMany({
        where: {
          type: "SALE",
          transactionDate: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: true,
                },
              },
            },
          },
        },
      });

      let dayProfit = 0;
      daySalesWithItems.forEach((sale) => {
        sale.items.forEach((item) => {
          if (item.variant?.product) {
            const costPrice = Number(item.variant.product.costPrice);
            const sellingPrice = Number(item.unitPrice);
            const profit = (sellingPrice - costPrice) * item.quantity;
            dayProfit += profit;
          }
        });
      });

      dailySales.push({
        date: dayStart.toISOString().split("T")[0],
        sales: Number(daySales._sum.totalAmount) || 0,
        transactions: daySales._count,
        profit: dayProfit,
      });
    }

    // 2.5. Daily Production Trend (last 7 days)
    const dailyProduction = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));

      const dayProduction = await prisma.transaction.aggregate({
        where: {
          type: "PURCHASE",
          transactionDate: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
        _sum: {
          totalAmount: true,
        },
        _count: true,
      });

      const dayProductionData = await prisma.transaction.findMany({
        where: {
          type: "PURCHASE",
          transactionDate: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
        include: {
          items: true,
        },
      });

      const dayItemsProduced = dayProductionData.reduce(
        (sum, prod) =>
          sum + prod.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
        0
      );

      dailyProduction.push({
        date: dayStart.toISOString().split("T")[0],
        cost: Number(dayProduction._sum.totalAmount) || 0,
        orders: dayProduction._count,
        items: dayItemsProduced,
      });
    }

    // 3. Top Selling Products
    const productSales = new Map();
    salesData.forEach((sale) => {
      sale.items.forEach((item) => {
        const productId = item.variant?.product.id || item.productId;
        const productName = item.variant?.product.name || "Unknown Product";
        const key = `${productId}-${productName}`;

        if (productSales.has(key)) {
          const existing = productSales.get(key);
          existing.quantity += item.quantity;
          existing.revenue += Number(item.totalPrice);
        } else {
          productSales.set(key, {
            productId,
            productName,
            quantity: item.quantity,
            revenue: Number(item.totalPrice),
          });
        }
      });
    });

    const topProducts = Array.from(productSales.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    // 4. Production Overview
    const productionData = await prisma.transaction.findMany({
      where: {
        type: "PURCHASE", // Production orders using PURCHASE type
        ...dateFilter,
      },
      include: {
        items: true,
      },
    });

    const totalProductionCost = productionData.reduce(
      (sum, prod) => sum + Number(prod.totalAmount),
      0
    );
    const totalItemsProduced = productionData.reduce(
      (sum, prod) =>
        sum + prod.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
      0
    );

    // 5. Low Stock Alert
    const lowStockItems = await prisma.productVariant.findMany({
      where: {
        stock: {
          lte: prisma.productVariant.fields.minStock,
        },
        isActive: true,
      },
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
      orderBy: {
        stock: "asc",
      },
      take: 10,
    });

    // 6. Customer Analytics
    const customerTransactions = new Map();
    salesData.forEach((sale) => {
      // Get customer name from supplier relation
      const customerName = sale.supplier?.name || "Walk-in Customer";

      if (customerTransactions.has(customerName)) {
        const existing = customerTransactions.get(customerName);
        existing.totalSpent += Number(sale.totalAmount);
        existing.transactionCount += 1;
      } else {
        customerTransactions.set(customerName, {
          customerName,
          totalSpent: Number(sale.totalAmount),
          transactionCount: 1,
        });
      }
    });

    const topCustomers = Array.from(customerTransactions.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    // 7. Profit Analysis (approximate)
    let totalProfit = 0;
    salesData.forEach((sale) => {
      sale.items.forEach((item) => {
        if (item.variant?.product) {
          const costPrice = Number(item.variant.product.costPrice);
          const sellingPrice = Number(item.unitPrice);
          const profit = (sellingPrice - costPrice) * item.quantity;
          totalProfit += profit;
        }
      });
    });

    return NextResponse.json({
      salesOverview: {
        totalSales,
        totalTransactions,
        totalItemsSold,
        averageOrderValue:
          totalTransactions > 0 ? totalSales / totalTransactions : 0,
      },
      productionOverview: {
        totalProductionCost,
        totalItemsProduced,
        averageProductionCost:
          totalItemsProduced > 0 ? totalProductionCost / totalItemsProduced : 0,
      },
      profitOverview: {
        totalProfit,
        profitMargin: totalSales > 0 ? (totalProfit / totalSales) * 100 : 0,
      },
      dailySales,
      dailyProduction,
      topProducts,
      topCustomers,
      lowStockItems,
      period: parseInt(period),
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data analytics" },
      { status: 500 }
    );
  }
}
