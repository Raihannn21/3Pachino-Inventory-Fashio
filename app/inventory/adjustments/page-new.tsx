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
import { Package, AlertTriangle, TrendingUp, TrendingDown, Settings, History, Plus, Minus } from 'lucide-react';
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

// Adjustment Categories
const ADJUSTMENT_CATEGORIES = {
  INCREASE: [
    { value: 'PRODUCTION', label: '🏭 Produksi', description: 'Barang hasil produksi baru' },
    { value: 'RETURN_FROM_CUSTOMER', label: '🔄 Return Customer', description: 'Barang dikembalikan customer' },
    { value: 'STOCK_CORRECTION', label: '📊 Koreksi Stock', description: 'Perbaikan data stock' },
    { value: 'FOUND_ITEMS', label: '🔍 Barang Ditemukan', description: 'Stock opname - barang lebih' },
    { value: 'OTHER_INCREASE', label: '📦 Lainnya (+)', description: 'Alasan lain penambahan stock' }
  ],
  DECREASE: [
    { value: 'DAMAGED_ITEMS', label: '💥 Barang Rusak', description: 'Barang cacat/rusak' },
    { value: 'RETURN_TO_SUPPLIER', label: '📤 Return Supplier', description: 'Dikembalikan ke supplier' },
    { value: 'LOST_ITEMS', label: '❌ Barang Hilang', description: 'Barang tidak ditemukan' },
    { value: 'SAMPLE_PROMOTION', label: '🎁 Sample/Promosi', description: 'Diberikan sebagai sample' },
    { value: 'STOCK_CORRECTION', label: '📊 Koreksi Stock', description: 'Perbaikan data stock' },
    { value: 'OTHER_DECREASE', label: '📦 Lainnya (-)', description: 'Alasan lain pengurangan stock' }
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
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

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

  const openAdjustmentDialog = (variant: ProductVariant) => {
    setSelectedVariant(variant);
    setNewStock(variant.stock.toString());
    setAdjustmentType('');
    setCategory('');
    setNotes('');
    setAdjustmentDialogOpen(true);
  };

  const closeAdjustmentDialog = () => {
    setAdjustmentDialogOpen(false);
    setSelectedVariant(null);
    setNewStock('');
    setAdjustmentType('');
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

  const stockDifference = selectedVariant ? Math.abs((parseInt(newStock) || 0) - selectedVariant.stock) : 0;

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
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Memuat riwayat...
                </div>
              ) : adjustmentHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Belum ada riwayat adjustment
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Produk</TableHead>
                      <TableHead>Tipe</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Alasan</TableHead>
                      <TableHead>User</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adjustmentHistory.map((adjustment) => (
                      <TableRow key={adjustment.id}>
                        <TableCell>
                          {new Date(adjustment.createdAt).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{adjustment.variant.product.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {adjustment.variant.size.name}/{adjustment.variant.color.name}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getAdjustmentIcon(adjustment.adjustmentType)}
                            <span className={adjustment.adjustmentType === 'INCREASE' ? 'text-green-600' : 'text-red-600'}>
                              {adjustment.adjustmentType === 'INCREASE' ? '+' : '-'}{adjustment.quantity}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-muted-foreground">{adjustment.previousStock}</span>
                          <span className="mx-2">→</span>
                          <span className="font-medium">{adjustment.newStock}</span>
                        </TableCell>
                        <TableCell>
                          {getCategoryLabel(adjustment.reason)}
                        </TableCell>
                        <TableCell>{adjustment.user.name}</TableCell>
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
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Memuat data...
              </div>
            ) : (
              <div className="space-y-4">
                {variants.map((variant) => (
                  <div
                    key={variant.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div>
                          <h3 className="font-medium">{variant.product.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {variant.size.name} / {variant.color.name} • SKU: {variant.product.sku}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-semibold">Stock: {variant.stock}</div>
                        <div className="text-sm text-muted-foreground">
                          Min: {variant.minStock}
                        </div>
                      </div>
                      {getStockStatus(variant)}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openAdjustmentDialog(variant)}
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        Adjust
                      </Button>
                    </div>
                  </div>
                ))}

                {variants.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Belum ada data variant produk
                  </div>
                )}
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

                {/* New Stock Input */}
                <div className="space-y-2">
                  <Label>Stock Baru</Label>
                  <Input
                    type="number"
                    min="0"
                    value={newStock}
                    onChange={(e) => handleStockChange(e.target.value)}
                    placeholder="Masukkan stock baru"
                  />
                  {stockDifference > 0 && adjustmentType && (
                    <div className={`text-sm ${adjustmentType === 'INCREASE' ? 'text-green-600' : 'text-red-600'}`}>
                      {adjustmentType === 'INCREASE' ? '+' : '-'}{stockDifference} dari stock saat ini
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
