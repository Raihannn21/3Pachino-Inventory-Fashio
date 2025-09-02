'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Package, AlertTriangle, TrendingUp, TrendingDown, Settings, History, Plus, Minus, ArrowUpDown, Search } from 'lucide-react';
import { toast } from 'sonner';

interface StockAdjustment {
  variantId: string;
  productName: string;
  variantName: string;
  currentStock: number;
  newStock: number;
  adjustmentType: 'INCREASE' | 'DECREASE';
  category: string;
  notes?: string;
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

interface ProductVariant {
  id: string;
  stock: number;
  minStock: number;
  barcode?: string;
  product: {
    id: string;
    name: string;
    sku: string;
  };
  size: {
    name: string;
  };
  color: {
    name: string;
    hexCode?: string;
  };
}

interface AdjustmentHistoryItem {
  id: string;
  adjustmentType: 'INCREASE' | 'DECREASE';
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  notes?: string;
  createdAt: string;
  variant: {
    product: {
      name: string;
    };
    size: {
      name: string;
    };
    color: {
      name: string;
    };
  };
  user: {
    name: string;
  };
}

export default function StockAdjustmentPage() {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [adjustmentHistory, setAdjustmentHistory] = useState<AdjustmentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [newStock, setNewStock] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<'INCREASE' | 'DECREASE' | ''>('');
  const [stockDifference, setStockDifference] = useState(0);
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [reasonFilter, setReasonFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchVariants();
    fetchAdjustmentHistory();
  }, []);

