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
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!customer || !stats) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Customer tidak ditemukan</p>
          <Button onClick={() => router.back()} className="mt-4">
            Kembali
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{customer.name}</h1>
          <p className="text-gray-600">Riwayat Pembelian & Analitik</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Belanja</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.totalSpent)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Dari {stats.totalTransactions} transaksi
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rata-rata Transaksi</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.avgTransactionValue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Per transaksi
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Number(stats.totalItems) || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Produk dibeli
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Terakhir Beli</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
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
        <TabsList>
          <TabsTrigger value="history">Riwayat Pembelian</TabsTrigger>
          <TabsTrigger value="analytics">Analitik</TabsTrigger>
          <TabsTrigger value="favorites">Produk Favorit</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transaksi Terbaru</CardTitle>
              <CardDescription>
                10 transaksi terakhir dari customer ini
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {customer.transactions.map((transaction) => (
                  <div key={transaction.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-medium">
                          {formatDate(transaction.transactionDate)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {transaction.items.length} items
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">
                          {formatCurrency(transaction.totalAmount)}
                        </p>
                      </div>
                    </div>
                    
                    <Separator className="my-3" />
                    
                    <div className="space-y-2">
                      {transaction.items.map((item) => {
                        const product = item.variant?.product || item.product;
                        return (
                          <div key={item.id} className="flex justify-between items-center">
                            <div className="flex-1">
                              <p className="font-medium">{product?.name}</p>
                              <div className="flex gap-2 mt-1">
                                <Badge variant="outline">{product?.category.name}</Badge>
                                <Badge variant="outline">{product?.brand.name}</Badge>
                                {item.variant && (
                                  <>
                                    <Badge variant="secondary">
                                      {item.variant.size.name}
                                    </Badge>
                                    <Badge variant="secondary">
                                      {item.variant.color.name}
                                    </Badge>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">
                                {Number(item.quantity) || 0}x {formatCurrency(item.unitPrice)}
                              </p>
                              <p className="text-sm text-gray-600">
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
          <Card>
            <CardHeader>
              <CardTitle>Tren Belanja Bulanan</CardTitle>
              <CardDescription>
                Pola belanja customer dalam 6 bulan terakhir
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={getMonthlyChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => formatCurrency(value)} />
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
          <Card>
            <CardHeader>
              <CardTitle>Produk Favorit</CardTitle>
              <CardDescription>
                Produk yang paling sering dibeli customer ini
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.favoriteProducts.map((favorite, index) => (
                  <div key={favorite.product.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 bg-yellow-100 rounded-full">
                        {index === 0 ? (
                          <Star className="h-4 w-4 text-yellow-600" fill="currentColor" />
                        ) : (
                          <span className="text-sm font-bold text-yellow-600">
                            {index + 1}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{favorite.product.name}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline">{favorite.product.category.name}</Badge>
                          <Badge variant="outline">{favorite.product.brand.name}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Terakhir beli: {formatDate(favorite.lastPurchase)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-600">
                        {Number(favorite.count) || 0}
                      </p>
                      <p className="text-sm text-gray-600">kali dibeli</p>
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
