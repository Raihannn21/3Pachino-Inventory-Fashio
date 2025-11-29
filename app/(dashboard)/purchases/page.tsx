'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
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
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPurchases, setTotalPurchases] = useState(0);
  
  // Stats dari API (untuk semua data, bukan hanya halaman saat ini)
  const [totalItems, setTotalItems] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  // Form states
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [notes, setNotes] = useState('');
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  
  // Cascade dropdown states for product selection
  const [selectedProduct, setSelectedProduct] = useState<string>(''); // Product ID
  const [selectedSize, setSelectedSize] = useState<string>(''); // Size name
  const [selectedColor, setSelectedColor] = useState<string>(''); // Color name

  // Fetch data
  const fetchPurchases = async (page = 1) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/purchases?page=${page}&limit=10`);
      const data = await response.json();
      if (response.ok) {
        setPurchases(data.purchases);
        setTotalPages(data.pagination.pages);
        setTotalPurchases(data.pagination.total);
        setCurrentPage(page);
        
        // Update stats dari API
        if (data.stats) {
          setTotalItems(data.stats.totalItems);
          setTotalAmount(data.stats.totalAmount);
          setPendingCount(data.stats.pendingCount);
        }
      }
    } catch (error) {
      console.error('Error fetching purchases:', error);
    } finally {
      setLoading(false);
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
        console.log('Sample products:', data.variants.slice(0, 3));
      } else {
        console.error('Error response from API:', data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases(currentPage);
    fetchSuppliers();
    fetchProducts();
  }, [currentPage]);

  // Get available products (unique products only)
  const availableProducts = useMemo(() => {
    const uniqueProducts = new Map<string, { id: string; name: string; brand: string; category: string }>();
    products.forEach(v => {
      if (!uniqueProducts.has(v.product.id)) {
        uniqueProducts.set(v.product.id, {
          id: v.product.id,
          name: v.product.name,
          brand: v.product.brand.name,
          category: v.product.category.name
        });
      }
    });
    return Array.from(uniqueProducts.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  // Get available sizes for selected product
  const availableSizes = useMemo(() => {
    if (!selectedProduct) return [];
    
    const sizes = new Set<string>();
    products
      .filter(v => v.product.id === selectedProduct)
      .forEach(v => sizes.add(v.size.name));
    
    const sizeOrder: { [key: string]: number } = { 'S': 1, 'M': 2, 'L': 3, 'XL': 4, 'XXL': 5, 'XXXL': 6 };
    return Array.from(sizes).sort((a, b) => (sizeOrder[a] || 999) - (sizeOrder[b] || 999));
  }, [products, selectedProduct]);

  // Get available colors for selected product and size
  const availableColors = useMemo(() => {
    if (!selectedProduct || !selectedSize) return [];
    
    const colorsMap = new Map<string, { name: string; hexCode: string; stock: number; variantId: string }>();
    products
      .filter(v => v.product.id === selectedProduct && v.size.name === selectedSize)
      .forEach(v => {
        if (!colorsMap.has(v.color.name)) {
          colorsMap.set(v.color.name, {
            name: v.color.name,
            hexCode: v.color.hexCode || '',
            stock: v.stock,
            variantId: v.id
          });
        }
      });
    
    return Array.from(colorsMap.values());
  }, [products, selectedProduct, selectedSize]);

  // Get selected variant data
  const selectedVariantData = useMemo(() => {
    if (!selectedProduct || !selectedSize || !selectedColor) return null;
    
    return products.find(
      v => v.product.id === selectedProduct && 
           v.size.name === selectedSize && 
           v.color.name === selectedColor
    ) || null;
  }, [products, selectedProduct, selectedSize, selectedColor]);

  // Handlers for cascade dropdown
  const handleProductChange = useCallback((productId: string) => {
    setSelectedProduct(productId);
    setSelectedSize('');
    setSelectedColor('');
  }, []);

  const handleSizeChange = useCallback((size: string) => {
    setSelectedSize(size);
    
    // Cek apakah warna yang sudah dipilih tersedia di ukuran baru
    if (selectedColor && selectedProduct) {
      const newAvailableColors = products
        .filter(v => v.product.id === selectedProduct && v.size.name === size)
        .map(v => v.color.name);
      
      // Jika warna saat ini tidak tersedia di ukuran baru, reset
      if (!newAvailableColors.includes(selectedColor)) {
        setSelectedColor('');
      }
      // Jika tersedia, pertahankan warna yang sudah dipilih
    }
  }, [selectedProduct, selectedColor, products]);

  const handleColorChange = useCallback((color: string) => {
    setSelectedColor(color);
  }, []);

  const resetSelection = useCallback(() => {
    setSelectedProduct('');
    setSelectedSize('');
    setSelectedColor('');
  }, []);

  // Add item to purchase
  const addItemToPurchase = useCallback((variant: ProductVariant) => {
    setPurchaseItems(prevItems => {
      const existingItem = prevItems.find(item => item.variantId === variant.id);
      
      if (existingItem) {
        return prevItems.map(item => 
          item.variantId === variant.id 
            ? { ...item, quantity: item.quantity + 1, unitPrice: Number(variant.product.costPrice) }
            : item
        );
      } else {
        return [...prevItems, {
          variantId: variant.id,
          productId: variant.product.id,
          quantity: 1,
          unitPrice: Number(variant.product.costPrice),
          variant
        }];
      }
    });
  }, []);

  const addSelectedToProduction = useCallback(() => {
    if (!selectedVariantData) {
      toast.error('Pilih produk, ukuran, dan warna terlebih dahulu');
      return;
    }
    
    addItemToPurchase(selectedVariantData);
    toast.success(`${selectedVariantData.product.name} ditambahkan ke production order`);
  }, [selectedVariantData, addItemToPurchase]);

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

  // Debug filtered products
  console.log('Total products loaded:', products.length);
  console.log('Search term:', productSearch);
  console.log('Filtered products count:', filteredProducts.length);

  // Summary stats - tidak perlu menghitung lagi, sudah dari API
  // const totalPurchasesAmount = purchases.reduce((sum, p) => sum + Number(p.totalAmount), 0);
  // const pendingCount = purchases.filter(p => p.status === 'PENDING').length;

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
                  </div>
                  
                  {/* Cascade Dropdown - Quick Selection */}
                  <div className="space-y-3 border rounded-lg p-4 bg-gray-50">
                    {/* Dropdown: Pilih Produk */}
                    <div>
                      <Label htmlFor="product-select-purchase" className="text-sm font-medium">
                        Pilih Nama Produk
                      </Label>
                      <Select value={selectedProduct} onValueChange={handleProductChange}>
                        <SelectTrigger id="product-select-purchase" className="mt-1 bg-white">
                          <SelectValue placeholder="-- Pilih Produk --" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableProducts.map(product => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} - {product.brand}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {availableProducts.length === 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Tidak ada produk tersedia
                        </p>
                      )}
                    </div>

                    {/* Dropdown: Pilih Ukuran */}
                    <div>
                      <Label htmlFor="size-select-purchase" className="text-sm font-medium">
                        Pilih Ukuran
                      </Label>
                      <Select 
                        value={selectedSize} 
                        onValueChange={handleSizeChange}
                        disabled={!selectedProduct}
                      >
                        <SelectTrigger id="size-select-purchase" className="mt-1 bg-white">
                          <SelectValue placeholder={selectedProduct ? "-- Pilih Ukuran --" : "Pilih produk terlebih dahulu"} />
                        </SelectTrigger>
                        <SelectContent>
                          {availableSizes.map((size: string) => (
                            <SelectItem key={size} value={size}>
                              {size}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedProduct && availableSizes.length === 0 && (
                        <p className="text-xs text-red-500 mt-1">
                          Tidak ada ukuran tersedia
                        </p>
                      )}
                    </div>

                    {/* Dropdown: Pilih Warna */}
                    <div>
                      <Label htmlFor="color-select-purchase" className="text-sm font-medium">
                        Pilih Warna
                      </Label>
                      <Select 
                        value={selectedColor} 
                        onValueChange={handleColorChange}
                        disabled={!selectedProduct || !selectedSize}
                      >
                        <SelectTrigger id="color-select-purchase" className="mt-1 bg-white">
                          <SelectValue placeholder={selectedSize ? "-- Pilih Warna --" : "Pilih ukuran terlebih dahulu"} />
                        </SelectTrigger>
                        <SelectContent>
                          {availableColors.map(color => (
                            <SelectItem key={color.name} value={color.name}>
                              <div className="flex items-center gap-2">
                                {color.hexCode && (
                                  <span
                                    className="w-4 h-4 rounded-full border inline-block"
                                    style={{ backgroundColor: color.hexCode }}
                                  />
                                )}
                                {color.name} (Stok: {color.stock})
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedSize && availableColors.length === 0 && (
                        <p className="text-xs text-red-500 mt-1">
                          Tidak ada warna tersedia
                        </p>
                      )}
                    </div>

                    {/* Selected Variant Info & Add Button */}
                    {selectedVariantData && (
                      <div className="pt-3 border-t bg-blue-50 p-4 rounded-lg">
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-semibold text-sm">
                                {selectedVariantData.product.name}
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                {selectedVariantData.product.brand.name} • {selectedVariantData.product.category.name}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="secondary">
                              {selectedVariantData.size.name}
                            </Badge>
                            <Badge 
                              variant="secondary"
                              style={{ 
                                backgroundColor: selectedVariantData.color.hexCode + '30',
                                borderColor: selectedVariantData.color.hexCode 
                              }}
                            >
                              <span
                                className="w-3 h-3 rounded-full border inline-block mr-1"
                                style={{ backgroundColor: selectedVariantData.color.hexCode }}
                              />
                              {selectedVariantData.color.name}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center pt-2">
                            <div>
                              <p className="text-lg font-bold text-green-600">
                                Rp {selectedVariantData.product.costPrice.toLocaleString('id-ID')}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Stok tersedia: {selectedVariantData.stock}
                              </p>
                            </div>
                            <Button
                              onClick={addSelectedToProduction}
                              size="lg"
                              className="gap-2"
                            >
                              <Plus className="h-4 w-4" />
                              Tambah
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Reset Button */}
                    {selectedProduct && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={resetSelection}
                        className="w-full"
                      >
                        Reset Pilihan
                      </Button>
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
              <div className="text-xl sm:text-2xl font-bold text-gray-900">Rp {totalAmount.toLocaleString('id-ID')}</div>
              <p className="text-xs text-gray-600">
                {totalPurchases} production orders
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
              <div className="text-xl sm:text-2xl font-bold text-gray-900">{totalItems}</div>
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
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 border-t pt-4">
                <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                  Menampilkan {((currentPage - 1) * 10) + 1} - {Math.min(currentPage * 10, totalPurchases)} dari {totalPurchases} production orders
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                  >
                    Sebelumnya
                  </Button>
                  <div className="flex items-center gap-2 px-3 text-sm">
                    Halaman {currentPage} dari {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                  >
                    Selanjutnya
                  </Button>
                </div>
              </div>
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