  const fetchVariants = async () => {
    try {
      const response = await fetch('/api/inventory/variants');
      const data = await response.json();
      if (response.ok) {
        setVariants(data.variants);
      }
    } catch (error) {
      console.error('Error fetching variants:', error);
      toast.error('Gagal memuat data variant');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdjustmentHistory = async () => {
    try {
      setHistoryLoading(true);
      const response = await fetch('/api/stock-adjustments');
      const data = await response.json();
      if (response.ok) {
        setAdjustmentHistory(data.adjustments || []);
      }
    } catch (error) {
      console.error('Error fetching adjustment history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Filter adjustment history based on type and reason
  const filteredAdjustmentHistory = adjustmentHistory.filter(item => {
    if (typeFilter !== 'ALL' && item.adjustmentType !== typeFilter) {
      return false;
    }
    if (reasonFilter !== 'ALL' && item.reason !== reasonFilter) {
      return false;
    }
    return true;
  });

  // Filter variants based on search query
  const filteredVariants = variants.filter(variant => {
    if (!searchQuery) return true;
    
    const searchLower = searchQuery.toLowerCase();
    const productName = variant.product.name.toLowerCase();
    const sizeName = variant.size.name.toLowerCase();
    const colorName = variant.color.name.toLowerCase();
    const barcode = variant.barcode?.toLowerCase() || '';
    
    return productName.includes(searchLower) ||
           sizeName.includes(searchLower) ||
           colorName.includes(searchLower) ||
           barcode.includes(searchLower) ||
           `${productName} ${sizeName} ${colorName}`.includes(searchLower);
  });

  // Get all unique reasons for filter options
  const getAllReasons = () => {
    const allReasons = [...ADJUSTMENT_CATEGORIES.INCREASE, ...ADJUSTMENT_CATEGORIES.DECREASE];
    return allReasons.filter((reason, index, self) => 
      index === self.findIndex(r => r.value === reason.value)
    );
  };

  const openAdjustmentDialog = (variant: ProductVariant) => {
    setSelectedVariant(variant);
    setNewStock(variant.stock.toString());
    setAdjustmentType('');
    setStockDifference(0);
    setCategory('');
    setNotes('');
    setAdjustmentDialogOpen(true);
  };

  const closeAdjustmentDialog = () => {
    setAdjustmentDialogOpen(false);
    setSelectedVariant(null);
    setNewStock('');
    setAdjustmentType('');
    setStockDifference(0);
    setCategory('');
    setNotes('');
  };

  const handleStockChange = (value: string) => {
    setNewStock(value);
    if (selectedVariant) {
      const currentStock = selectedVariant.stock;
      const newStockValue = parseInt(value) || 0;
      
      if (newStockValue > currentStock) {
        setAdjustmentType('INCREASE');
      } else if (newStockValue < currentStock) {
        setAdjustmentType('DECREASE');
      } else {
        setAdjustmentType('');
      }
      
      // Reset category when adjustment type changes
      setCategory('');
    }
  };

  const handleStockAdjustment = async () => {
    if (!selectedVariant || !adjustmentType || !category) {
      toast.error('Mohon lengkapi semua field yang diperlukan');
      return;
    }

    const currentStock = selectedVariant.stock;
    const newStockValue = parseInt(newStock) || 0;
    const stockDifference = Math.abs(newStockValue - currentStock);

    if (stockDifference === 0) {
      toast.error('Stock tidak berubah');
      return;
    }

    setIsProcessing(true);

    try {
      const adjustmentData = {
        variantId: selectedVariant.id,
        adjustmentType,
        quantity: stockDifference,
        previousStock: currentStock,
        newStock: newStockValue,
        reason: category,
        notes: notes.trim() || undefined
      };

      const response = await fetch('/api/stock-adjustments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(adjustmentData),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Stock berhasil disesuaikan');
        
        // Refresh data
        await fetchVariants();
        await fetchAdjustmentHistory();
        
        closeAdjustmentDialog();

        // Show special message for production
        if (category === 'PRODUCTION') {
          toast.info('📋 Catatan produksi telah dibuat secara otomatis');
        }
      } else {
        toast.error(result.error || 'Gagal menyesuaikan stock');
      }
    } catch (error) {
      console.error('Error adjusting stock:', error);
      toast.error('Terjadi kesalahan saat menyesuaikan stock');
    } finally {
      setIsProcessing(false);
    }
  };

  const getVariantDisplay = (variant: ProductVariant) => {
    return `${variant.product.name} - ${variant.size.name}/${variant.color.name}`;
  };

  const getStockStatus = (variant: ProductVariant) => {
    if (variant.stock <= 0) {
      return <Badge variant="destructive">Habis</Badge>;
    } else if (variant.stock <= variant.minStock) {
      return <Badge variant="secondary">Stock Rendah</Badge>;
    } else {
      return <Badge variant="default">Normal</Badge>;
    }
  };

  const getAdjustmentIcon = (type: 'INCREASE' | 'DECREASE') => {
    return type === 'INCREASE' ? 
      <TrendingUp className="h-4 w-4 text-green-600" /> : 
      <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  const getCategoryLabel = (reason: string) => {
    const allCategories = [...ADJUSTMENT_CATEGORIES.INCREASE, ...ADJUSTMENT_CATEGORIES.DECREASE];
    const category = allCategories.find(cat => cat.value === reason);
    return category ? category.label : reason;
  };

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto p-6">
        {/* Header Skeleton */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-4 w-64 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
          </div>

          {/* Loading Animation Center */}
          <div className="flex items-center justify-center mb-8">
            <div className="text-center">
              <div className="relative mb-4">
                <ArrowUpDown className="h-16 w-16 mx-auto text-blue-600 animate-pulse" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Memuat Stock Adjustments</h2>
              <p className="text-sm text-gray-600">Mengambil data penyesuaian stock...</p>
              <div className="flex items-center justify-center mt-4 space-x-1">
                <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce"></div>
                <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
          </div>

          {/* Cards Skeleton */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="h-6 w-40 bg-gray-200 rounded animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gray-100 rounded animate-pulse flex items-center justify-center">
                <Settings className="h-12 w-12 text-gray-300" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Stock Adjustments</h1>
            <p className="text-muted-foreground">
              Kelola penyesuaian stock dengan audit trail lengkap
            </p>
          </div>
          <Button
            variant={showHistory ? "default" : "outline"}
            onClick={() => setShowHistory(!showHistory)}
          >
            <History className="h-4 w-4 mr-2" />
            {showHistory ? 'Sembunyikan' : 'Lihat'} Riwayat
          </Button>
        </div>

        {/* History Section */}
        {showHistory && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Riwayat Adjustment
              </CardTitle>
              <div className="flex gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="typeFilter" className="text-sm font-medium">Tipe:</Label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Pilih tipe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">🔄 Semua Tipe</SelectItem>
                      <SelectItem value="INCREASE">📈 Penambahan (+)</SelectItem>
                      <SelectItem value="DECREASE">📉 Pengurangan (-)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="reasonFilter" className="text-sm font-medium">Alasan:</Label>
                  <Select value={reasonFilter} onValueChange={setReasonFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Pilih alasan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">📋 Semua Alasan</SelectItem>
                      {getAllReasons().map((reason) => (
                        <SelectItem key={reason.value} value={reason.value}>
                          {reason.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <Badge variant="outline" className="text-xs">
                    {filteredAdjustmentHistory.length} dari {adjustmentHistory.length} record
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Memuat riwayat...
                </div>
              ) : filteredAdjustmentHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {adjustmentHistory.length === 0 ? 'Belum ada riwayat adjustment' : 'Tidak ada data yang sesuai dengan filter'}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal & Waktu</TableHead>
                      <TableHead>Produk</TableHead>
                      <TableHead>Varian</TableHead>
                      <TableHead>Adjustment</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Alasan</TableHead>
                      <TableHead>Catatan</TableHead>
                      <TableHead>User</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAdjustmentHistory.map((adjustment) => (
                      <TableRow key={adjustment.id}>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">
                              {new Date(adjustment.createdAt).toLocaleDateString('id-ID', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </div>
                            <div className="text-muted-foreground">
                              {new Date(adjustment.createdAt).toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{adjustment.variant.product.name}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Badge variant="outline" className="text-xs">
                              {adjustment.variant.size.name}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {adjustment.variant.color.name}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getAdjustmentIcon(adjustment.adjustmentType)}
                            <span className={`font-semibold ${adjustment.adjustmentType === 'INCREASE' ? 'text-green-600' : 'text-red-600'}`}>
                              {adjustment.adjustmentType === 'INCREASE' ? '+' : '-'}{adjustment.quantity}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <span className="text-muted-foreground">{adjustment.previousStock}</span>
                            <span className="mx-2 text-muted-foreground">→</span>
                            <span className="font-semibold">{adjustment.newStock}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {getCategoryLabel(adjustment.reason)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground max-w-[150px] truncate">
                            {adjustment.notes || '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">{adjustment.user.name}</div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {/* Variants List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Product Variants
              <Badge variant="secondary" className="ml-auto">
                {filteredVariants.length} dari {variants.length} variants
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-4 mt-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Cari nama produk, size, warna, atau barcode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              {searchQuery && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                >
                  Clear
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                Memuat data...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[250px]">Produk</TableHead>
                      <TableHead className="w-[150px]">Varian</TableHead>
                      <TableHead className="w-[120px]">SKU/Barcode</TableHead>
                      <TableHead className="w-[100px] text-center">Stock</TableHead>
                      <TableHead className="w-[80px] text-center">Min</TableHead>
                      <TableHead className="w-[100px] text-center">Status</TableHead>
                      <TableHead className="w-[100px] text-center">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVariants.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          {variants.length === 0 ? (
                            <div className="text-muted-foreground">
                              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <div className="text-lg font-medium">Belum ada produk</div>
                              <div className="text-sm">Tambahkan produk terlebih dahulu untuk melakukan stock adjustment</div>
                            </div>
                          ) : (
                            <div className="text-muted-foreground">
                              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <div className="text-lg font-medium">Tidak ada hasil</div>
                              <div className="text-sm">Tidak ditemukan produk yang sesuai dengan pencarian "{searchQuery}"</div>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredVariants.map((variant) => (
                      <TableRow key={variant.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div>
                            <div className="font-medium text-gray-900">{variant.product.name}</div>
                            <div className="text-sm text-gray-500">{variant.product.sku}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Badge variant="outline" className="text-xs font-medium">
                              {variant.size.name}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className="text-xs font-medium"
                              style={{ 
                                backgroundColor: variant.color.hexCode || '#e5e7eb',
                                color: variant.color.hexCode ? '#ffffff' : '#374151',
                                borderColor: variant.color.hexCode || '#d1d5db'
                              }}
                            >
                              {variant.color.name}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm text-gray-600">
                            {variant.barcode || '-'}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-bold text-lg text-gray-900">{variant.stock}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-gray-500">{variant.minStock}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          {getStockStatus(variant)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openAdjustmentDialog(variant)}
                            className="hover:bg-blue-50 hover:border-blue-300"
                          >
                            <Settings className="h-4 w-4 mr-1" />
                            Adjust
                          </Button>
                        </TableCell>
                      </TableRow>
                    )))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Adjustment Dialog */}
        <Dialog open={adjustmentDialogOpen} onOpenChange={setAdjustmentDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Stock Adjustment</DialogTitle>
            </DialogHeader>

            {selectedVariant && (
              <div className="space-y-6">
                {/* Product Info */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium">{getVariantDisplay(selectedVariant)}</h3>
                  <p className="text-sm text-muted-foreground">
                    Stock saat ini: <span className="font-semibold">{selectedVariant.stock}</span>
                  </p>
                </div>

                {/* Stock Information */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Current Stock (Read-only) */}
                  <div className="space-y-2">
                    <Label>Stock Sekarang</Label>
                    <Input
                      type="number"
                      value={selectedVariant.stock}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>

                  {/* New Stock (Calculated, Read-only) */}
                  <div className="space-y-2">
                    <Label>Stock Baru</Label>
                    <Input
                      type="number"
                      value={newStock}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>
                </div>

                {/* Adjustment Quantity Input */}
                <div className="space-y-2">
                  <Label>Jumlah Adjustment</Label>
                  <div className="flex items-center space-x-2">
                    <Select value={adjustmentType || ''} onValueChange={(value: 'INCREASE' | 'DECREASE') => {
                      setAdjustmentType(value);
                      setStockDifference(0);
                      setNewStock(selectedVariant.stock.toString());
                    }}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Tipe" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INCREASE">+</SelectItem>
                        <SelectItem value="DECREASE">-</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min="0"
                      value={stockDifference || ''}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 0;
                        setStockDifference(value);
                        if (adjustmentType === 'INCREASE') {
                          setNewStock((selectedVariant.stock + value).toString());
                        } else if (adjustmentType === 'DECREASE') {
                          setNewStock(Math.max(0, selectedVariant.stock - value).toString());
                        }
                      }}
                      placeholder="Masukkan jumlah"
                      className="flex-1"
                    />
                  </div>
                  {stockDifference > 0 && adjustmentType && (
                    <div className={`text-sm ${adjustmentType === 'INCREASE' ? 'text-green-600' : 'text-red-600'}`}>
                      {adjustmentType === 'INCREASE' ? 'Menambah' : 'Mengurangi'} {stockDifference} item
                    </div>
                  )}
                </div>

                {/* Category Selection */}
                {adjustmentType && (
                  <div className="space-y-2">
                    <Label>Alasan Adjustment</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih alasan adjustment" />
                      </SelectTrigger>
                      <SelectContent>
                        {ADJUSTMENT_CATEGORIES[adjustmentType].map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            <div>
                              <div>{cat.label}</div>
                              <div className="text-xs text-muted-foreground">{cat.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Notes */}
                <div className="space-y-2">
                  <Label>Catatan (Opsional)</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Tambahkan catatan tambahan..."
                    rows={3}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={closeAdjustmentDialog}>
                    Batal
                  </Button>
                  <Button
                    onClick={handleStockAdjustment}
                    disabled={isProcessing || stockDifference === 0 || !category}
                    className="flex-1"
                  >
                    {isProcessing ? 'Memproses...' : 'Simpan Adjustment'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
