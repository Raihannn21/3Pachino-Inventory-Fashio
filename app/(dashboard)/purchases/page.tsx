'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  Plus, 
  Eye, 
  Truck, 
  Package, 
  DollarSign, 
  Calendar,
  Minus,
  ShoppingCart,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
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
  variantId?: string;
  productId?: string;
  quantity: number;
  unitPrice: number;
  variant?: ProductVariant;
}

interface Purchase {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  notes?: string;
  status: string;
  transactionDate: string;
  supplier?: {
    name: string;
    contact?: string;
  } | null;
  items: any[];
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<ProductVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form states
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [notes, setNotes] = useState('');
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [productSearch, setProductSearch] = useState('');

  // Fetch data
  const fetchPurchases = async () => {
    try {
      const response = await fetch('/api/purchases');
      const data = await response.json();
      if (response.ok) {
        setPurchases(data.purchases);
      }
    } catch (error) {
      console.error('Error fetching purchases:', error);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('/api/suppliers');
      const data = await response.json();
      if (response.ok) {
        setSuppliers(data.suppliers);
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      // Include inactive products for production orders since they might need to be produced
      const response = await fetch('/api/pos/search?search=&includeInactive=true');
      const data = await response.json();
      if (response.ok) {
        setProducts(data.variants);
        console.log(`Loaded ${data.variants.length} product variants for production orders`);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
    fetchSuppliers();
    fetchProducts();
  }, []);

  // Add item to purchase
  const addItemToPurchase = (variant: ProductVariant) => {
    const existingItem = purchaseItems.find(item => item.variantId === variant.id);
    
    if (existingItem) {
      setPurchaseItems(purchaseItems.map(item => 
        item.variantId === variant.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setPurchaseItems([...purchaseItems, {
        variantId: variant.id,
        productId: variant.product.id,
        quantity: 1,
        unitPrice: Number(variant.product.costPrice),
        variant
      }]);
    }
  };

  // Update item quantity
  const updateItemQuantity = (variantId: string, quantity: number) => {
    if (quantity <= 0) {
      setPurchaseItems(purchaseItems.filter(item => item.variantId !== variantId));
    } else {
      setPurchaseItems(purchaseItems.map(item => 
        item.variantId === variantId 
          ? { ...item, quantity }
          : item
      ));
    }
  };

  // Update item price
  const updateItemPrice = (variantId: string, unitPrice: number) => {
    setPurchaseItems(purchaseItems.map(item => 
      item.variantId === variantId 
        ? { ...item, unitPrice }
        : item
    ));
  };

  // Calculate total
  const calculateTotal = () => {
    return purchaseItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  // Open purchase detail
  const openPurchaseDetail = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setIsDetailOpen(true);
  };

  // Open delete confirmation
  const openDeletePurchase = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setIsDeleteOpen(true);
  };

  // Delete purchase
  const handleDeletePurchase = async () => {
    if (!selectedPurchase) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/purchases/${selectedPurchase.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Production order berhasil dihapus');
        setIsDeleteOpen(false);
        setSelectedPurchase(null);
        fetchPurchases(); // Refresh data
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Gagal menghapus production order');
      }
    } catch (error) {
      console.error('Error deleting purchase:', error);
      toast.error('Gagal menghapus production order');
    } finally {
      setIsDeleting(false);
    }
  };

  // Complete purchase (change status from PENDING to COMPLETED)
  const completePurchase = async (purchaseId: string) => {
    try {
      const response = await fetch(`/api/purchases/${purchaseId}/complete`, {
        method: 'PATCH',
      });

      if (response.ok) {
        toast.success('Production order berhasil diselesaikan');
        fetchPurchases(); // Refresh data
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Gagal menyelesaikan production order');
      }
    } catch (error) {
      console.error('Error completing purchase:', error);
      toast.error('Gagal menyelesaikan production order');
    }
  };

  // Create production order
  const createPurchaseOrder = async () => {
    if (purchaseItems.length === 0) {
      toast.error('Tambahkan minimal satu item untuk diproduksi');
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch('/api/purchases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: purchaseItems.map(item => ({
            variantId: item.variantId,
            quantity: item.quantity,
            unitPrice: item.unitPrice
          })),
          notes
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Production Order berhasil dibuat dan stok telah diupdate!');
        setIsCreateOpen(false);
        resetForm();
        fetchPurchases();
      } else {
        toast.error(data.error || 'Gagal membuat production order');
      }
    } catch (error) {
      toast.error('Gagal membuat production order');
    } finally {
      setIsCreating(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setNotes('');
    setPurchaseItems([]);
    setProductSearch('');
  };

  // Filter products for search
  const filteredProducts = products && products.length > 0 
    ? products.filter(variant =>
        variant.product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        variant.product.sku.toLowerCase().includes(productSearch.toLowerCase()) ||
        variant.size.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        variant.color.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        variant.product.brand.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        variant.product.category.name.toLowerCase().includes(productSearch.toLowerCase())
      )
    : [];

  // Summary stats
  const totalPurchases = purchases.reduce((sum, p) => sum + Number(p.totalAmount), 0);
  const pendingCount = purchases.filter(p => p.status === 'PENDING').length;

  if (loading) {
    return (
      <div className="container mx-auto p-4 sm:p-6">
        {/* Header Skeleton */}
        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <div className="h-6 sm:h-8 w-48 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-3 sm:h-4 w-64 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="h-9 sm:h-10 w-full sm:w-32 bg-gray-200 rounded animate-pulse"></div>
          </div>

          {/* Loading Animation Center */}
          <div className="flex items-center justify-center mb-6 sm:mb-8">
            <div className="text-center">
              <div className="relative mb-4">
                <Truck className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-blue-600 animate-pulse" />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Memuat Data Produksi</h2>
              <p className="text-sm text-gray-600">Mengambil data order produksi...</p>
              <div className="flex items-center justify-center mt-4 space-x-1">
                <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce"></div>
                <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
          </div>

          {/* Summary Cards Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[1, 2, 3].map((item) => (
              <Card key={item} className="border-0 shadow-sm">
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
                <Package className="h-8 w-8 sm:h-12 sm:w-12 text-gray-300" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6">
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Production Orders</h1>
            <p className="text-sm text-muted-foreground">
              Kelola produksi dan manufacturing
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                <span className="sm:inline">Buat Production Order</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl">Buat Production Order Baru</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Target Produksi</Label>
                    <div className="text-sm text-muted-foreground">
                      Pilih produk yang akan diproduksi
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Catatan Produksi</Label>
                    <Textarea
                      placeholder="Catatan untuk produksi ini..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="min-h-[80px]"
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label>Pilih Produk untuk Diproduksi</Label>
                    <span className="text-sm text-muted-foreground">
                      {filteredProducts.length} produk tersedia
                    </span>
                  </div>
                  <Input
                    placeholder="Cari produk yang akan diproduksi..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto border rounded p-2">
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map((variant) => (
                        <Card key={variant.id} className="cursor-pointer hover:bg-gray-50" onClick={() => addItemToPurchase(variant)}>
                          <CardContent className="p-3">
                            <div className="text-sm">
                              <div className="flex items-center justify-between">
                                <div className="font-medium">{variant.product.name}</div>
                                {(!variant.isActive || !variant.product.isActive) && (
                                  <Badge variant="secondary" className="text-xs">
                                    Nonaktif
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {variant.size.name} • {variant.color.name} • Stok: {variant.stock}
                              </div>
                              <div className="text-xs font-medium text-green-600">
                                Biaya Produksi: Rp {variant.product.costPrice.toLocaleString('id-ID')}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="col-span-2 text-center py-8 text-muted-foreground">
                        {productSearch ? (
                          <>
                            <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>Tidak ada produk yang sesuai dengan pencarian "{productSearch}"</p>
                            <p className="text-xs mt-1">Coba gunakan kata kunci yang berbeda</p>
                          </>
                        ) : (
                          <>
                            <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>Belum ada produk aktif yang tersedia</p>
                            <p className="text-xs mt-1">Pastikan produk dan varian sudah diaktifkan</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {purchaseItems.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <Label>Items Production Order</Label>
                      
                      {/* Mobile Card Layout */}
                      <div className="block lg:hidden space-y-3">
                        {purchaseItems.map((item) => (
                          <Card key={item.variantId} className="border border-gray-200">
                            <CardContent className="p-4">
                              <div className="space-y-3">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="font-medium text-sm">{item.variant?.product?.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {item.variant?.size?.name} • {item.variant?.color?.name}
                                    </div>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateItemQuantity(item.variantId!, 0)}
                                  >
                                    <Minus className="h-4 w-4" />
                                  </Button>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <Label className="text-xs">Qty Produksi</Label>
                                    <Input
                                      type="number"
                                      min="1"
                                      value={item.quantity}
                                      onChange={(e) => updateItemQuantity(item.variantId!, parseInt(e.target.value) || 0)}
                                      className="mt-1"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs">Biaya Per Unit</Label>
                                    <Input
                                      type="number"
                                      value={item.unitPrice}
                                      onChange={(e) => updateItemPrice(item.variantId!, parseFloat(e.target.value) || 0)}
                                      className="mt-1"
                                    />
                                  </div>
                                </div>
                                
                                <div className="text-center p-2 bg-gray-50 rounded">
                                  <div className="text-xs text-gray-600">Total Biaya</div>
                                  <div className="font-semibold text-blue-600">
                                    Rp {(item.quantity * item.unitPrice).toLocaleString('id-ID')}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      {/* Desktop Table Layout */}
                      <div className="hidden lg:block">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Produk</TableHead>
                              <TableHead>Qty Produksi</TableHead>
                              <TableHead>Biaya Per Unit</TableHead>
                              <TableHead>Total Biaya</TableHead>
                              <TableHead>Aksi</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {purchaseItems.map((item) => (
                              <TableRow key={item.variantId}>
                                <TableCell>
                                  <div>
                                    <div className="font-medium">{item.variant?.product?.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {item.variant?.size?.name} • {item.variant?.color?.name}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => updateItemQuantity(item.variantId!, parseInt(e.target.value) || 0)}
                                    className="w-20"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    value={item.unitPrice}
                                    onChange={(e) => updateItemPrice(item.variantId!, parseFloat(e.target.value) || 0)}
                                    className="w-32"
                                  />
                                </TableCell>
                                <TableCell>
                                  Rp {(item.quantity * item.unitPrice).toLocaleString('id-ID')}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateItemQuantity(item.variantId!, 0)}
                                  >
                                    <Minus className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      <div className="flex flex-col sm:flex-row justify-between items-center p-4 bg-gray-50 rounded gap-2">
                        <span className="font-bold text-sm sm:text-base">Total Biaya Produksi:</span>
                        <span className="font-bold text-lg sm:text-xl text-blue-600">
                          Rp {calculateTotal().toLocaleString('id-ID')}
                        </span>
                      </div>

                      <Button 
                        className="w-full" 
                        size="lg"
                        onClick={createPurchaseOrder}
                        disabled={isCreating}
                      >
                        {isCreating ? 'Membuat...' : 'Buat Production Order'}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Biaya Produksi</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-gray-900">Rp {totalPurchases.toLocaleString('id-ID')}</div>
              <p className="text-xs text-gray-600">
                {purchases.length} production orders
              </p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Produksi Pending</CardTitle>
              <Package className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-gray-900">{pendingCount}</div>
              <p className="text-xs text-gray-600">
                Menunggu produksi
              </p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm sm:col-span-2 lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Items Diproduksi</CardTitle>
              <Truck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-gray-900">{purchases.reduce((sum, p) => sum + p.items.length, 0)}</div>
              <p className="text-xs text-gray-600">
                Total items
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Production Orders List */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Daftar Production Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {purchases.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <div className="text-sm text-gray-600">
                  Belum ada production orders
                </div>
              </div>
            ) : (
              <>
                {/* Mobile Card Layout */}
                <div className="block lg:hidden space-y-3">
                  {purchases.map((purchase) => (
                    <Card key={purchase.id} className="border border-gray-200">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          {/* Header */}
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-semibold text-gray-900 text-sm">
                                {purchase.invoiceNumber.replace('PO-', 'PROD-')}
                              </div>
                              <div className="text-xs text-gray-600 mt-1">
                                {format(new Date(purchase.transactionDate), 'dd MMM yyyy', { locale: id })}
                              </div>
                            </div>
                            <Badge 
                              variant={purchase.status === 'PENDING' ? 'secondary' : 'default'}
                              className="text-xs"
                            >
                              {purchase.status === 'PENDING' ? 'PRODUKSI' : purchase.status}
                            </Badge>
                          </div>

                          {/* Content */}
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <div className="text-xs text-gray-600">Total Biaya</div>
                              <div className="font-semibold text-blue-600">
                                Rp {Number(purchase.totalAmount).toLocaleString('id-ID')}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-600">Items</div>
                              <div className="font-medium">
                                {purchase.items.length} item{purchase.items.length > 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 pt-2 border-t">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="flex-1 text-xs"
                              onClick={() => openPurchaseDetail(purchase)}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Detail
                            </Button>
                            {purchase.status === 'PENDING' && (
                              <Button 
                                variant="default" 
                                size="sm"
                                className="flex-1 text-xs"
                                onClick={() => completePurchase(purchase.id)}
                              >
                                ✅ Complete
                              </Button>
                            )}
                            <Button 
                              variant="destructive" 
                              size="sm"
                              className="text-xs"
                              onClick={() => openDeletePurchase(purchase)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Desktop Table Layout */}
                <div className="hidden lg:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>No. Production</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Total Biaya</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchases.map((purchase) => (
                        <TableRow key={purchase.id}>
                          <TableCell className="font-medium">
                            {purchase.invoiceNumber.replace('PO-', 'PROD-')}
                          </TableCell>
                          <TableCell>
                            {format(new Date(purchase.transactionDate), 'dd MMM yyyy', { locale: id })}
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-blue-600">
                              Rp {Number(purchase.totalAmount).toLocaleString('id-ID')}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {purchase.items.length} item{purchase.items.length > 1 ? 's' : ''}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={purchase.status === 'PENDING' ? 'secondary' : 'default'}>
                              {purchase.status === 'PENDING' ? 'PRODUKSI' : purchase.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => openPurchaseDetail(purchase)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Detail
                              </Button>
                              {purchase.status === 'PENDING' && (
                                <Button 
                                  variant="default" 
                                  size="sm"
                                  onClick={() => completePurchase(purchase.id)}
                                >
                                  ✅ Complete
                                </Button>
                              )}
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={() => openDeletePurchase(purchase)}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Hapus
                              </Button>
                            </div>
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
      </div>

      {/* Purchase Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Detail Production Order</DialogTitle>
          </DialogHeader>
          
          {selectedPurchase && (
            <div className="space-y-4 sm:space-y-6">
              {/* Order Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Invoice Number</Label>
                  <p className="text-sm">{selectedPurchase.invoiceNumber}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="mt-1">
                    <Badge variant={selectedPurchase.status === 'PENDING' ? 'secondary' : 'default'}>
                      {selectedPurchase.status === 'PENDING' ? 'PRODUKSI' : selectedPurchase.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Supplier</Label>
                  <p className="text-sm">{selectedPurchase.supplier?.name || 'Tidak ada supplier'}</p>
                  {selectedPurchase.supplier?.contact && (
                    <p className="text-xs text-muted-foreground">{selectedPurchase.supplier.contact}</p>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium">Tanggal</Label>
                  <p className="text-sm">
                    {format(new Date(selectedPurchase.transactionDate), 'dd MMMM yyyy', { locale: id })}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-sm font-medium">Total</Label>
                  <p className="text-lg sm:text-xl font-bold text-blue-600">Rp {selectedPurchase.totalAmount.toLocaleString()}</p>
                </div>
              </div>

              <Separator />

              {/* Items */}
              <div>
                <Label className="text-sm font-medium mb-3 block">Items</Label>
                
                {/* Mobile Card Layout */}
                <div className="block lg:hidden space-y-3">
                  {selectedPurchase.items && selectedPurchase.items.length > 0 ? (
                    selectedPurchase.items.map((item, index) => (
                      <Card key={index} className="border border-gray-200">
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <div>
                              <div className="font-medium text-sm">
                                {item.variant?.product?.name || item.productName || 'Unknown Product'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {item.variant?.product?.category?.name || ''}
                              </div>
                            </div>
                            
                            <div className="text-xs text-gray-600">
                              Varian: {item.variant ? 
                                `${item.variant.size?.name || ''} - ${item.variant.color?.name || ''}` : 
                                item.variantName || '-'
                              }
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <div className="text-xs text-gray-600">Quantity</div>
                                <div className="font-medium">{item.quantity || 0}</div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-600">Harga Satuan</div>
                                <div className="font-medium">Rp {(item.unitPrice || 0).toLocaleString()}</div>
                              </div>
                            </div>
                            
                            <div className="text-center p-2 bg-gray-50 rounded">
                              <div className="text-xs text-gray-600">Total</div>
                              <div className="font-semibold text-blue-600">
                                Rp {((item.quantity || 0) * (item.unitPrice || 0)).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-muted-foreground">Tidak ada item</p>
                    </div>
                  )}
                </div>

                {/* Desktop Table Layout */}
                <div className="hidden lg:block border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produk</TableHead>
                        <TableHead>Varian</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Harga Satuan</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPurchase.items && selectedPurchase.items.length > 0 ? (
                        selectedPurchase.items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <div>
                                <p className="font-medium">
                                  {item.variant?.product?.name || item.productName || 'Unknown Product'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {item.variant?.product?.category?.name || ''}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {item.variant ? (
                                `${item.variant.size?.name || ''} - ${item.variant.color?.name || ''}`
                              ) : (
                                item.variantName || '-'
                              )}
                            </TableCell>
                            <TableCell>{item.quantity || 0}</TableCell>
                            <TableCell>Rp {(item.unitPrice || 0).toLocaleString()}</TableCell>
                            <TableCell>Rp {((item.quantity || 0) * (item.unitPrice || 0)).toLocaleString()}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-4">
                            <p className="text-muted-foreground">Tidak ada item</p>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Notes */}
              {selectedPurchase.notes && (
                <div>
                  <Label className="text-sm font-medium">Catatan</Label>
                  <p className="text-sm mt-1 p-3 bg-muted rounded-md">{selectedPurchase.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Konfirmasi Hapus</DialogTitle>
          </DialogHeader>
          
          {selectedPurchase && (
            <div className="space-y-4">
              <p className="text-sm">
                Apakah Anda yakin ingin menghapus production order <strong>{selectedPurchase.invoiceNumber}</strong>?
              </p>
              <p className="text-xs text-muted-foreground">
                Tindakan ini tidak dapat dibatalkan.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setIsDeleteOpen(false)}
                  disabled={isDeleting}
                  className="w-full sm:w-auto"
                >
                  Batal
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleDeletePurchase}
                  disabled={isDeleting}
                  className="w-full sm:w-auto"
                >
                  {isDeleting ? 'Menghapus...' : 'Hapus'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
