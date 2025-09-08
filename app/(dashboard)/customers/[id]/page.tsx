'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Calendar, ShoppingBag, TrendingUp, Package, Star } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  type: string;
  transactions: Transaction[];
}

interface Transaction {
  id: string;
  transactionDate: string;
  totalAmount: number;
  items: TransactionItem[];
}

interface TransactionItem {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  variant?: {
    id: string;
    size: { name: string };
    color: { name: string };
    product: Product;
  };
  product?: Product;
}

interface Product {
  id: string;
  name: string;
  category: { name: string };
  brand: { name: string };
}

interface CustomerStats {
  totalSpent: number;
  totalTransactions: number;
  avgTransactionValue: number;
  totalItems: number;
  favoriteProducts: Array<{
    count: number;
    product: Product;
    lastPurchase: string;
  }>;
  lastTransaction: Transaction | null;
  daysSinceLastPurchase: number | null;
  monthlySpending: { [key: string]: number };
}

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomerData();
  }, [params.id]);

  const fetchCustomerData = async () => {
    try {
      const response = await fetch(`/api/customers/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setCustomer(data.customer);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching customer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | null | undefined) => {
    const validAmount = Number(amount) || 0;
    if (isNaN(validAmount)) return 'Rp 0';
    
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(validAmount);
  };

  const formatDate = (dateString: string | Date) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Tanggal tidak valid';
      
      return date.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (error) {
      return 'Tanggal tidak valid';
    }
  };

  const getMonthlyChartData = () => {
    if (!stats?.monthlySpending) return [];
    
    return Object.entries(stats.monthlySpending)
      .map(([month, amount]) => ({
        month: new Date(month + '-01').toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }),
        amount: Number(amount) || 0,
      }))
      .filter(item => !isNaN(item.amount))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 sm:p-6">
        <div className="animate-pulse space-y-4 sm:space-y-6">
          {/* Header Skeleton */}
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 bg-gray-200 rounded"></div>
            <div>
              <div className="h-6 sm:h-8 bg-gray-200 rounded w-32 sm:w-48 mb-2"></div>
              <div className="h-3 sm:h-4 bg-gray-200 rounded w-40 sm:w-56"></div>
            </div>
          </div>
          
          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 sm:h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          
          {/* Content Skeleton */}
          <div className="h-48 sm:h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!customer || !stats) {
    return (
      <div className="container mx-auto p-4 sm:p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Customer tidak ditemukan</p>
          <Button onClick={() => router.back()} className="mt-4 w-full sm:w-auto">
            Kembali
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">{customer.name}</h1>
          <p className="text-sm text-gray-600">Riwayat Pembelian & Analitik</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Belanja</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-green-600">
              {formatCurrency(stats.totalSpent)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Dari {stats.totalTransactions} transaksi
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rata-rata Transaksi</CardTitle>
            <ShoppingBag className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">
              {formatCurrency(stats.avgTransactionValue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Per transaksi
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">{Number(stats.totalItems) || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Produk dibeli
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Terakhir Beli</CardTitle>
            <Calendar className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">
              {stats.daysSinceLastPurchase ? `${stats.daysSinceLastPurchase} hari` : 'Hari ini'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Yang lalu
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Content */}
      <Tabs defaultValue="history" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="history" className="text-xs sm:text-sm">Riwayat</TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs sm:text-sm">Analitik</TabsTrigger>
          <TabsTrigger value="favorites" className="text-xs sm:text-sm">Favorit</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Transaksi Terbaru</CardTitle>
              <CardDescription className="text-sm">
                10 transaksi terakhir dari customer ini
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {customer.transactions.map((transaction) => (
                  <div key={transaction.id} className="border rounded-lg p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-0 mb-3">
                      <div>
                        <p className="font-medium text-sm sm:text-base">
                          {formatDate(transaction.transactionDate)}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-600">
                          {transaction.items.length} items
                        </p>
                      </div>
                      <div className="sm:text-right">
                        <p className="font-bold text-base sm:text-lg text-green-600">
                          {formatCurrency(transaction.totalAmount)}
                        </p>
                      </div>
                    </div>
                    
                    <Separator className="my-3" />
                    
                    <div className="space-y-3">
                      {transaction.items.map((item) => {
                        const product = item.variant?.product || item.product;
                        return (
                          <div key={item.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                            <div className="flex-1">
                              <p className="font-medium text-sm sm:text-base">{product?.name}</p>
                              <div className="flex flex-wrap gap-1 sm:gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">{product?.category.name}</Badge>
                                <Badge variant="outline" className="text-xs">{product?.brand.name}</Badge>
                                {item.variant && (
                                  <>
                                    <Badge variant="secondary" className="text-xs">
                                      {item.variant.size.name}
                                    </Badge>
                                    <Badge variant="secondary" className="text-xs">
                                      {item.variant.color.name}
                                    </Badge>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="sm:text-right">
                              <p className="font-medium text-sm">
                                {Number(item.quantity) || 0}x {formatCurrency(item.unitPrice)}
                              </p>
                              <p className="text-xs text-gray-600">
                                {formatCurrency(item.totalPrice)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Tren Belanja Bulanan</CardTitle>
              <CardDescription className="text-sm">
                Pola belanja customer dalam 6 bulan terakhir
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={getMonthlyChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      tickFormatter={(value) => formatCurrency(value)} 
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), 'Total Belanja']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="#8884d8" 
                      strokeWidth={3}
                      dot={{ fill: '#8884d8', strokeWidth: 2, r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="favorites" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Produk Favorit</CardTitle>
              <CardDescription className="text-sm">
                Produk yang paling sering dibeli customer ini
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.favoriteProducts.map((favorite, index) => (
                  <div key={favorite.product.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg gap-3 sm:gap-4">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="flex items-center justify-center w-8 h-8 bg-yellow-100 rounded-full flex-shrink-0">
                        {index === 0 ? (
                          <Star className="h-4 w-4 text-yellow-600" fill="currentColor" />
                        ) : (
                          <span className="text-sm font-bold text-yellow-600">
                            {index + 1}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm sm:text-base">{favorite.product.name}</p>
                        <div className="flex flex-wrap gap-1 sm:gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{favorite.product.category.name}</Badge>
                          <Badge variant="outline" className="text-xs">{favorite.product.brand.name}</Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">
                          Terakhir beli: {formatDate(favorite.lastPurchase)}
                        </p>
                      </div>
                    </div>
                    <div className="text-center sm:text-right flex-shrink-0">
                      <p className="text-xl sm:text-2xl font-bold text-blue-600">
                        {Number(favorite.count) || 0}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-600">kali dibeli</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
