"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SimpleLineChart, SimpleBarChart, SimplePieChart, SimpleComposedChart } from '@/components/charts/ChartComponents';
import { exportTransactionsToExcel } from '@/lib/excel-export';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { usePermission } from '@/hooks/usePermission';
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
  Download,
  LayoutDashboard,
  Shield
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
  // Permission check
  const { hasPermission, isLoading: permissionLoading } = usePermission('dashboard.view');
  
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [transactionData, setTransactionData] = useState<TransactionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [transactionFilter, setTransactionFilter] = useState<string>('ALL'); // ALL, SALE, PURCHASE

  // Show loading while checking permissions
  if (permissionLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Shield className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Memverifikasi akses...</p>
        </div>
      </div>
    );
  }

  // If no permission, component will redirect automatically via usePermission hook
  if (hasPermission === false) {
    return null;
  }

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

      // Add transaction filter
      if (transactionFilter !== 'ALL') {
        params.append('type', transactionFilter);
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
  }, [period, dateRange, transactionFilter]);

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

  const handleExportSalesExcel = () => {
    if (transactionData && transactionData.transactions.length > 0) {
      const salesData = transactionData.transactions.filter(t => t.type === 'SALE');
      if (salesData.length > 0) {
        exportTransactionsToExcel(salesData, transactionData.period, 'Penjualan');
      }
    }
  };

  const handleExportPurchasesExcel = () => {
    if (transactionData && transactionData.transactions.length > 0) {
      const purchaseData = transactionData.transactions.filter(t => t.type === 'PURCHASE');
      if (purchaseData.length > 0) {
        exportTransactionsToExcel(purchaseData, transactionData.period, 'Pembelian');
      }
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
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 sm:pb-3">
        <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">{title}</CardTitle>
        <Icon className="h-4 w-4 text-gray-400 flex-shrink-0" />
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-lg sm:text-2xl font-bold text-gray-900 break-all">{value}</div>
        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
          {trend && (
            <>
              {trend === 'up' ? (
                <TrendingUp className="h-3 w-3 text-green-500 flex-shrink-0" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500 flex-shrink-0" />
              )}
              <span className={trend === 'up' ? 'text-green-500' : 'text-red-500'}>
                {trendValue}
              </span>
            </>
          )}
          <span className="break-words">{description}</span>
        </p>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
          {/* Header Skeleton */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 space-y-4 sm:space-y-0">
            <div>
              <div className="h-6 sm:h-8 w-32 sm:w-48 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-3 sm:h-4 w-48 sm:w-80 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="h-10 w-full sm:w-32 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-10 w-full sm:w-24 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>

          {/* Loading Animation Center */}
          <div className="flex items-center justify-center mb-6 sm:mb-8">
            <div className="text-center">
              <div className="relative mb-4">
                <LayoutDashboard className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-blue-600 animate-pulse" />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Memuat Dashboard</h2>
              <p className="text-sm text-gray-600">Mengumpulkan data analytics terbaru...</p>
              <div className="flex items-center justify-center mt-4 space-x-1">
                <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce"></div>
                <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
          </div>

          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {[1, 2, 3, 4].map((item) => (
              <Card key={item} className="border-0 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 sm:pb-3">
                  <div className="h-3 sm:h-4 w-20 sm:w-24 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="h-6 sm:h-8 w-16 sm:w-20 bg-gray-200 rounded animate-pulse mb-2"></div>
                  <div className="h-3 w-24 sm:w-32 bg-gray-200 rounded animate-pulse"></div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <div className="h-5 sm:h-6 w-24 sm:w-32 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-48 sm:h-64 bg-gray-100 rounded animate-pulse flex items-center justify-center">
                  <LayoutDashboard className="h-8 w-8 sm:h-12 sm:w-12 text-gray-300" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <div className="h-5 sm:h-6 w-24 sm:w-32 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-48 sm:h-64 bg-gray-100 rounded animate-pulse flex items-center justify-center">
                  <LayoutDashboard className="h-8 w-8 sm:h-12 sm:w-12 text-gray-300" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Table Skeleton */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="h-6 w-40 bg-gray-200 rounded animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((item) => (
                  <div key={item} className="flex items-center space-x-4">
                    <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Refreshing Overlay */}
      {refreshing && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center bg-white p-6 rounded-lg shadow-lg border">
            <div className="relative mb-4">
              <RefreshCw className="h-8 w-8 mx-auto text-blue-600 animate-spin" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Memperbarui Data</h3>
            <p className="text-sm text-gray-600">Sedang mengambil data terbaru...</p>
            <div className="flex items-center justify-center mt-3 space-x-1">
              <div className="h-1.5 w-1.5 bg-blue-600 rounded-full animate-bounce"></div>
              <div className="h-1.5 w-1.5 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="h-1.5 w-1.5 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">
              Selamat datang di sistem manajemen inventori 3PACHINO
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
            <DateRangePicker 
              onDateRangeChange={handleDateRangeChange}
              className="w-full sm:w-64"
            />
            <Button 
              variant="outline" 
              onClick={fetchAnalytics}
              disabled={refreshing}
              className="shadow-sm w-full sm:w-auto"
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
              <div className="bg-white rounded-lg shadow-sm p-1 mb-6 sm:mb-8 overflow-x-auto">
                <TabsList className="flex w-full min-w-max bg-transparent gap-1 p-1">
                  <TabsTrigger value="overview" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 text-xs sm:text-sm px-3 py-2 whitespace-nowrap flex-shrink-0">Overview</TabsTrigger>
                  <TabsTrigger value="sales" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 text-xs sm:text-sm px-3 py-2 whitespace-nowrap flex-shrink-0">Penjualan</TabsTrigger>
                  <TabsTrigger value="production" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 text-xs sm:text-sm px-3 py-2 whitespace-nowrap flex-shrink-0">Produksi</TabsTrigger>
                  <TabsTrigger value="products" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 text-xs sm:text-sm px-3 py-2 whitespace-nowrap flex-shrink-0">Produk</TabsTrigger>
                  <TabsTrigger value="inventory" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 text-xs sm:text-sm px-3 py-2 whitespace-nowrap flex-shrink-0">Inventory</TabsTrigger>
                  <TabsTrigger value="transactions" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 text-xs sm:text-sm px-3 py-2 whitespace-nowrap flex-shrink-0">Transaksi</TabsTrigger>
                </TabsList>
              </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 sm:space-y-8">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
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
                <CardTitle className="text-lg sm:text-xl font-semibold text-gray-900">Tren Penjualan & Profit Harian</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="w-full overflow-x-auto">
                  <div className="min-w-[300px] h-64 sm:h-80">
                    <SimpleComposedChart 
                      data={analyticsData.dailySales}
                      xAxisKey="date"
                      barDataKey="sales"
                      lineDataKey="profit"
                      barColor="#2563eb"
                      lineColor="#059669"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Low Stock Alert */}
            {analyticsData.lowStockItems.length > 0 && (
              <Card className="bg-white shadow-sm border-0">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl font-semibold text-gray-900">
                    <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500 flex-shrink-0" />
                    Stok Menipis ({analyticsData.lowStockItems.length} item)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {analyticsData.lowStockItems.slice(0, 5).map((item) => (
                      <div key={item.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors space-y-2 sm:space-y-0">
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-gray-900 block sm:inline">{item.product.name}</span>
                          {item.size && item.color && (
                            <span className="text-sm text-gray-500 block sm:inline sm:ml-2">
                              ({item.size.name}, {item.color.name})
                            </span>
                          )}
                        </div>
                        <Badge variant="destructive" className="font-medium self-start sm:self-center">
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
          <TabsContent value="sales" className="space-y-6 sm:space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              {/* Sales Chart */}
              <Card className="bg-white shadow-sm border-0">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg sm:text-xl font-semibold text-gray-900">Tren Penjualan, Profit & Transaksi</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="w-full overflow-x-auto">
                    <div className="min-w-[300px] h-64 sm:h-80">
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
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Top Products */}
              <Card className="bg-white shadow-sm border-0">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg sm:text-xl font-semibold text-gray-900">Produk Terlaris</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {analyticsData.topProducts.slice(0, 5).map((product, index) => (
                      <div key={product.productId} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors space-y-2 sm:space-y-0">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-500 bg-white w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                            #{index + 1}
                          </span>
                          <span className="font-medium text-gray-900 break-words">{product.productName}</span>
                        </div>
                        <div className="text-left sm:text-right">
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
          <TabsContent value="production" className="space-y-6 sm:space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              {/* Production Cost Trend */}
              <Card className="bg-white shadow-sm border-0">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg sm:text-xl font-semibold text-gray-900">Tren Biaya & Volume Produksi</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="w-full overflow-x-auto">
                    <div className="min-w-[300px] h-64 sm:h-80">
                      <SimpleComposedChart 
                        data={analyticsData.dailyProduction}
                        xAxisKey="date"
                        barDataKey="cost"
                        lineDataKey="items"
                        barColor="#dc2626"
                        lineColor="#7c3aed"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Production Efficiency */}
              <Card className="bg-white shadow-sm border-0">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg sm:text-xl font-semibold text-gray-900">Efisiensi Produksi Harian</CardTitle>
                  <p className="text-sm text-gray-600">Biaya per unit yang diproduksi</p>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="w-full overflow-x-auto">
                    <div className="min-w-[300px] h-64 sm:h-80">
                      <SimpleLineChart 
                        data={analyticsData.dailyProduction.map(day => ({
                          ...day,
                          efficiency: day.items > 0 ? day.cost / day.items : 0
                        }))}
                        xAxisKey="date"
                        dataKey="efficiency"
                        color="#059669"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-6 sm:space-y-8">
            <Card className="bg-white shadow-sm border-0">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg sm:text-xl font-semibold text-gray-900">Performa Produk Terbaik</CardTitle>
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
          <TabsContent value="transactions" className="space-y-6 sm:space-y-8">
            {transactionData ? (
              <Card className="bg-white shadow-sm border-0">
                <CardHeader className="pb-4">
                  <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <CardTitle className="text-lg sm:text-xl font-semibold text-gray-900">
                        Laporan Transaksi ({transactionData.totalCount} transaksi)
                      </CardTitle>
                      <Select value={transactionFilter} onValueChange={setTransactionFilter}>
                        <SelectTrigger className="w-full sm:w-40">
                          <SelectValue placeholder="Filter transaksi" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">Semua Transaksi</SelectItem>
                          <SelectItem value="SALE">Penjualan</SelectItem>
                          <SelectItem value="PURCHASE">Pembelian</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Export Buttons - Mobile Responsive */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      {transactionFilter === 'ALL' && (
                        <>
                          <Button 
                            onClick={handleExportSalesExcel}
                            variant="outline" 
                            size="sm"
                            className="flex items-center justify-center gap-2 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 text-xs sm:text-sm"
                          >
                            <Download className="h-4 w-4" />
                            Export Penjualan
                          </Button>
                          <Button 
                            onClick={handleExportPurchasesExcel}
                            variant="outline" 
                            size="sm"
                            className="flex items-center justify-center gap-2 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300 text-xs sm:text-sm"
                          >
                            <Download className="h-4 w-4" />
                            Export Pembelian
                          </Button>
                        </>
                      )}
                      <Button 
                        onClick={handleExportExcel}
                        variant="outline" 
                        size="sm"
                        className="flex items-center justify-center gap-2 hover:bg-green-50 hover:text-green-700 hover:border-green-300 text-xs sm:text-sm"
                      >
                        <Download className="h-4 w-4" />
                        Export Excel
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {/* Desktop Table View */}
                  <div className="hidden lg:block overflow-x-auto">
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

                  {/* Mobile Card View */}
                  <div className="lg:hidden space-y-4">
                    {transactionData.transactions.map((transaction) => (
                      <Card key={transaction.id} className="border border-gray-200 shadow-sm">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
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
                              </div>
                              <p className="font-mono text-sm text-blue-600 mb-1">
                                {transaction.invoiceNumber}
                              </p>
                              <p className="text-sm text-gray-600">
                                {new Date(transaction.date).toLocaleDateString('id-ID', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={`text-lg font-bold ${
                                transaction.type === 'SALE' ? 'text-green-600' :
                                transaction.type === 'PURCHASE' ? 'text-blue-600' :
                                transaction.type === 'RETURN_SALE' ? 'text-red-600' :
                                transaction.type === 'RETURN_PURCHASE' ? 'text-orange-600' :
                                'text-gray-600'
                              }`}>
                                {formatCurrency(transaction.totalAmount)}
                              </p>
                              {transaction.type === 'SALE' && transaction.profit > 0 && (
                                <p className="text-sm text-green-600 font-medium">
                                  Profit: {formatCurrency(transaction.profit)}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center text-sm text-gray-600 pt-2 border-t border-gray-100">
                            <span>
                              {transaction.type === 'PURCHASE' || transaction.type === 'RETURN_PURCHASE' 
                                ? transaction.supplier 
                                : transaction.user}
                            </span>
                            <span>{transaction.itemCount} items</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  
                  {/* Summary Statistics */}
                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
                    <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg">
                      <div className="text-xl sm:text-2xl font-bold text-green-600 break-all">
                        {formatCurrency(
                          transactionData.transactions
                            .filter(t => t.type === 'SALE')
                            .reduce((sum, t) => sum + t.totalAmount, 0)
                        )}
                      </div>
                      <div className="text-xs sm:text-sm text-green-700 font-medium">Total Penjualan</div>
                    </div>
                    <div className="text-center p-3 sm:p-4 bg-blue-50 rounded-lg">
                      <div className="text-xl sm:text-2xl font-bold text-blue-600 break-all">
                        {formatCurrency(
                          transactionData.transactions
                            .filter(t => t.type === 'PURCHASE')
                            .reduce((sum, t) => sum + t.totalAmount, 0)
                        )}
                      </div>
                      <div className="text-xs sm:text-sm text-blue-700 font-medium">Total Pembelian</div>
                    </div>
                    <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg">
                      <div className="text-xl sm:text-2xl font-bold text-green-600 break-all">
                        {formatCurrency(
                          transactionData.transactions
                            .filter(t => t.type === 'SALE')
                            .reduce((sum, t) => sum + t.profit, 0)
                        )}
                      </div>
                      <div className="text-xs sm:text-sm text-green-700 font-medium">Total Profit</div>
                    </div>
                    <div className="text-center p-3 sm:p-4 bg-gray-50 rounded-lg">
                      <div className="text-xl sm:text-2xl font-bold text-gray-600">
                        {transactionData.transactions
                          .reduce((sum, t) => sum + t.itemCount, 0)}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-700 font-medium">Total Item</div>
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
