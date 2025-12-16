'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  ArrowLeft,
  Plus, 
  Trash2,
  Scan,
  Save,
  Package
} from 'lucide-react';
import { toast } from 'sonner';

interface Supplier {
  id: string;
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
}

interface ProductVariant {
  id: string;
  barcode: string;
  stock: number;
  isActive: boolean;
  product: {
    id: string;
    name: string;
    sku: string;
    costPrice: number;
    sellingPrice: number;
    isActive: boolean;
    category: {
      name: string;
    };
    brand: {
      name: string;
    };
  };
  size: {
    name: string;
  };
  color: {
    name: string;
    hexCode?: string;
  };
}

interface PurchaseItem {
  variantId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  variant: ProductVariant;
}

export default function NewProductionOrderPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Scanner states
  const [isScannerActive, setIsScannerActive] = useState(true); // Default ON
  const [scannedVariant, setScannedVariant] = useState<ProductVariant | null>(null);
  const [scanQuantity, setScanQuantity] = useState('1');
  const [isQuantityDialogOpen, setIsQuantityDialogOpen] = useState(false);
  const scannerBufferRef = useRef('');
  const scannerTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load items from localStorage on mount
  useEffect(() => {
    const savedItems = localStorage.getItem('production_order_items');
    if (savedItems) {
      try {
        const items = JSON.parse(savedItems);
        setPurchaseItems(items);
        toast.success(`Loaded ${items.length} item(s) dari scan sebelumnya`);
      } catch (error) {
        console.error('Error loading saved items:', error);
      }
    }
  }, []);

  // Save items to localStorage whenever they change
  useEffect(() => {
    if (purchaseItems.length > 0) {
      localStorage.setItem('production_order_items', JSON.stringify(purchaseItems));
    }
  }, [purchaseItems]);

  // Fetch suppliers
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const response = await fetch('/api/suppliers');
        if (response.ok) {
          const data = await response.json();
          setSuppliers(data.suppliers || []);
        }
      } catch (error) {
        console.error('Error fetching suppliers:', error);
      }
    };
    fetchSuppliers();
  }, []);

  // Barcode Scanner Logic
  useEffect(() => {
    if (!isScannerActive) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      // Handle Enter key - process the buffer
      if (e.key === 'Enter') {
        e.preventDefault();
        if (scannerBufferRef.current.length > 0) {
          console.log('✅ Scanner: Enter pressed, buffer:', scannerBufferRef.current);
          handleBarcodeScanned(scannerBufferRef.current.trim());
          scannerBufferRef.current = '';
        }
        return;
      }

      // Accumulate characters
      if (e.key.length === 1) {
        scannerBufferRef.current += e.key;
        
        // Reset timeout
        if (scannerTimeoutRef.current) {
          clearTimeout(scannerTimeoutRef.current);
        }
        
        // Auto-reset buffer after 100ms of no input
        scannerTimeoutRef.current = setTimeout(() => {
          if (scannerBufferRef.current.length > 0) {
            console.log('⏱️ Scanner timeout - resetting buffer');
            scannerBufferRef.current = '';
          }
        }, 100);
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => {
      window.removeEventListener('keypress', handleKeyPress);
      if (scannerTimeoutRef.current) {
        clearTimeout(scannerTimeoutRef.current);
      }
    };
  }, [isScannerActive]);

  const handleBarcodeScanned = useCallback(async (barcode: string) => {
    console.log('🔍 handleBarcodeScanned called with:', barcode);

    try {
      console.log('📡 Fetching from API:', `/api/pos/search?search=${encodeURIComponent(barcode)}`);
      const response = await fetch(`/api/pos/search?search=${encodeURIComponent(barcode)}`);
      const data = await response.json();

      console.log('📦 API Response:', data);

      if (!response.ok || !data.variants || data.variants.length === 0) {
        console.log('❌ Product not found');
        toast.error(`Produk dengan barcode ${barcode} tidak ditemukan`);
        return;
      }

      const variant = data.variants[0];
      console.log('✅ Found variant:', variant);

      if (variant.barcode && variant.barcode.toLowerCase() !== barcode.toLowerCase()) {
        console.log('⚠️ Barcode mismatch');
        toast.error(`Barcode tidak cocok. Dicari: ${barcode}, Ditemukan: ${variant.barcode}`);
        return;
      }

      console.log('🎯 Opening quantity dialog for:', variant.product.name);
      setScannedVariant(variant);
      setScanQuantity('1');
      setIsQuantityDialogOpen(true);
      console.log('✅ Quantity dialog should be open now');

    } catch (error) {
      console.error('❌ Error searching product:', error);
      toast.error('Gagal mencari produk');
    }
  }, []);

  const handleAddScannedItem = () => {
    if (!scannedVariant) return;

    const quantity = parseInt(scanQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      toast.error('Quantity harus lebih dari 0');
      return;
    }

    const existingItem = purchaseItems.find(item => item.variantId === scannedVariant.id);

    if (existingItem) {
      setPurchaseItems(purchaseItems.map(item => 
        item.variantId === scannedVariant.id 
          ? { ...item, quantity: item.quantity + quantity }
          : item
      ));
      toast.success(`${scannedVariant.product.name} quantity ditambah ${quantity} (Total: ${existingItem.quantity + quantity})`);
    } else {
      setPurchaseItems(prev => [...prev, {
        variantId: scannedVariant.id,
        productId: scannedVariant.product.id,
        quantity: quantity,
        unitPrice: Number(scannedVariant.product.costPrice),
        variant: scannedVariant
      }]);
      toast.success(`${scannedVariant.product.name} (${quantity} pcs) ditambahkan ke production order`);
    }

    setIsQuantityDialogOpen(false);
    setScannedVariant(null);
    setScanQuantity('1');
  };

  const removeItem = (variantId: string) => {
    setPurchaseItems(prev => prev.filter(item => item.variantId !== variantId));
    toast.success('Item dihapus dari production order');
  };

  const updateQuantity = (variantId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(variantId);
      return;
    }
    setPurchaseItems(prev => 
      prev.map(item => 
        item.variantId === variantId 
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  const getTotalAmount = () => {
    return purchaseItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const handleSave = async () => {
    if (purchaseItems.length === 0) {
      toast.error('Tambahkan minimal satu produk');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: selectedSupplier || undefined,
          items: purchaseItems.map(item => ({
            variantId: item.variantId,
            quantity: item.quantity,
            unitPrice: item.unitPrice
          })),
          notes: notes.trim() || undefined
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Production Order ${data.purchase.invoiceNumber} berhasil dibuat!`);
        
        // Clear localStorage
        localStorage.removeItem('production_order_items');
        
        // Redirect back to purchases page
        router.push('/purchases');
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Gagal membuat production order');
      }
    } catch (error) {
      console.error('Error creating purchase:', error);
      toast.error('Gagal membuat production order');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (purchaseItems.length > 0) {
      if (confirm('Anda memiliki items yang belum disimpan. Yakin ingin kembali?')) {
        localStorage.removeItem('production_order_items');
        router.push('/purchases');
      }
    } else {
      router.push('/purchases');
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCancel}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Buat Production Order Baru</h1>
              <p className="text-sm text-muted-foreground">
                Scan barcode atau tambahkan produk secara manual
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={isScannerActive ? "default" : "outline"}
              size="lg"
              onClick={() => setIsScannerActive(!isScannerActive)}
            >
              <Scan className={`h-4 w-4 mr-2 ${isScannerActive ? 'animate-pulse' : ''}`} />
              {isScannerActive ? 'Scanner ON' : 'Scanner OFF'}
            </Button>
          </div>
        </div>

        {/* Scanner Status */}
        {isScannerActive && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-blue-700">
                <Scan className="h-5 w-5 animate-pulse" />
                <span className="font-medium">Scanner Barcode Aktif - Scan untuk tambah item</span>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Side - Form */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Informasi Production Order</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Supplier (Opsional)</Label>
                  <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Tanpa Supplier</SelectItem>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Catatan Produksi</Label>
                  <Textarea
                    placeholder="Catatan untuk produksi ini..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="min-h-[120px]"
                  />
                </div>

                <div className="pt-4 border-t space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Items:</span>
                    <span className="font-semibold">{purchaseItems.reduce((sum, item) => sum + item.quantity, 0)} pcs</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Products:</span>
                    <span className="font-semibold">{purchaseItems.length} items</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total Biaya:</span>
                    <span className="text-blue-600">
                      Rp {getTotalAmount().toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={handleSave}
                  disabled={isSaving || purchaseItems.length === 0}
                  className="w-full"
                  size="lg"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Menyimpan...' : 'Complete Production Order'}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="w-full"
                >
                  Batal
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Side - Items List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Items Production Order ({purchaseItems.length})</CardTitle>
                  <Package className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                {purchaseItems.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">
                      Belum ada item
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {isScannerActive 
                        ? 'Scan barcode untuk menambahkan produk'
                        : 'Aktifkan scanner untuk mulai scan produk'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Desktop Table View */}
                    <div className="hidden md:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Produk</TableHead>
                            <TableHead>Varian</TableHead>
                            <TableHead className="text-right">Harga</TableHead>
                            <TableHead className="text-center">Qty</TableHead>
                            <TableHead className="text-right">Subtotal</TableHead>
                            <TableHead className="text-center">Aksi</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {purchaseItems.map((item) => (
                            <TableRow key={item.variantId}>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{item.variant.product.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    SKU: {item.variant.product.sku}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Badge variant="outline">{item.variant.size.name}</Badge>
                                  <Badge variant="outline">{item.variant.color.name}</Badge>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                Rp {item.unitPrice.toLocaleString('id-ID')}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                                  >
                                    -
                                  </Button>
                                  <Input
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) => updateQuantity(item.variantId, parseInt(e.target.value) || 0)}
                                    className="w-16 text-center"
                                  />
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                                  >
                                    +
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                Rp {(item.quantity * item.unitPrice).toLocaleString('id-ID')}
                              </TableCell>
                              <TableCell className="text-center">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeItem(item.variantId)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-3">
                      {purchaseItems.map((item) => (
                        <Card key={item.variantId}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex-1">
                                <h4 className="font-semibold">{item.variant.product.name}</h4>
                                <p className="text-xs text-muted-foreground">SKU: {item.variant.product.sku}</p>
                                <div className="flex gap-1 mt-2">
                                  <Badge variant="outline">{item.variant.size.name}</Badge>
                                  <Badge variant="outline">{item.variant.color.name}</Badge>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeItem(item.variantId)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Harga:</span>
                                <span>Rp {item.unitPrice.toLocaleString('id-ID')}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Quantity:</span>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                                  >
                                    -
                                  </Button>
                                  <span className="w-12 text-center font-semibold">{item.quantity}</span>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                                  >
                                    +
                                  </Button>
                                </div>
                              </div>
                              <div className="flex justify-between font-semibold pt-2 border-t">
                                <span>Subtotal:</span>
                                <span className="text-blue-600">
                                  Rp {(item.quantity * item.unitPrice).toLocaleString('id-ID')}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Quantity Input Dialog After Scan */}
      <Dialog open={isQuantityDialogOpen} onOpenChange={setIsQuantityDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Tambah ke Production Order</DialogTitle>
          </DialogHeader>
          
          {scannedVariant && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="font-medium text-base">
                  {scannedVariant.product.name}
                </div>
                <div className="text-sm text-muted-foreground">
                  {scannedVariant.size.name} • {scannedVariant.color.name}
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">SKU:</span>{' '}
                  <span className="font-mono">{scannedVariant.product.sku}</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Harga Produksi:</span>{' '}
                  <span className="font-semibold text-blue-600">
                    Rp {Number(scannedVariant.product.costPrice).toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Stok Saat Ini:</span>{' '}
                  <Badge variant={scannedVariant.stock > 10 ? "default" : "destructive"}>
                    {scannedVariant.stock} pcs
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="scan-quantity">Jumlah yang Ditambahkan</Label>
                <Input
                  id="scan-quantity"
                  type="number"
                  min="1"
                  value={scanQuantity}
                  onChange={(e) => setScanQuantity(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddScannedItem();
                    }
                  }}
                  className="text-lg font-semibold text-center"
                  placeholder="Masukkan jumlah..."
                />
                <p className="text-xs text-muted-foreground text-center">
                  Tekan Enter atau klik OK untuk menambahkan
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsQuantityDialogOpen(false);
                setScannedVariant(null);
                setScanQuantity('1');
              }}
              className="w-full sm:w-auto"
            >
              Batal
            </Button>
            <Button
              onClick={handleAddScannedItem}
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Tambahkan ke Production
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
