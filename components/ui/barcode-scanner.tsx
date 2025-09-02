'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Scan, Search, Package } from 'lucide-react';

interface ProductVariant {
  id: string;
  barcode: string;
  stock: number;
  minStock: number;
  size: {
    name: string;
  };
  color: {
    name: string;
  };
  product: {
    id: string;
    name: string;
    sku: string;
    costPrice: number;
    sellingPrice: number;
    category: {
      name: string;
    };
    brand: {
      name: string;
    };
  };
}

interface BarcodeScannerProps {
  onProductFound?: (variant: ProductVariant) => void;
  showAddToCart?: boolean;
}

export default function BarcodeScanner({ onProductFound, showAddToCart = false }: BarcodeScannerProps) {
  const [open, setOpen] = useState(false);
  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProductVariant | null>(null);
  const [error, setError] = useState('');

  const handleScan = async () => {
    if (!barcode.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch(`/api/barcode/scan?barcode=${encodeURIComponent(barcode.trim())}`);
      
      if (response.ok) {
        const data = await response.json();
        setResult(data);
        onProductFound?.(data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Produk tidak ditemukan');
      }
    } catch (error) {
      console.error('Error scanning barcode:', error);
      setError('Gagal memindai barcode');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleScan();
    }
  };

  const resetScanner = () => {
    setBarcode('');
    setResult(null);
    setError('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Scan className="h-4 w-4 mr-2" />
          Scan Barcode
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Scan Barcode Produk</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Barcode Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Barcode / QR Code</label>
            <div className="flex gap-2">
              <Input
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Masukkan atau scan barcode..."
                className="flex-1"
                autoFocus
              />
              <Button onClick={handleScan} disabled={loading || !barcode.trim()}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Result */}
          {result && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{result.product.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  SKU: {result.product.sku} • {result.product.category.name}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Variant:</p>
                    <p>{result.size.name} - {result.color.name}</p>
                  </div>
                  <div>
                    <p className="font-medium">Stock:</p>
                    <p className={result.stock <= result.minStock ? 'text-red-600' : 'text-green-600'}>
                      {result.stock} pcs
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Harga Jual:</p>
                    <p className="text-lg font-bold">
                      Rp {result.product.sellingPrice.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Barcode:</p>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded block">
                      {result.barcode}
                    </code>
                  </div>
                </div>

                {showAddToCart && (
                  <div className="pt-2">
                    <Button className="w-full" onClick={() => setOpen(false)}>
                      <Package className="h-4 w-4 mr-2" />
                      Tambah ke Keranjang
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          <div className="text-xs text-muted-foreground bg-blue-50 p-3 rounded">
            <p><strong>Cara menggunakan:</strong></p>
            <ul className="mt-1 space-y-1 list-disc list-inside">
              <li>Ketik atau scan barcode produk</li>
              <li>Tekan Enter atau klik tombol search</li>
              <li>Informasi produk akan ditampilkan</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={resetScanner} className="flex-1">
              Scan Lagi
            </Button>
            <Button onClick={() => setOpen(false)} className="flex-1">
              Tutup
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
