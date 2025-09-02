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
import { Package, AlertTriangle, TrendingUp, TrendingDown, Settings } from 'lucide-react';
import { toast } from 'sonner';

interface StockAdjustment {
  variantId: string;
  productName: string;
  variantName: string;
  currentStock: number;
  newStock: number;
  reason: string;
  type: 'IN' | 'OUT';
}

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

export default function StockAdjustmentPage() {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [newStock, setNewStock] = useState('');
  const [reason, setReason] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<'manual' | 'preset'>('manual');
  const [isProcessing, setIsProcessing] = useState(false);

  // Preset reasons
  const presetReasons = [
    'Koreksi perhitungan fisik',
    'Barang rusak/cacat',
    'Barang hilang',
    'Return dari customer',
    'Barang kadaluarsa',
    'Transfer antar gudang',
    'Lainnya'
  ];

  useEffect(() => {
    fetchVariants();
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
      toast.error('Gagal memuat data varian');
    } finally {
      setLoading(false);
    }
  };

  const openAdjustmentDialog = (variant: ProductVariant) => {
    setSelectedVariant(variant);
    setNewStock(variant.stock.toString());
    setReason('');
    setAdjustmentType('manual');
    setAdjustmentDialogOpen(true);
  };

  const handleStockAdjustment = async () => {
    if (!selectedVariant) return;

    const stockValue = parseInt(newStock);
    if (isNaN(stockValue) || stockValue < 0) {
      toast.error('Jumlah stok harus berupa angka positif');
      return;
    }

    if (stockValue === selectedVariant.stock) {
      toast.error('Stok baru sama dengan stok saat ini');
      return;
    }

    if (!reason.trim()) {
      toast.error('Alasan penyesuaian stok harus diisi');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/inventory/adjust-stock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          variantId: selectedVariant.id,
          newStock: stockValue,
          reason: reason.trim(),
          userId: 'current-user-id' // TODO: Get from auth
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Stok berhasil disesuaikan');
        setAdjustmentDialogOpen(false);
        fetchVariants(); // Refresh data
      } else {
        toast.error(data.error || 'Gagal menyesuaikan stok');
      }
    } catch (error) {
      console.error('Error adjusting stock:', error);
      toast.error('Gagal menyesuaikan stok');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStockStatus = (stock: number, minStock: number) => {
    if (stock === 0) return { label: 'Habis', color: 'bg-red-500' };
    if (stock <= minStock) return { label: 'Rendah', color: 'bg-yellow-500' };
    return { label: 'Normal', color: 'bg-green-500' };
  };

  const stockDifference = selectedVariant && newStock ? 
    parseInt(newStock) - selectedVariant.stock : 0;

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <div className="text-sm text-muted-foreground">Memuat data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Penyesuaian Stok</h1>
        <p className="text-muted-foreground">
          Kelola penyesuaian stok inventory dengan audit trail yang lengkap
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Daftar Varian Produk
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2">Produk</th>
                  <th className="text-left py-3 px-2">Varian</th>
                  <th className="text-center py-3 px-2">Stok Saat Ini</th>
                  <th className="text-center py-3 px-2">Min. Stok</th>
                  <th className="text-center py-3 px-2">Status</th>
                  <th className="text-center py-3 px-2">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((variant) => {
                  const status = getStockStatus(variant.stock, variant.minStock);
                  return (
                    <tr key={variant.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-2">
                        <div>
                          <div className="font-medium">{variant.product.name}</div>
                          <div className="text-sm text-muted-foreground">{variant.product.sku}</div>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          {variant.color.hexCode && (
                            <div 
                              className="w-4 h-4 rounded-full border"
                              style={{ backgroundColor: variant.color.hexCode }}
                            />
                          )}
                          <span>{variant.size.name} - {variant.color.name}</span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-2">
                        <span className={`font-bold ${
                          variant.stock <= variant.minStock ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {variant.stock}
                        </span>
                      </td>
                      <td className="text-center py-3 px-2">{variant.minStock}</td>
                      <td className="text-center py-3 px-2">
                        <Badge variant="secondary" className={`${status.color} text-white`}>
                          {status.label}
                        </Badge>
                      </td>
                      <td className="text-center py-3 px-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAdjustmentDialog(variant)}
                        >
                          <Settings className="h-4 w-4 mr-1" />
                          Sesuaikan
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Stock Adjustment Dialog */}
      <Dialog open={adjustmentDialogOpen} onOpenChange={setAdjustmentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Penyesuaian Stok</DialogTitle>
          </DialogHeader>
          
          {selectedVariant && (
            <div className="space-y-4">
              {/* Product Info */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-medium">{selectedVariant.product.name}</div>
                <div className="text-sm text-muted-foreground">
                  {selectedVariant.size.name} - {selectedVariant.color.name}
                </div>
                <div className="text-sm">
                  Stok saat ini: <span className="font-bold">{selectedVariant.stock}</span>
                </div>
              </div>

              {/* New Stock Input */}
              <div className="space-y-2">
                <Label>Stok Baru</Label>
                <Input
                  type="number"
                  min="0"
                  value={newStock}
                  onChange={(e) => setNewStock(e.target.value)}
                  placeholder="Masukkan jumlah stok baru"
                />
                
                {/* Stock Change Indicator */}
                {stockDifference !== 0 && (
                  <div className={`text-sm flex items-center gap-1 ${
                    stockDifference > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stockDifference > 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    {stockDifference > 0 ? '+' : ''}{stockDifference} unit
                  </div>
                )}
              </div>

              {/* Reason Selection */}
              <div className="space-y-2">
                <Label>Jenis Alasan</Label>
                <Select value={adjustmentType} onValueChange={(value: 'manual' | 'preset') => setAdjustmentType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preset">Pilih dari daftar</SelectItem>
                    <SelectItem value="manual">Tulis manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Reason Input */}
              <div className="space-y-2">
                <Label>Alasan Penyesuaian *</Label>
                {adjustmentType === 'preset' ? (
                  <Select value={reason} onValueChange={setReason}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih alasan..." />
                    </SelectTrigger>
                    <SelectContent>
                      {presetReasons.map((presetReason) => (
                        <SelectItem key={presetReason} value={presetReason}>
                          {presetReason}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Jelaskan alasan penyesuaian stok..."
                    className="resize-none"
                  />
                )}
              </div>

              {/* Warning for stock changes */}
              {stockDifference !== 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <div className="font-medium">Perhatian!</div>
                      <div>
                        Penyesuaian ini akan {stockDifference > 0 ? 'menambah' : 'mengurangi'} stok 
                        sebanyak {Math.abs(stockDifference)} unit dan akan dicatat dalam audit trail.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setAdjustmentDialogOpen(false)}
                  className="flex-1"
                >
                  Batal
                </Button>
                <Button 
                  onClick={handleStockAdjustment}
                  disabled={isProcessing || stockDifference === 0 || !reason.trim()}
                  className="flex-1"
                >
                  {isProcessing ? 'Memproses...' : 'Sesuaikan Stok'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
