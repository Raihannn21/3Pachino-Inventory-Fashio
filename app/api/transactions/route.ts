import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const type = searchParams.get('type'); // Filter by transaction type
    
    // Calculate date range
    let whereFilter: any = {};
    if (startDate && endDate) {
      whereFilter.transactionDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else {
      const currentDate = new Date();
      const pastDate = new Date();
      pastDate.setDate(currentDate.getDate() - parseInt(period));
      whereFilter.transactionDate = {
        gte: pastDate,
        lte: currentDate,
      };
    }

    // Add type filter if specified
    if (type && type !== 'ALL') {
      whereFilter.type = type;
    }

    // Get all transactions with details
    const transactions = await prisma.transaction.findMany({
      where: whereFilter,
      include: {
        supplier: true,
        user: true,
        items: {
          include: {
            variant: {
              include: {
                product: true,
                size: true,
                color: true,
              },
            },
            product: true,
          },
        },
      },
      orderBy: {
        transactionDate: 'desc',
      },
    });

    // Format transactions for display
    const formattedTransactions = transactions.map((transaction) => {
      // Calculate profit for sales transactions
      let profit = 0;
      if (transaction.type === 'SALE') {
        transaction.items.forEach((item) => {
          if (item.variant?.product) {
            const costPrice = Number(item.variant.product.costPrice);
            const sellingPrice = Number(item.unitPrice);
            profit += (sellingPrice - costPrice) * item.quantity;
          } else if (item.product) {
            const costPrice = Number(item.product.costPrice);
            const sellingPrice = Number(item.unitPrice);
            profit += (sellingPrice - costPrice) * item.quantity;
          }
        });
      }

      return {
        id: transaction.id,
        date: transaction.transactionDate.toISOString().split('T')[0],
        type: transaction.type,
        supplier: transaction.supplier?.name || '-',
        user: transaction.user?.name || '-',
        totalAmount: Number(transaction.totalAmount),
        profit: profit,
        itemCount: transaction.items.reduce((sum, item) => sum + item.quantity, 0),
        status: transaction.status,
        invoiceNumber: transaction.invoiceNumber,
        items: transaction.items.map((item) => ({
          productName: item.variant?.product?.name || item.product?.name || 'Unknown Product',
          size: item.variant?.size?.name || '-',
          color: item.variant?.color?.name || '-',
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.totalPrice),
        })),
      };
    });

    return NextResponse.json({
      transactions: formattedTransactions,
      totalCount: formattedTransactions.length,
      period: parseInt(period),
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}
