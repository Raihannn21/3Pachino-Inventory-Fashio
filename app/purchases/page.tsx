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
      const response = await fetch('/api/pos/search?search=');
      const data = await response.json();
      if (response.ok) {
        setProducts(data.variants);
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
        variant.product.sku.toLowerCase().includes(productSearch.toLowerCase())
      )
    : [];

  // Summary stats
  const totalPurchases = purchases.reduce((sum, p) => sum + Number(p.totalAmount), 0);
  const pendingCount = purchases.filter(p => p.status === 'PENDING').length;

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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Production Orders</h1>
            <p className="text-muted-foreground">
              Kelola produksi dan manufacturing
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="lg">
                <Plus className="h-4 w-4 mr-2" />
                Buat Production Order
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Buat Production Order Baru</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <Label>Pilih Produk untuk Diproduksi</Label>
                  <Input
                    placeholder="Cari produk yang akan diproduksi..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                  
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded p-2">
                    {filteredProducts.slice(0, 20).map((variant) => (
                      <Card key={variant.id} className="cursor-pointer hover:bg-gray-50" onClick={() => addItemToPurchase(variant)}>
                        <CardContent className="p-2">
                          <div className="text-sm">
                            <div className="font-medium">{variant.product.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {variant.size.name} • {variant.color.name} • Stok: {variant.stock}
                            </div>
                            <div className="text-xs font-medium text-green-600">
                              Biaya Produksi: Rp {variant.product.costPrice.toLocaleString('id-ID')}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {purchaseItems.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <Label>Items Production Order</Label>
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

                      <div className="flex justify-between items-center p-4 bg-gray-50 rounded">
                        <span className="font-bold">Total Biaya Produksi:</span>
                        <span className="font-bold text-lg">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Biaya Produksi</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Rp {totalPurchases.toLocaleString('id-ID')}</div>
              <p className="text-xs text-muted-foreground">
                {purchases.length} production orders
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Produksi Pending</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingCount}</div>
              <p className="text-xs text-muted-foreground">
                Menunggu produksi
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Items Diproduksi</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{purchases.reduce((sum, p) => sum + p.items.length, 0)}</div>
              <p className="text-xs text-muted-foreground">
                Total items
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Production Orders List */}
        <Card>
          <CardHeader>
            <CardTitle>Daftar Production Orders</CardTitle>
          </CardHeader>
          <CardContent>
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

            {purchases.length === 0 && (
              <div className="text-center py-8">
                <div className="text-sm text-muted-foreground">
                  Belum ada production orders
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Purchase Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Production Order</DialogTitle>
          </DialogHeader>
          
          {selectedPurchase && (
            <div className="space-y-6">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Invoice Number</Label>
                  <p className="text-sm">{selectedPurchase.invoiceNumber}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div>
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
                <div className="col-span-2">
                  <Label className="text-sm font-medium">Total</Label>
                  <p className="text-lg font-bold">Rp {selectedPurchase.totalAmount.toLocaleString()}</p>
                </div>
              </div>

              <Separator />

              {/* Items */}
              <div>
                <Label className="text-sm font-medium mb-3 block">Items</Label>
                <div className="border rounded-lg">
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Hapus</DialogTitle>
          </DialogHeader>
          
          {selectedPurchase && (
            <div className="space-y-4">
              <p>
                Apakah Anda yakin ingin menghapus production order <strong>{selectedPurchase.invoiceNumber}</strong>?
              </p>
              <p className="text-sm text-muted-foreground">
                Tindakan ini tidak dapat dibatalkan.
              </p>
              
              <div className="flex gap-2 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setIsDeleteOpen(false)}
                  disabled={isDeleting}
                >
                  Batal
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleDeletePurchase}
                  disabled={isDeleting}
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
