'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  DollarSign, 
  Plus, 
  Minus,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  BarChart3
} from 'lucide-react';
import { toast } from 'sonner';

interface InventoryItem {
  id: string;
  product: {
    id: string;
    name: string;
    sku: string;
    category: { name: string };
    brand: { name: string };
  };
  size: { name: string };
  color: { name: string };
  stock: number;
  minStock: number;
  maxStock: number;
  costPrice: number;
  sellingPrice: number;
  lastUpdated: string;
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'over_stock';
  daysOfStock: number;
  needReorder: boolean;
  reorderQuantity: number;
}

interface InventorySummary {
  totalItems: number;
  totalValue: number;
  lowStock: number;
  outOfStock: number;
  overStock: number;
  avgDaysOfStock: number;
  totalReorderSuggestions: number;
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [filters, setFilters] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showAlertsOnly, setShowAlertsOnly] = useState(false);
  const [adjustmentDialog, setAdjustmentDialog] = useState({ open: false, item: null as InventoryItem | null });
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');

  useEffect(() => {
    fetchInventoryData();
  }, [showAlertsOnly, selectedCategory, selectedBrand]);

  const fetchInventoryData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (showAlertsOnly) params.append('alertsOnly', 'true');
      if (selectedCategory && selectedCategory !== 'all') params.append('category', selectedCategory);
      if (selectedBrand && selectedBrand !== 'all') params.append('brand', selectedBrand);

      const response = await fetch(`/api/inventory?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        // Transform data to match expected interface
        const transformedInventory = data.inventory.map((item: any) => ({
          id: item.id,
          product: {
            id: item.product.id,
            name: item.product.name,
            sku: item.product.sku,
            category: { name: item.product.category.name },
            brand: { name: item.product.brand.name }
          },
          size: { name: item.size.name },
          color: { name: item.color.name },
          stock: item.currentStock || item.availableStock,
          minStock: item.minStock,
          maxStock: item.maxStock,
          costPrice: item.product.costPrice,
          sellingPrice: item.product.sellingPrice,
          lastUpdated: item.lastUpdated,
          status: item.stockStatus?.toLowerCase().replace('stock', '_stock') || 'normal',
          daysOfStock: item.daysOfStock || 0,
          needReorder: item.suggestedReorder > 0,
          reorderQuantity: item.suggestedReorder || 0
        }));

        const transformedSummary = {
          totalItems: data.summary.totalProducts || 0,
          totalValue: data.summary.totalValue || 0,
          lowStock: data.summary.lowStock || 0,
          outOfStock: data.summary.criticalStock || 0,
          overStock: data.summary.overStock || 0,
          avgDaysOfStock: data.summary.avgDaysOfStock || 0,
          totalReorderSuggestions: data.summary.totalReorderSuggestions || 0,
        };

        setInventory(transformedInventory);
        setSummary(transformedSummary);
        setFilters({
          categories: data.filters.categories.map((c: any) => c.name),
          brands: data.filters.brands.map((b: any) => b.name),
          statuses: ['in_stock', 'low_stock', 'out_of_stock', 'over_stock']
        });
      } else {
        toast.error('Gagal memuat data inventory');
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast.error('Gagal memuat data inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleStockAdjustment = async () => {
    if (!adjustmentDialog.item || !adjustmentAmount) {
      toast.error('Jumlah adjustment wajib diisi');
      return;
    }

    try {
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId: adjustmentDialog.item.id,
          adjustment: parseInt(adjustmentAmount),
          type: 'MANUAL_ADJUSTMENT',
          reason: adjustmentReason || 'Manual stock adjustment',
          reference: `ADJ-${Date.now()}`
        }),
      });

      if (response.ok) {
        toast.success('Stock adjustment berhasil disimpan');
        setAdjustmentDialog({ open: false, item: null });
        setAdjustmentAmount('');
        setAdjustmentReason('');
        fetchInventoryData();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Gagal melakukan stock adjustment');
      }
    } catch (error) {
      console.error('Error adjusting stock:', error);
      toast.error('Gagal melakukan stock adjustment');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      in_stock: { label: 'Stok Normal', variant: 'default' as const },
      low_stock: { label: 'Stok Rendah', variant: 'secondary' as const },
      out_of_stock: { label: 'Habis', variant: 'destructive' as const },
      over_stock: { label: 'Over Stock', variant: 'secondary' as const },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.in_stock;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = searchTerm === '' || 
      item.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || item.product.category.name === selectedCategory;
    const matchesBrand = selectedBrand === 'all' || item.product.brand.name === selectedBrand;
    const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;
    
    return matchesSearch && matchesCategory && matchesBrand && matchesStatus;
  });

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-8">
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Inventory Management</h1>
              <p className="text-slate-600 mt-2">Kelola dan pantau stok produk Anda</p>
            </div>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="shadow-sm border-0">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Loading...</CardTitle>
                  <div className="w-8 h-8 bg-slate-100 rounded-full animate-pulse"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-slate-100 rounded animate-pulse mb-2"></div>
                  <div className="h-4 bg-slate-50 rounded animate-pulse"></div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="space-y-6">
            <div className="h-10 bg-slate-100 rounded animate-pulse"></div>
            <Card className="shadow-sm border-0">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-12 bg-slate-50 rounded animate-pulse"></div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Inventory Management</h1>
            <p className="text-slate-600 mt-2">Kelola dan pantau stok produk Anda secara real-time</p>
          </div>
          <Button onClick={fetchInventoryData} variant="outline" className="hover:bg-slate-50">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-sm border-0 bg-gradient-to-br from-blue-50 to-blue-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-blue-700">Total Items</CardTitle>
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <Package className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">{summary?.totalItems || 0}</div>
              <p className="text-xs text-blue-600 mt-1">
                Varian produk
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-0 bg-gradient-to-br from-emerald-50 to-emerald-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-emerald-700">Total Value</CardTitle>
              <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-900">
                Rp {summary?.totalValue?.toLocaleString() || 0}
              </div>
              <p className="text-xs text-emerald-600 mt-1">
                Nilai inventory
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-0 bg-gradient-to-br from-red-50 to-red-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-red-700">Low Stock</CardTitle>
              <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-900">
                {summary?.lowStock || 0}
              </div>
              <p className="text-xs text-red-600 mt-1">
                Items perlu restock
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-0 bg-gradient-to-br from-amber-50 to-amber-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-amber-700">Out of Stock</CardTitle>
              <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center">
                <Package className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-900">
                {summary?.outOfStock || 0}
              </div>
              <p className="text-xs text-amber-600 mt-1">
                Items habis
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="shadow-sm border-0">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-slate-800">Filter & Pencarian</CardTitle>
                <p className="text-sm text-slate-600 mt-1">Cari dan filter produk berdasarkan kriteria</p>
              </div>
              <Filter className="h-5 w-5 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Cari produk, SKU, atau barcode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full md:w-48 border-slate-300 focus:border-blue-500 focus:ring-blue-500">
                  <SelectValue placeholder="Semua Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  {filters.categories?.map((category: string) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                <SelectTrigger className="w-full md:w-48 border-slate-300 focus:border-blue-500 focus:ring-blue-500">
                  <SelectValue placeholder="Semua Brand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Brand</SelectItem>
                  {filters.brands?.map((brand: string) => (
                    <SelectItem key={brand} value={brand}>
                      {brand}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-full md:w-48 border-slate-300 focus:border-blue-500 focus:ring-blue-500">
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="in_stock">Stok Normal</SelectItem>
                  <SelectItem value="low_stock">Stok Rendah</SelectItem>
                  <SelectItem value="out_of_stock">Habis</SelectItem>
                  <SelectItem value="over_stock">Over Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Inventory Table */}
        <Card className="shadow-sm border-0">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-slate-800">Daftar Inventory</CardTitle>
                <CardDescription className="text-slate-600">
                  {filteredInventory.length} dari {inventory.length} items
                </CardDescription>
              </div>
              <BarChart3 className="h-5 w-5 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {filteredInventory.length === 0 ? (
              <div className="text-center py-12">
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <Package className="h-8 w-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">Tidak ada data inventory</h3>
                  <p className="text-slate-500 max-w-sm">
                    {inventory.length === 0 
                      ? "Belum ada data inventory. Tambahkan produk dan varian terlebih dahulu." 
                      : "Tidak ada data yang sesuai dengan filter yang dipilih."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-slate-200">
                      <TableHead className="font-semibold text-slate-700">Produk</TableHead>
                      <TableHead className="font-semibold text-slate-700">Varian</TableHead>
                      <TableHead className="font-semibold text-slate-700">SKU</TableHead>
                      <TableHead className="font-semibold text-slate-700">Stok</TableHead>
                      <TableHead className="font-semibold text-slate-700">Min Stock</TableHead>
                      <TableHead className="font-semibold text-slate-700">Status</TableHead>
                      <TableHead className="font-semibold text-slate-700">Harga</TableHead>
                      <TableHead className="font-semibold text-slate-700">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInventory.map((item) => (
                      <TableRow key={item.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <TableCell className="font-medium">
                          <div>
                            <p className="text-slate-800 font-semibold">{item.product.name}</p>
                            <p className="text-xs text-slate-500 mt-1">
                              {item.product.category.name} • {item.product.brand.name}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                              {item.size.name}
                            </span>
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                              {item.color.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-slate-100 px-2 py-1 rounded font-mono text-slate-700">
                            {item.product.sku}
                          </code>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={`font-bold text-lg ${
                              item.stock <= item.minStock ? 'text-red-600' : 
                              item.stock > item.maxStock ? 'text-amber-600' : 
                              'text-emerald-600'
                            }`}>
                              {item.stock}
                            </span>
                            {item.needReorder && (
                              <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                                Reorder: {item.reorderQuantity}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-slate-600 font-medium">{item.minStock}</span>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(item.status)}
                        </TableCell>
                        <TableCell>
                          <div className="text-right">
                            <div className="font-semibold text-emerald-600">
                              Rp {item.sellingPrice.toLocaleString()}
                            </div>
                            <div className="text-xs text-slate-500">
                              Cost: Rp {item.costPrice.toLocaleString()}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Dialog 
                            open={adjustmentDialog.open && adjustmentDialog.item?.id === item.id}
                            onOpenChange={(open) => setAdjustmentDialog({ 
                              open, 
                              item: open ? item : null 
                            })}
                          >
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" className="hover:bg-slate-100">
                                <BarChart3 className="h-4 w-4 mr-1" />
                                Adjust
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle className="text-lg font-semibold text-slate-800">Stock Adjustment</DialogTitle>
                              <DialogDescription className="text-slate-600">
                                Adjust stock untuk {item.product.name} - {item.size.name} {item.color.name}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="bg-slate-50 p-3 rounded-lg">
                                <Label className="text-sm font-medium text-slate-700">Current Stock</Label>
                                <div className={`text-2xl font-bold mt-1 ${
                                  item.stock <= item.minStock ? 'text-red-600' : 'text-emerald-600'
                                }`}>
                                  {item.stock} pcs
                                </div>
                              </div>
                              <div>
                                <Label htmlFor="adjustment" className="text-sm font-medium text-slate-700">Adjustment Amount</Label>
                                <Input
                                  id="adjustment"
                                  type="number"
                                  placeholder="e.g., +10 or -5"
                                  value={adjustmentAmount}
                                  onChange={(e) => setAdjustmentAmount(e.target.value)}
                                  className="mt-1 border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                                />
                                <p className="text-xs text-slate-500 mt-1">Use + for increase, - for decrease</p>
                              </div>
                              <div>
                                <Label htmlFor="reason" className="text-sm font-medium text-slate-700">Reason</Label>
                                <Input
                                  id="reason"
                                  placeholder="Reason for adjustment"
                                  value={adjustmentReason}
                                  onChange={(e) => setAdjustmentReason(e.target.value)}
                                  className="mt-1 border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                                />
                              </div>
                              <Button 
                                onClick={handleStockAdjustment} 
                                className="w-full bg-blue-600 hover:bg-blue-700"
                              >
                                Save Adjustment
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
