'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
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
  BarChart3,
  Store,
  Settings,
  History,
  ArrowUpDown
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

interface AdjustmentHistoryItem {
  id: string;
  adjustmentType: 'INCREASE' | 'DECREASE';
  quantity: number;
  reason: string;
  notes?: string;
  createdAt: string;
  user: {
    name: string;
  };
}

// Adjustment Categories - Sesuai dengan AdjustmentReason enum di schema
const ADJUSTMENT_CATEGORIES = {
  INCREASE: [
    { value: 'PRODUCTION', label: '🏭 Produksi', description: 'Barang hasil produksi baru' },
    { value: 'RETURN_FROM_CUSTOMER', label: '🔄 Return Customer', description: 'Barang dikembalikan customer' },
    { value: 'DATA_CORRECTION', label: '📊 Koreksi Data', description: 'Perbaikan kesalahan input' },
    { value: 'FOUND_ITEMS', label: '🔍 Barang Ditemukan', description: 'Stock opname - barang lebih' },
    { value: 'OTHER', label: '📦 Lainnya', description: 'Alasan lain (wajib isi catatan)' }
  ],
  DECREASE: [
    { value: 'DAMAGE', label: '💥 Barang Rusak', description: 'Barang cacat/rusak/defective' },
    { value: 'RETURN_TO_SUPPLIER', label: '📤 Return Supplier', description: 'Dikembalikan ke supplier' },
    { value: 'LOST_ITEMS', label: '❌ Barang Hilang', description: 'Barang hilang/dicuri' },
    { value: 'SAMPLE_PROMOTION', label: '🎁 Sample/Promosi', description: 'Diberikan sebagai sample' },
    { value: 'DATA_CORRECTION', label: '📊 Koreksi Data', description: 'Perbaikan kesalahan input' },
    { value: 'EXPIRED_ITEMS', label: '⏰ Barang Kadaluarsa', description: 'Barang melewati masa berlaku' },
    { value: 'OTHER', label: '📦 Lainnya', description: 'Alasan lain (wajib isi catatan)' }
  ]
};

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState('all');
  const [selectedColor, setSelectedColor] = useState('all');
  const [showAlertsOnly, setShowAlertsOnly] = useState(false);
  const [adjustmentDialog, setAdjustmentDialog] = useState({ open: false, item: null as InventoryItem | null });
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [adjustmentNotes, setAdjustmentNotes] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<'INCREASE' | 'DECREASE' | ''>('');
  const [isProcessingAdjustment, setIsProcessingAdjustment] = useState(false);
  const [historyDialog, setHistoryDialog] = useState({ open: false, item: null as InventoryItem | null });
  const [adjustmentHistory, setAdjustmentHistory] = useState<AdjustmentHistoryItem[]>([]);

  const fetchInventoryData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (showAlertsOnly) params.append('alertsOnly', 'true');

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
      } else {
        toast.error('Gagal memuat data gudang');
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast.error('Gagal memuat data gudang');
    } finally {
      setLoading(false);
    }
  }, [showAlertsOnly]);

  useEffect(() => {
    fetchInventoryData();
  }, [fetchInventoryData]);

  const handleStockAdjustment = async () => {
    if (!adjustmentDialog.item || !adjustmentAmount || !adjustmentReason || !adjustmentType) {
      toast.error('Mohon lengkapi semua field yang diperlukan');
      return;
    }

    const currentStock = adjustmentDialog.item.stock;
    const newStock = parseInt(adjustmentAmount) || 0;
    const quantity = Math.abs(newStock - currentStock);

    if (quantity === 0) {
      toast.error('Stock tidak berubah');
      return;
    }

    if (newStock < 0) {
      toast.error('Stock tidak boleh negatif');
      return;
    }

    setIsProcessingAdjustment(true);
    try {
      const response = await fetch('/api/inventory/adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId: adjustmentDialog.item.id,
          adjustmentType,
          quantity,
          reason: adjustmentReason,
          notes: adjustmentNotes || undefined
        }),
      });

      if (response.ok) {
        toast.success(`Stock adjustment berhasil! Stock ${adjustmentType === 'INCREASE' ? 'bertambah' : 'berkurang'} ${quantity} unit`);
        closeAdjustmentDialog();
        fetchInventoryData();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Gagal melakukan stock adjustment');
      }
    } catch (error) {
      console.error('Error adjusting stock:', error);
      toast.error('Gagal melakukan stock adjustment');
    } finally {
      setIsProcessingAdjustment(false);
    }
  };

  const openAdjustmentDialog = (item: InventoryItem) => {
    setAdjustmentDialog({ open: true, item });
    setAdjustmentAmount(item.stock.toString());
    setAdjustmentReason('');
    setAdjustmentNotes('');
    setAdjustmentType('');
  };

  const closeAdjustmentDialog = () => {
    setAdjustmentDialog({ open: false, item: null });
    setAdjustmentAmount('');
    setAdjustmentReason('');
    setAdjustmentNotes('');
    setAdjustmentType('');
  };

  const fetchAdjustmentHistory = async (variantId: string) => {
    try {
      const response = await fetch(`/api/inventory/adjustments?variantId=${variantId}`);
      if (response.ok) {
        const data = await response.json();
        setAdjustmentHistory(data.adjustments || []);
      }
    } catch (error) {
      console.error('Error fetching adjustment history:', error);
    }
  };

  const openHistoryDialog = (item: InventoryItem) => {
    setHistoryDialog({ open: true, item });
    fetchAdjustmentHistory(item.id);
  };

  const closeHistoryDialog = () => {
    setHistoryDialog({ open: false, item: null });
    setAdjustmentHistory([]);
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
    
    const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;
    const matchesProduct = selectedProduct === 'all' || item.product.name === selectedProduct;
    const matchesColor = selectedColor === 'all' || item.color.name === selectedColor;
    
    return matchesSearch && matchesStatus && matchesProduct && matchesColor;
  });

  // Get unique product names and colors for filter dropdowns
  const uniqueProducts = Array.from(new Set(inventory.map(item => item.product.name))).sort();
  const uniqueColors = Array.from(new Set(inventory.map(item => item.color.name))).sort();

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header Skeleton */}
        <div className="space-y-6 sm:space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="h-6 sm:h-8 w-48 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-3 sm:h-4 w-64 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="h-9 sm:h-10 w-20 sm:w-24 bg-gray-200 rounded animate-pulse"></div>
          </div>

          {/* Loading Animation Center */}
          <div className="flex items-center justify-center mb-6 sm:mb-8">
            <div className="text-center">
              <div className="relative mb-4">
                <Store className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-blue-600 animate-pulse" />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Memuat Gudang</h2>
              <p className="text-sm text-gray-600">Mengambil data stok terbaru...</p>
              <div className="flex items-center justify-center mt-4 space-x-1">
                <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce"></div>
                <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
          </div>

          {/* Summary Cards Skeleton */}
          <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="border-0 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="h-3 sm:h-4 w-20 sm:w-24 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-3 sm:h-4 w-3 sm:w-4 bg-gray-200 rounded animate-pulse"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-6 sm:h-8 w-16 sm:w-20 bg-gray-200 rounded animate-pulse mb-2"></div>
                  <div className="h-2 sm:h-3 w-24 sm:w-32 bg-gray-200 rounded animate-pulse"></div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Table Skeleton */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="h-5 sm:h-6 w-28 sm:w-32 bg-gray-200 rounded animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="h-48 sm:h-64 bg-gray-100 rounded animate-pulse flex items-center justify-center">
                <BarChart3 className="h-8 w-8 sm:h-12 sm:w-12 text-gray-300" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Gudang</h1>
            <p className="text-slate-600 mt-1 sm:mt-2 text-sm sm:text-base">Kelola dan pantau stok produk Anda secara real-time</p>
          </div>
          <Button onClick={fetchInventoryData} variant="outline" className="hover:bg-slate-50 w-full sm:w-auto">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-sm border-0 bg-gradient-to-br from-blue-50 to-blue-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 sm:pb-3">
              <CardTitle className="text-xs sm:text-sm font-medium text-blue-700">Total Items</CardTitle>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <Package className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-blue-900">{summary?.totalItems || 0}</div>
              <p className="text-xs text-blue-600 mt-1">
                Varian produk
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-0 bg-gradient-to-br from-emerald-50 to-emerald-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 sm:pb-3">
              <CardTitle className="text-xs sm:text-sm font-medium text-emerald-700">Total Value</CardTitle>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-500 rounded-full flex items-center justify-center">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-emerald-900">
                Rp {summary?.totalValue?.toLocaleString() || 0}
              </div>
              <p className="text-xs text-emerald-600 mt-1">
                Nilai inventory
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-0 bg-gradient-to-br from-red-50 to-red-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 sm:pb-3">
              <CardTitle className="text-xs sm:text-sm font-medium text-red-700">Low Stock</CardTitle>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-500 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-red-900">
                {summary?.lowStock || 0}
              </div>
              <p className="text-xs text-red-600 mt-1">
                Items perlu restock
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-0 bg-gradient-to-br from-amber-50 to-amber-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 sm:pb-3">
              <CardTitle className="text-xs sm:text-sm font-medium text-amber-700">Out of Stock</CardTitle>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-500 rounded-full flex items-center justify-center">
                <Package className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-amber-900">
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
          <CardHeader className="pb-3 sm:pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base sm:text-lg font-semibold text-slate-800">Filter & Pencarian</CardTitle>
                <p className="text-sm text-slate-600 mt-1">Cari dan filter produk berdasarkan kriteria</p>
              </div>
              <Filter className="h-5 w-5 text-slate-400 self-start sm:self-center" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Cari produk, SKU, atau barcode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="border-slate-300 focus:border-blue-500 focus:ring-blue-500">
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

                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger className="border-slate-300 focus:border-blue-500 focus:ring-blue-500">
                    <SelectValue placeholder="Semua Produk" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Produk</SelectItem>
                    {uniqueProducts.map((product) => (
                      <SelectItem key={product} value={product}>
                        {product}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedColor} onValueChange={setSelectedColor}>
                  <SelectTrigger className="border-slate-300 focus:border-blue-500 focus:ring-blue-500">
                    <SelectValue placeholder="Semua Warna" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Warna</SelectItem>
                    {uniqueColors.map((color) => (
                      <SelectItem key={color} value={color}>
                        {color}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inventory Table */}
        <Card className="shadow-sm border-0">
          <CardHeader className="pb-3 sm:pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base sm:text-lg font-semibold text-slate-800">Daftar Inventory</CardTitle>
                <CardDescription className="text-slate-600 text-sm">
                  {filteredInventory.length} dari {inventory.length} items
                </CardDescription>
              </div>
              <BarChart3 className="h-5 w-5 text-slate-400 self-start sm:self-center" />
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {filteredInventory.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <Package className="h-6 w-6 sm:h-8 sm:w-8 text-slate-400" />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-slate-700 mb-2">Tidak ada data inventory</h3>
                  <p className="text-sm sm:text-base text-slate-500 max-w-sm text-center">
                    {inventory.length === 0 
                      ? "Belum ada data inventory. Tambahkan produk dan varian terlebih dahulu." 
                      : "Tidak ada data yang sesuai dengan filter yang dipilih."}
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Mobile Card Layout */}
                <div className="block lg:hidden space-y-4">
                  {filteredInventory.map((item) => (
                    <div key={item.id} className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-800 truncate">{item.product.name}</h3>
                          <p className="text-sm text-slate-500 mt-1">
                            {item.product.category.name} • {item.product.brand.name}
                          </p>
                          <code className="text-xs bg-slate-100 px-2 py-1 rounded font-mono text-slate-700 mt-2 inline-block">
                            {item.product.sku}
                          </code>
                        </div>
                        <div className="flex flex-col items-end gap-2 ml-3">
                          {getStatusBadge(item.status)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                          {item.size.name}
                        </span>
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                          {item.color.name}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-slate-500 mb-1">Stok Saat Ini</p>
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
                        </div>
                        <div>
                          <p className="text-sm text-slate-500 mb-1">Min. Stok</p>
                          <span className="text-slate-600 font-medium">{item.minStock}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-slate-500 mb-1">Harga Jual</p>
                          <div className="font-semibold text-emerald-600">
                            Rp {item.sellingPrice.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-slate-500 mb-1">Harga Modal</p>
                          <div className="text-sm text-slate-500">
                            Rp {item.costPrice.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => openAdjustmentDialog(item)}
                          className="hover:bg-blue-50 hover:border-blue-300 flex-1"
                        >
                          <ArrowUpDown className="h-4 w-4 mr-1" />
                          Adjust
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => openHistoryDialog(item)}
                          className="hover:bg-green-50 hover:border-green-300 flex-1"
                        >
                          <History className="h-4 w-4 mr-1" />
                          History
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table Layout */}
                <div className="hidden lg:block overflow-x-auto">
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
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => openAdjustmentDialog(item)}
                                className="hover:bg-blue-50 hover:border-blue-300"
                              >
                                <ArrowUpDown className="h-4 w-4 mr-1" />
                                Adjust
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => openHistoryDialog(item)}
                                className="hover:bg-green-50 hover:border-green-300 ml-2"
                              >
                                <History className="h-4 w-4 mr-1" />
                                History
                              </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      
      {/* Stock Adjustment Dialog */}
      <Dialog open={adjustmentDialog.open} onOpenChange={closeAdjustmentDialog}>
        <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <ArrowUpDown className="h-5 w-5" />
              Stock Adjustment
            </DialogTitle>
            <DialogDescription className="text-sm">
              {adjustmentDialog.item && (
                <>Adjust stock untuk {adjustmentDialog.item.product.name} - {adjustmentDialog.item.size.name} {adjustmentDialog.item.color.name}</>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {adjustmentDialog.item && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Stock Sekarang</Label>
                  <Input
                    type="number"
                    value={adjustmentDialog.item.stock}
                    readOnly
                    className="bg-gray-50 font-semibold text-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Stock Baru</Label>
                  <Input
                    type="number"
                    value={adjustmentAmount}
                    readOnly
                    className="bg-gray-50 font-semibold text-lg"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Jumlah Adjustment</Label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <Select value={adjustmentType || ''} onValueChange={(value: 'INCREASE' | 'DECREASE') => {
                    setAdjustmentType(value);
                    if (adjustmentDialog.item) {
                      setAdjustmentAmount(adjustmentDialog.item.stock.toString());
                    }
                    setAdjustmentReason('');
                  }}>
                    <SelectTrigger className="w-full sm:w-32">
                      <SelectValue placeholder="Tipe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INCREASE">+ Tambah</SelectItem>
                      <SelectItem value="DECREASE">- Kurang</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Jumlah"
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      if (adjustmentDialog.item) {
                        if (adjustmentType === 'INCREASE') {
                          setAdjustmentAmount((adjustmentDialog.item.stock + value).toString());
                        } else if (adjustmentType === 'DECREASE') {
                          setAdjustmentAmount(Math.max(0, adjustmentDialog.item.stock - value).toString());
                        }
                      }
                    }}
                    className="flex-1"
                    disabled={!adjustmentType}
                  />
                </div>
                {!adjustmentType && (
                  <p className="text-xs text-muted-foreground">Pilih tipe adjustment terlebih dahulu</p>
                )}
              </div>

              <div>
                <Label htmlFor="adjustmentReason" className="text-sm font-medium">Alasan</Label>
                <Select value={adjustmentReason} onValueChange={setAdjustmentReason}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Pilih alasan adjustment" />
                  </SelectTrigger>
                  <SelectContent>
                    {adjustmentType && ADJUSTMENT_CATEGORIES[adjustmentType].map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        <div>
                          <div className="font-medium">{category.label}</div>
                          <div className="text-xs text-muted-foreground">{category.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(adjustmentReason === 'OTHER' || adjustmentReason === 'DATA_CORRECTION') && (
                <div>
                  <Label htmlFor="adjustmentNotes" className="text-sm font-medium">Catatan</Label>
                  <Textarea
                    id="adjustmentNotes"
                    placeholder="Jelaskan detail adjustment..."
                    value={adjustmentNotes}
                    onChange={(e) => setAdjustmentNotes(e.target.value)}
                    className="mt-1"
                    rows={3}
                  />
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={closeAdjustmentDialog} className="flex-1 w-full sm:w-auto">
                  Batal
                </Button>
                <Button 
                  onClick={handleStockAdjustment} 
                  disabled={!adjustmentType || !adjustmentReason || isProcessingAdjustment || 
                           parseInt(adjustmentAmount) === adjustmentDialog.item?.stock}
                  className="flex-1 w-full sm:w-auto"
                >
                  {isProcessingAdjustment ? 'Processing...' : 'Simpan Adjustment'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Adjustment History Dialog */}
      <Dialog open={historyDialog.open} onOpenChange={closeHistoryDialog}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <History className="h-5 w-5" />
              Riwayat Adjustment
            </DialogTitle>
            <DialogDescription className="text-sm">
              {historyDialog.item && (
                <>Riwayat adjustment untuk {historyDialog.item.product.name} - {historyDialog.item.size.name} {historyDialog.item.color.name}</>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-96 overflow-y-auto">
            {adjustmentHistory.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-muted-foreground">
                Belum ada riwayat adjustment untuk variant ini
              </div>
            ) : (
              <>
                {/* Mobile Card Layout */}
                <div className="block md:hidden space-y-3">
                  {adjustmentHistory.map((history) => (
                    <div key={history.id} className="bg-slate-50 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">
                          {new Date(history.createdAt).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        <Badge variant={history.adjustmentType === 'INCREASE' ? 'default' : 'secondary'}>
                          {history.adjustmentType === 'INCREASE' ? (
                            <><Plus className="h-3 w-3 mr-1" /> Tambah</>
                          ) : (
                            <><Minus className="h-3 w-3 mr-1" /> Kurang</>
                          )}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-slate-500">Jumlah</p>
                          <p className="font-medium">
                            {history.adjustmentType === 'INCREASE' ? '+' : '-'}{history.quantity}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">User</p>
                          <p className="text-sm">{history.user.name}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Alasan</p>
                        <p className="text-sm">
                          {ADJUSTMENT_CATEGORIES[history.adjustmentType].find(cat => cat.value === history.reason)?.label || history.reason}
                        </p>
                        {history.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{history.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table Layout */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Tipe</TableHead>
                        <TableHead>Jumlah</TableHead>
                        <TableHead>Alasan</TableHead>
                        <TableHead>User</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {adjustmentHistory.map((history) => (
                        <TableRow key={history.id}>
                          <TableCell className="text-sm">
                            {new Date(history.createdAt).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </TableCell>
                          <TableCell>
                            <Badge variant={history.adjustmentType === 'INCREASE' ? 'default' : 'secondary'}>
                              {history.adjustmentType === 'INCREASE' ? (
                                <><Plus className="h-3 w-3 mr-1" /> Tambah</>
                              ) : (
                                <><Minus className="h-3 w-3 mr-1" /> Kurang</>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            {history.adjustmentType === 'INCREASE' ? '+' : '-'}{history.quantity}
                          </TableCell>
                          <TableCell className="text-sm">
                            <div>
                              {ADJUSTMENT_CATEGORIES[history.adjustmentType].find(cat => cat.value === history.reason)?.label || history.reason}
                            </div>
                            {history.notes && (
                              <div className="text-xs text-muted-foreground mt-1">{history.notes}</div>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">{history.user.name}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
