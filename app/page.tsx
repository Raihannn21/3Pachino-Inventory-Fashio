"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SimpleLineChart, SimpleBarChart, SimplePieChart, SimpleComposedChart } from '@/components/charts/ChartComponents';
import { exportTransactionsToExcel } from '@/lib/excel-export';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  DollarSign,
  Users,
  RefreshCw,
  Calendar,
  Download
} from 'lucide-react';

interface AnalyticsData {
  salesOverview: {
    totalSales: number;
    totalTransactions: number;
    totalItemsSold: number;
    averageOrderValue: number;
  };
  productionOverview: {
    totalProductionCost: number;
    totalItemsProduced: number;
    averageProductionCost: number;
  };
  profitOverview: {
    totalProfit: number;
    profitMargin: number;
  };
  dailySales: Array<{
    date: string;
    sales: number;
    transactions: number;
    profit: number;
  }>;
  dailyProduction: Array<{
    date: string;
    cost: number;
    orders: number;
    items: number;
  }>;
  topProducts: Array<{
    productId: string;
    productName: string;
    quantity: number;
    revenue: number;
  }>;
  topCustomers: Array<{
    customerName: string;
    totalSpent: number;
    transactionCount: number;
  }>;
  lowStockItems: Array<{
    id: string;
    product: {
      name: string;
      category?: { name: string };
      brand?: { name: string };
    };
    size?: { name: string };
    color?: { name: string };
    stock: number;
    minStock: number;
  }>;
  period: number;
}

