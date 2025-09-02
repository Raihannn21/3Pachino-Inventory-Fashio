import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Ambil detail customer dan purchase history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const customerId = id;

    // Ambil data customer
    const customer = await prisma.supplier.findUnique({
      where: { id: customerId },
      include: {
        transactions: {
          where: {
            type: 'SALE'
          },
          include: {
            items: {
              include: {
                variant: {
                  include: {
                    product: {
                      include: {
                        category: true,
                        brand: true
                      }
                    },
                    size: true,
                    color: true
                  }
                },
                product: {
                  include: {
                    category: true,
                    brand: true
                  }
                }
              }
            }
          },
          orderBy: {
            transactionDate: 'desc'
          }
        }
      }
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer tidak ditemukan' },
        { status: 404 }
      );
    }

    // Hitung statistik customer
    const transactions = customer.transactions;
    const totalSpent = transactions.reduce((sum: number, t: any) => sum + Number(t.totalAmount), 0);
    const totalTransactions = transactions.length;
    const avgTransactionValue = totalTransactions > 0 ? totalSpent / totalTransactions : 0;
    
    // Hitung total items yang pernah dibeli
    const totalItems = transactions.reduce((sum: number, t: any) => 
      sum + t.items.reduce((itemSum: number, item: any) => itemSum + item.quantity, 0), 0
    );

    // Cari produk favorit (yang paling sering dibeli)
    const productFrequency: { [key: string]: { count: number, product: any, lastPurchase: Date } } = {};
    
    transactions.forEach((transaction: any) => {
      transaction.items.forEach((item: any) => {
        const product = item.variant?.product || item.product;
        const productKey = product.id;
        
        if (!productFrequency[productKey]) {
          productFrequency[productKey] = {
            count: 0,
            product: product,
            lastPurchase: new Date(transaction.transactionDate)
          };
        }
        
        productFrequency[productKey].count += item.quantity;
        const transactionDate = new Date(transaction.transactionDate);
        if (transactionDate > productFrequency[productKey].lastPurchase) {
          productFrequency[productKey].lastPurchase = transactionDate;
        }
      });
    });

    // Sort produk berdasarkan frequency
    const favoriteProducts = Object.values(productFrequency)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Cari transaksi terakhir
    const lastTransaction = transactions.length > 0 ? transactions[0] : null;
    const daysSinceLastPurchase = lastTransaction 
      ? Math.floor((Date.now() - new Date(lastTransaction.transactionDate).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // Hitung spending per bulan (6 bulan terakhir)
    const monthlySpending: { [key: string]: number } = {};
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    transactions.forEach((transaction: any) => {
      const date = new Date(transaction.transactionDate);
      if (date >= sixMonthsAgo) {
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlySpending[monthKey]) {
          monthlySpending[monthKey] = 0;
        }
        monthlySpending[monthKey] += Number(transaction.totalAmount);
      }
    });

    const customerStats = {
      totalSpent,
      totalTransactions,
      avgTransactionValue,
      totalItems,
      favoriteProducts,
      lastTransaction,
      daysSinceLastPurchase,
      monthlySpending
    };

    return NextResponse.json({
      customer: {
        ...customer,
        transactions: transactions.slice(0, 10) // Limit to 10 recent transactions for initial load
      },
      stats: customerStats
    });

  } catch (error) {
    console.error('Error fetching customer details:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data customer' },
      { status: 500 }
    );
  }
}
