"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { SimpleLineChart, SimpleBarChart, SimplePieChart, SimpleComposedChart } from '@/components/charts/ChartComponents';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  Package, 
  Users, 
  AlertTriangle,
  Calendar,
  Download,
  RefreshCw
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

export default function ReportsAnalytics() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    try {
      setRefreshing(true);
      const params = new URLSearchParams();
      
      if (startDate && endDate) {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
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
  }, [period, startDate, endDate]);

  useEffect(() => {
    fetchAnalytics();
  }, [period, fetchAnalytics]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
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
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="text-center py-8">
        <p>Gagal memuat data analytics</p>
        <Button onClick={fetchAnalytics} className="mt-4">
          Coba Lagi
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive business insights untuk fashion inventory Anda
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={fetchAnalytics}
            disabled={refreshing}
          >
            {refreshing ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Filter Periode
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <Label>Quick Period</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 Hari</SelectItem>
                  <SelectItem value="30">30 Hari</SelectItem>
                  <SelectItem value="90">90 Hari</SelectItem>
                  <SelectItem value="365">1 Tahun</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-muted-foreground self-center">atau</div>
            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <Button onClick={fetchAnalytics}>
              Apply Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Penjualan"
          value={formatCurrency(analyticsData.salesOverview.totalSales)}
          description={`dari ${analyticsData.salesOverview.totalTransactions} transaksi`}
          icon={DollarSign}
        />
        <StatCard
          title="Items Terjual"
          value={analyticsData.salesOverview.totalItemsSold.toLocaleString()}
          description="total unit"
          icon={ShoppingCart}
        />
        <StatCard
          title="Rata-rata Order"
          value={formatCurrency(analyticsData.salesOverview.averageOrderValue)}
          description="per transaksi"
          icon={TrendingUp}
        />
        <StatCard
          title="Margin Profit"
          value={`${analyticsData.profitOverview.profitMargin.toFixed(1)}%`}
          description={formatCurrency(analyticsData.profitOverview.totalProfit)}
          icon={Package}
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="customers">Pelanggan</TabsTrigger>
          <TabsTrigger value="production">Production</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
        </TabsList>

        {/* Overview Tab - Chart Kombinasi */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tren Penjualan & Profit Overview</CardTitle>
              <CardDescription>
                Kombinasi data penjualan (bar), profit (line), dan jumlah transaksi dalam periode terpilih
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SimpleComposedChart
                data={analyticsData.dailySales.map(item => ({
                  ...item,
                  profit: Math.round(item.sales * 0.3), // Estimasi profit 30%
                  date: new Date(item.date).toLocaleDateString('id-ID', { 
                    month: 'short', 
                    day: 'numeric' 
                  })
                }))}
                barDataKey="sales"
                lineDataKey="profit"
                line2DataKey="transactions"
                xAxisKey="date"
                barColor="#8884d8"
                lineColor="#82ca9d"
                line2Color="#ffc658"
                height={450}
              />
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Performance Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="text-center p-4 border rounded-lg">
                    <h3 className="text-2xl font-bold text-green-600">
                      {formatCurrency(analyticsData.profitOverview.totalProfit)}
                    </h3>
                    <p className="text-sm text-muted-foreground">Total Profit</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <h3 className="text-2xl font-bold text-purple-600">
                      {((analyticsData.salesOverview.totalSales / analyticsData.productionOverview.totalProductionCost - 1) * 100).toFixed(1)}%
                    </h3>
                    <p className="text-sm text-muted-foreground">ROI</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Products (Revenue)</CardTitle>
              </CardHeader>
              <CardContent>
                <SimplePieChart
                  data={analyticsData.topProducts.slice(0, 5).map(p => ({
                    name: p.productName.length > 15 ? p.productName.substring(0, 15) + '...' : p.productName,
                    value: p.revenue
                  }))}
                  dataKey="value"
                  nameKey="name"
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Sales Analytics */}
        <TabsContent value="sales" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Sales Trend (7 Hari Terakhir)</CardTitle>
                <CardDescription>
                  Penjualan harian dalam {analyticsData.period} hari terakhir
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SimpleLineChart
                  data={analyticsData.dailySales}
                  dataKey="sales"
                  xAxisKey="date"
                  color="#22c55e"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Transaction Volume</CardTitle>
                <CardDescription>
                  Jumlah transaksi harian
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SimpleBarChart
                  data={analyticsData.dailySales}
                  dataKey="transactions"
                  xAxisKey="date"
                  color="#3b82f6"
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Sales Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 border rounded-lg">
                  <h3 className="text-2xl font-bold text-green-600">
                    {formatCurrency(analyticsData.profitOverview.totalProfit)}
                  </h3>
                  <p className="text-sm text-muted-foreground">Total Profit</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <h3 className="text-2xl font-bold text-blue-600">
                    {formatCurrency(analyticsData.productionOverview.totalProductionCost)}
                  </h3>
                  <p className="text-sm text-muted-foreground">Total Production Cost</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <h3 className="text-2xl font-bold text-purple-600">
                    {((analyticsData.salesOverview.totalSales / analyticsData.productionOverview.totalProductionCost - 1) * 100).toFixed(1)}%
                  </h3>
                  <p className="text-sm text-muted-foreground">ROI</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Product Analytics */}
        <TabsContent value="products" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Selling Products</CardTitle>
                <CardDescription>Berdasarkan quantity terjual</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.topProducts.slice(0, 5).map((product, index) => (
                    <div key={product.productId} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{product.productName}</p>
                          <p className="text-sm text-muted-foreground">
                            {product.quantity} unit terjual
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(product.revenue)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Product Performance</CardTitle>
                <CardDescription>Distribusi penjualan by quantity</CardDescription>
              </CardHeader>
              <CardContent>
                <SimplePieChart
                  data={analyticsData.topProducts.slice(0, 6).map(p => ({
                    name: p.productName.substring(0, 15),
                    value: p.quantity
                  }))}
                  dataKey="value"
                  nameKey="name"
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Customer Analytics */}
        <TabsContent value="customers" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Customers</CardTitle>
                <CardDescription>Customer dengan spending tertinggi</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.topCustomers.slice(0, 5).map((customer, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{customer.customerName}</p>
                          <p className="text-sm text-muted-foreground">
                            {customer.transactionCount} transaksi
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(customer.totalSpent)}</p>
                        <p className="text-sm text-muted-foreground">
                          Avg: {formatCurrency(customer.totalSpent / customer.transactionCount)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Customer Distribution</CardTitle>
                <CardDescription>Spending distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <SimplePieChart
                  data={analyticsData.topCustomers.slice(0, 5).map(c => ({
                    name: c.customerName,
                    value: c.totalSpent
                  }))}
                  dataKey="value"
                  nameKey="name"
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Production Analytics */}
        <TabsContent value="production" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Production Cost</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-orange-600">
                    {formatCurrency(analyticsData.productionOverview.totalProductionCost)}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Total biaya produksi {analyticsData.period} hari terakhir
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Items Produced</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-green-600">
                    {analyticsData.productionOverview.totalItemsProduced.toLocaleString()}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Total unit diproduksi
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Avg Production Cost</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-blue-600">
                    {formatCurrency(analyticsData.productionOverview.averageProductionCost)}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Per unit
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Inventory Analytics */}
        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Low Stock Alert
              </CardTitle>
              <CardDescription>
                Items yang perlu restocking segera
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsData.lowStockItems.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Semua produk memiliki stock yang cukup! 🎉
                </p>
              ) : (
                <div className="space-y-3">
                  {analyticsData.lowStockItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{item.product.name}</h4>
                        <div className="flex gap-2 mt-1">
                          {item.size && (
                            <Badge variant="secondary">Size: {item.size.name}</Badge>
                          )}
                          {item.color && (
                            <Badge variant="secondary">Color: {item.color.name}</Badge>
                          )}
                          {item.product.category && (
                            <Badge variant="outline">{item.product.category.name}</Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Stock:</span>
                          <Badge variant="destructive">
                            {item.stock} / {item.minStock}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