interface TransactionData {
  transactions: Array<{
    id: string;
    date: string;
    type: string;
    supplier: string;
    user: string;
    totalAmount: number;
    profit: number;
    itemCount: number;
    status: string;
    invoiceNumber: string;
    items: Array<{
      productName: string;
      size: string;
      color: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
  }>;
  totalCount: number;
  period: number;
}

export default function Dashboard() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [transactionData, setTransactionData] = useState<TransactionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = async () => {
    try {
      setRefreshing(true);
      const params = new URLSearchParams();
      
      if (dateRange) {
        params.append('startDate', dateRange.from.toISOString());
        params.append('endDate', dateRange.to.toISOString());
      } else {
        params.append('period', period);
      }

      const response = await fetch(`/api/analytics?${params}`);
      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const params = new URLSearchParams();
      
      if (dateRange) {
        params.append('startDate', dateRange.from.toISOString());
        params.append('endDate', dateRange.to.toISOString());
      } else {
        params.append('period', period);
      }

      const response = await fetch(`/api/transactions?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTransactionData(data);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    fetchTransactions();
  }, [period, dateRange]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleExportExcel = () => {
    if (transactionData && transactionData.transactions.length > 0) {
      exportTransactionsToExcel(transactionData.transactions, transactionData.period);
    }
  };

  const handleDateRangeChange = (range: { from: Date; to: Date } | null) => {
    setDateRange(range);
    if (range) {
      // When using custom date range, clear period
      setPeriod('');
    }
  };

  const StatCard = ({ 
    title, 
    value, 
    description, 
    icon: Icon, 
    trend, 
    trendValue 
  }: {
    title: string;
    value: string | number;
    description: string;
    icon: any;
    trend?: 'up' | 'down';
    trendValue?: string;
  }) => (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        <Icon className="h-4 w-4 text-gray-400" />
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
          {trend && (
            <>
              {trend === 'up' ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span className={trend === 'up' ? 'text-green-500' : 'text-red-500'}>
                {trendValue}
              </span>
            </>
          )}
          {description}
        </p>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p>Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">
                Selamat datang di sistem manajemen inventori 3PACHINO
              </p>
            </div>
          <div className="flex gap-2">
            <DateRangePicker 
              onDateRangeChange={handleDateRangeChange}
              className="w-64"
            />
            <Button 
              variant="outline" 
              onClick={fetchAnalytics}
              disabled={refreshing}
              className="shadow-sm"
            >
              {refreshing ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
          </div>
        </div>

        {!analyticsData ? (
          <div className="text-center py-12">
            <div className="bg-white rounded-lg shadow-sm p-8">
              <p className="text-gray-600 mb-4">Gagal memuat data analytics</p>
              <Button onClick={fetchAnalytics} className="mt-4">
                Coba Lagi
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <Tabs defaultValue="overview" className="w-full">
              <div className="bg-white rounded-lg shadow-sm p-1 mb-8">
                <TabsList className="grid w-full grid-cols-6 bg-transparent">
                  <TabsTrigger value="overview" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">Overview</TabsTrigger>
                  <TabsTrigger value="sales" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">Penjualan</TabsTrigger>
                  <TabsTrigger value="production" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">Produksi</TabsTrigger>
                  <TabsTrigger value="products" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">Produk</TabsTrigger>
                  <TabsTrigger value="inventory" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">Inventory</TabsTrigger>
                  <TabsTrigger value="transactions" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">Transaksi</TabsTrigger>
                </TabsList>
              </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-8">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total Penjualan"
                value={formatCurrency(analyticsData.salesOverview.totalSales)}
                description={`${analyticsData.period} hari terakhir`}
                icon={DollarSign}
              />
              <StatCard
                title="Total Transaksi"
                value={analyticsData.salesOverview.totalTransactions}
                description={`${analyticsData.period} hari terakhir`}
                icon={ShoppingCart}
              />
              <StatCard
                title="Rata-rata Order"
                value={formatCurrency(analyticsData.salesOverview.averageOrderValue)}
                description="Per transaksi"
                icon={TrendingUp}
              />
              <StatCard
                title="Total Profit"
                value={formatCurrency(analyticsData.profitOverview.totalProfit)}
                description={`Margin: ${analyticsData.profitOverview.profitMargin.toFixed(1)}%`}
                icon={TrendingUp}
              />
            </div>

            {/* Sales Trend Chart */}
            <Card className="bg-white shadow-sm border-0">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-semibold text-gray-900">Tren Penjualan & Profit Harian</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <SimpleComposedChart 
                  data={analyticsData.dailySales}
                  xAxisKey="date"
                  barDataKey="sales"
                  lineDataKey="profit"
                  barColor="#2563eb"
                  lineColor="#059669"
                />
              </CardContent>
            </Card>

            {/* Low Stock Alert */}
            {analyticsData.lowStockItems.length > 0 && (
              <Card className="bg-white shadow-sm border-0">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-xl font-semibold text-gray-900">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    Stok Menipis ({analyticsData.lowStockItems.length} item)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {analyticsData.lowStockItems.slice(0, 5).map((item) => (
                      <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
                        <div>
                          <span className="font-medium text-gray-900">{item.product.name}</span>
                          {item.size && item.color && (
                            <span className="text-sm text-gray-500 ml-2">
                              ({item.size.name}, {item.color.name})
                            </span>
                          )}
                        </div>
                        <Badge variant="destructive" className="font-medium">
                          {item.stock} / {item.minStock}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Sales Tab */}
          <TabsContent value="sales" className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatCard
                title="Total Penjualan"
                value={formatCurrency(analyticsData.salesOverview.totalSales)}
                description={`${analyticsData.period} hari terakhir`}
                icon={DollarSign}
              />
              <StatCard
                title="Total Profit"
                value={formatCurrency(analyticsData.profitOverview.totalProfit)}
                description={`Margin: ${analyticsData.profitOverview.profitMargin.toFixed(1)}%`}
                icon={TrendingUp}
              />
              <StatCard
                title="Total Transaksi"
                value={analyticsData.salesOverview.totalTransactions}
                description="Jumlah order"
                icon={ShoppingCart}
              />
              <StatCard
                title="Item Terjual"
                value={analyticsData.salesOverview.totalItemsSold}
                description="Total unit"
                icon={Package}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Sales Chart */}
              <Card className="bg-white shadow-sm border-0">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-semibold text-gray-900">Tren Penjualan, Profit & Transaksi</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <SimpleComposedChart 
                    data={analyticsData.dailySales}
                    xAxisKey="date"
                    barDataKey="sales"
                    lineDataKey="profit"
                    line2DataKey="transactions"
                    barColor="#2563eb"
                    lineColor="#059669"
                    line2Color="#f59e0b"
                  />
                </CardContent>
              </Card>

              {/* Top Products */}
              <Card className="bg-white shadow-sm border-0">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-semibold text-gray-900">Produk Terlaris</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {analyticsData.topProducts.slice(0, 5).map((product, index) => (
                      <div key={product.productId} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-500 bg-white w-8 h-8 rounded-full flex items-center justify-center">
                            #{index + 1}
                          </span>
                          <span className="font-medium text-gray-900">{product.productName}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">{formatCurrency(product.revenue)}</div>
                          <div className="text-sm text-gray-500">{product.quantity} unit</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Production Tab */}
          <TabsContent value="production" className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard
                title="Total Biaya Produksi"
                value={formatCurrency(analyticsData.productionOverview.totalProductionCost)}
                description={`${analyticsData.period} hari terakhir`}
                icon={DollarSign}
              />
              <StatCard
                title="Item Diproduksi"
                value={analyticsData.productionOverview.totalItemsProduced}
                description="Total unit"
                icon={Package}
              />
              <StatCard
                title="Rata-rata Biaya"
                value={formatCurrency(analyticsData.productionOverview.averageProductionCost)}
                description="Per unit"
                icon={TrendingUp}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Production Cost Trend */}
              <Card className="bg-white shadow-sm border-0">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-semibold text-gray-900">Tren Biaya & Volume Produksi</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <SimpleComposedChart 
                    data={analyticsData.dailyProduction}
                    xAxisKey="date"
                    barDataKey="cost"
                    lineDataKey="items"
                    barColor="#dc2626"
                    lineColor="#7c3aed"
                  />
                </CardContent>
              </Card>

              {/* Production Efficiency */}
              <Card className="bg-white shadow-sm border-0">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-semibold text-gray-900">Efisiensi Produksi Harian</CardTitle>
                  <p className="text-sm text-gray-600">Biaya per unit yang diproduksi</p>
                </CardHeader>
                <CardContent className="pt-0">
                  <SimpleLineChart 
                    data={analyticsData.dailyProduction.map(day => ({
                      ...day,
                      efficiency: day.items > 0 ? day.cost / day.items : 0
                    }))}
                    xAxisKey="date"
                    dataKey="efficiency"
                    color="#059669"
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-8">
            <Card className="bg-white shadow-sm border-0">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-semibold text-gray-900">Performa Produk Terbaik</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <SimpleBarChart 
                  data={analyticsData.topProducts.slice(0, 10)}
                  xAxisKey="productName"
                  dataKey="revenue"
                  title="Revenue"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory" className="space-y-8">
            {analyticsData.lowStockItems.length > 0 ? (
              <Card className="bg-white shadow-sm border-0">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-xl font-semibold text-gray-900">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    Stok Menipis ({analyticsData.lowStockItems.length} item)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {analyticsData.lowStockItems.map((item) => (
                      <div key={item.id} className="flex justify-between items-center p-4 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors">
                        <div>
                          <div className="font-semibold text-gray-900">{item.product.name}</div>
                          <div className="text-sm text-gray-600">
                            {item.product.category?.name} - {item.product.brand?.name}
                            {item.size && item.color && (
                              <span> • {item.size.name}, {item.color.name}</span>
                            )}
                          </div>
                        </div>
                        <Badge variant="destructive" className="font-semibold">
                          Stok: {item.stock} / Min: {item.minStock}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-white shadow-sm border-0">
                <CardContent className="text-center py-12">
                  <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2 text-gray-900">Stok Aman</h3>
                  <p className="text-gray-600">
                    Semua produk memiliki stok yang cukup
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-8">
            {transactionData ? (
              <Card className="bg-white shadow-sm border-0">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-xl font-semibold text-gray-900">
                      Laporan Transaksi ({transactionData.totalCount} transaksi)
                    </CardTitle>
                    <Button 
                      onClick={handleExportExcel}
                      variant="outline" 
                      size="sm"
                      className="flex items-center gap-2 hover:bg-green-50 hover:text-green-700 hover:border-green-300"
                    >
                      <Download className="h-4 w-4" />
                      Export Excel
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="text-left py-3 px-3 font-semibold text-gray-700">Tanggal</th>
                          <th className="text-left py-3 px-3 font-semibold text-gray-700">No. Invoice</th>
                          <th className="text-left py-3 px-3 font-semibold text-gray-700">Tipe</th>
                          <th className="text-left py-3 px-3 font-semibold text-gray-700">Supplier/User</th>
                          <th className="text-center py-3 px-3 font-semibold text-gray-700">Items</th>
                          <th className="text-right py-3 px-3 font-semibold text-gray-700">Total</th>
                          <th className="text-right py-3 px-3 font-semibold text-gray-700">Profit</th>
                          <th className="text-center py-3 px-3 font-semibold text-gray-700">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactionData.transactions.map((transaction) => (
                          <tr key={transaction.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-3 text-gray-900">
                              {new Date(transaction.date).toLocaleDateString('id-ID', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-mono text-sm text-blue-600">
                                {transaction.invoiceNumber}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <Badge 
                                variant={
                                  transaction.type === 'SALE' ? 'default' :
                                  transaction.type === 'PURCHASE' ? 'secondary' :
                                  transaction.type === 'RETURN_SALE' ? 'destructive' :
                                  transaction.type === 'RETURN_PURCHASE' ? 'outline' :
                                  'secondary'
                                }
                                className="text-xs"
                              >
                                {transaction.type === 'SALE' ? 'Penjualan' :
                                 transaction.type === 'PURCHASE' ? 'Pembelian' :
                                 transaction.type === 'RETURN_SALE' ? 'Retur Jual' :
                                 transaction.type === 'RETURN_PURCHASE' ? 'Retur Beli' :
                                 'Penyesuaian'}
                              </Badge>
                            </td>
                            <td className="py-3 px-3 text-gray-900">
                              {transaction.type === 'PURCHASE' || transaction.type === 'RETURN_PURCHASE' 
                                ? transaction.supplier 
                                : transaction.user}
                            </td>
                            <td className="py-3 px-3 text-center text-gray-600">
                              {transaction.itemCount}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <span className={
                                transaction.type === 'SALE' ? 'text-green-600 font-semibold' :
                                transaction.type === 'PURCHASE' ? 'text-blue-600 font-semibold' :
                                transaction.type === 'RETURN_SALE' ? 'text-red-600 font-semibold' :
                                transaction.type === 'RETURN_PURCHASE' ? 'text-orange-600 font-semibold' :
                                'text-gray-600 font-semibold'
                              }>
                                {formatCurrency(transaction.totalAmount)}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              {transaction.type === 'SALE' && transaction.profit > 0 ? (
                                <span className="text-green-600 font-semibold">
                                  {formatCurrency(transaction.profit)}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <Badge 
                                variant={
                                  transaction.status === 'COMPLETED' ? 'default' :
                                  transaction.status === 'PENDING' ? 'secondary' :
                                  'destructive'
                                }
                                className="text-xs"
                              >
                                {transaction.status === 'COMPLETED' ? 'Selesai' :
                                 transaction.status === 'PENDING' ? 'Pending' :
                                 'Batal'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Summary Statistics */}
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(
                          transactionData.transactions
                            .filter(t => t.type === 'SALE')
                            .reduce((sum, t) => sum + t.totalAmount, 0)
                        )}
                      </div>
                      <div className="text-sm text-green-700 font-medium">Total Penjualan</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {formatCurrency(
                          transactionData.transactions
                            .filter(t => t.type === 'PURCHASE')
                            .reduce((sum, t) => sum + t.totalAmount, 0)
                        )}
                      </div>
                      <div className="text-sm text-blue-700 font-medium">Total Pembelian</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(
                          transactionData.transactions
                            .filter(t => t.type === 'SALE')
                            .reduce((sum, t) => sum + t.profit, 0)
                        )}
                      </div>
                      <div className="text-sm text-green-700 font-medium">Total Profit</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-600">
                        {transactionData.transactions
                          .reduce((sum, t) => sum + t.itemCount, 0)}
                      </div>
                      <div className="text-sm text-gray-700 font-medium">Total Item</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-white shadow-sm border-0">
                <CardContent className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Memuat data transaksi...</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}
