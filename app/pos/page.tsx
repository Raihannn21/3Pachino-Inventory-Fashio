'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Search, Plus, Minus, Trash2, ShoppingCart, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

interface ProductVariant {
  id: string;
  stock: number;
  barcode?: string;
  product: {
    id: string;
    name: string;
    sku: string;
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

interface CartItem {
  variant: ProductVariant;
  quantity: number;
}

interface Customer {
  id: string;
  name: string;
  contact?: string;
  phone?: string;
  address?: string;
}

export default function POSPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<ProductVariant[]>([]);
  const [allProducts, setAllProducts] = useState<ProductVariant[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [discount, setDiscount] = useState(0);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Load all products on component mount
  const loadAllProducts = async () => {
    setIsLoadingProducts(true);
    try {
      const response = await fetch('/api/pos/search?search=');
      const data = await response.json();
      
      if (response.ok) {
        setAllProducts(data.variants);
        setSearchResults(data.variants); // Show all products initially
      } else {
        toast.error(data.error || 'Gagal memuat produk');
      }
    } catch (error) {
      toast.error('Gagal memuat produk');
    } finally {
      setIsLoadingProducts(false);
    }
  };

  // Load customers
  const loadCustomers = async () => {
    try {
      const response = await fetch('/api/customers');
      const data = await response.json();
      
      if (response.ok) {
        setCustomers(data.customers);
      } else {
        console.error('Gagal memuat data customer');
      }
    } catch (error) {
      console.error('Gagal memuat data customer');
    }
  };

  // Search products
  const searchProducts = async (term: string) => {
    setIsSearching(true);
    try {
      if (!term.trim()) {
        // If search is empty, show all products
        setSearchResults(allProducts);
        setIsSearching(false);
        return;
      }

      const response = await fetch(`/api/pos/search?search=${encodeURIComponent(term)}`);
      const data = await response.json();
      
      if (response.ok) {
        setSearchResults(data.variants);
      } else {
        toast.error(data.error || 'Gagal mencari produk');
      }
    } catch (error) {
      toast.error('Gagal mencari produk');
    } finally {
      setIsSearching(false);
    }
  };

  // Load products on mount
  useEffect(() => {
    loadAllProducts();
    loadCustomers();
  }, []);

  // Debounced search
  useEffect(() => {
    if (allProducts.length === 0) return; // Don't search if products not loaded yet
    
    const timer = setTimeout(() => {
      searchProducts(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, allProducts]);

  // Add to cart
  const addToCart = (variant: ProductVariant) => {
    const existingItem = cart.find(item => item.variant.id === variant.id);
    
    if (existingItem) {
      if (existingItem.quantity >= variant.stock) {
        toast.error('Stok tidak mencukupi');
        return;
      }
      updateQuantity(variant.id, existingItem.quantity + 1);
    } else {
      if (variant.stock < 1) {
        toast.error('Stok habis');
        return;
      }
      setCart([...cart, { variant, quantity: 1 }]);
      toast.success(`${variant.product.name} ditambahkan ke keranjang`);
    }
  };

  // Update quantity
  const updateQuantity = (variantId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(variantId);
      return;
    }

    const variant = cart.find(item => item.variant.id === variantId)?.variant;
    if (variant && newQuantity > variant.stock) {
      toast.error('Stok tidak mencukupi');
      return;
    }

    setCart(cart.map(item => 
      item.variant.id === variantId 
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  // Remove from cart
  const removeFromCart = (variantId: string) => {
    setCart(cart.filter(item => item.variant.id !== variantId));
  };

  // Clear cart
  const clearCart = () => {
    setCart([]);
    setSelectedCustomer('');
    setCustomerName('');
    setCustomerPhone('');
    setNotes('');
    setDiscount(0);
  };

  // Handle customer selection
  const handleCustomerSelect = (customerId: string) => {
    setSelectedCustomer(customerId);
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setCustomerName(customer.name);
      setCustomerPhone(customer.phone || '');
    }
  };

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + (item.variant.product.sellingPrice * item.quantity), 0);
  const discountAmount = (subtotal * discount) / 100;
  const total = subtotal - discountAmount;

  // Process payment
  const processPayment = async () => {
    if (cart.length === 0) {
      toast.error('Keranjang masih kosong');
      return;
    }

    setIsProcessingPayment(true);
    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: selectedCustomer, // Send customer ID
          customerName,
          customerPhone,
          items: cart.map(item => ({
            variantId: item.variant.id,
            quantity: item.quantity
          })),
          discount,
          notes
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Transaksi berhasil diproses!');
        clearCart();
        setIsCheckoutOpen(false);
        
        // Redirect ke halaman penjualan
        router.push('/sales');
      } else {
        toast.error(data.error || 'Gagal memproses transaksi');
      }
    } catch (error) {
      toast.error('Gagal memproses transaksi');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Point of Sale</h1>
          <p className="text-gray-600 mt-1">
            Sistem kasir 3PACHINO
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Search */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Cari Produk
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Input
                  placeholder="Cari produk, SKU, atau scan barcode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="text-lg"
                />

                {isLoadingProducts ? (
                  <div className="text-center py-8">
                    <div className="text-sm text-muted-foreground">Memuat produk...</div>
                  </div>
                ) : isSearching ? (
                  <div className="text-center py-4">
                    <div className="text-sm text-muted-foreground">Mencari produk...</div>
                  </div>
                ) : (
                  <>
                    <div className="text-sm text-muted-foreground mb-2">
                      Menampilkan {searchResults.length} produk {searchTerm && `untuk "${searchTerm}"`}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                      {searchResults.map((variant) => (
                        <Card key={variant.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => addToCart(variant)}>
                          <CardContent className="p-4">
                            <div className="space-y-2">
                              <h3 className="font-medium">{variant.product.name}</h3>
                              <div className="flex flex-wrap gap-1">
                                <Badge variant="outline" className="text-xs">
                                  {variant.size.name}
                                </Badge>
                                <Badge 
                                  variant="outline" 
                                  className="text-xs"
                                  style={{ backgroundColor: variant.color.hexCode + '20', borderColor: variant.color.hexCode }}
                                >
                                  {variant.color.name}
                                </Badge>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-primary">
                                  Rp {variant.product.sellingPrice.toLocaleString('id-ID')}
                                </span>
                                <Badge variant={variant.stock > 10 ? 'secondary' : variant.stock > 0 ? 'destructive' : 'outline'}>
                                  Stok: {variant.stock}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {variant.product.brand.name} • {variant.product.category.name}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {!isLoadingProducts && searchResults.length === 0 && (
                      <div className="text-center py-8">
                        <div className="text-sm text-muted-foreground">
                          {searchTerm ? `Tidak ada produk yang ditemukan untuk "${searchTerm}"` : 'Belum ada produk tersedia'}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Shopping Cart */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Keranjang ({cart.length})
                </span>
                {cart.length > 0 && (
                  <Button variant="outline" size="sm" onClick={clearCart}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Keranjang masih kosong
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {cart.map((item) => (
                        <div key={item.variant.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate">
                              {item.variant.product.name}
                            </h4>
                            <div className="flex gap-1 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {item.variant.size.name}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {item.variant.color.name}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Rp {item.variant.product.sellingPrice.toLocaleString('id-ID')}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.variant.id, item.quantity - 1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-sm">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.variant.id, item.quantity + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span>Rp {subtotal.toLocaleString('id-ID')}</span>
                      </div>
                      {discount > 0 && (
                        <div className="flex justify-between text-sm text-red-600">
                          <span>Diskon ({discount}%):</span>
                          <span>-Rp {discountAmount.toLocaleString('id-ID')}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between font-bold">
                        <span>Total:</span>
                        <span>Rp {total.toLocaleString('id-ID')}</span>
                      </div>
                    </div>

                    <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
                      <DialogTrigger asChild>
                        <Button className="w-full" size="lg">
                          <CreditCard className="h-4 w-4 mr-2" />
                          Checkout
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Checkout</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="customer">Pilih Customer</Label>
                            <Select value={selectedCustomer} onValueChange={handleCustomerSelect}>
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih customer atau isi manual" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="manual">Customer Baru (Isi Manual)</SelectItem>
                                {customers.map((customer) => (
                                  <SelectItem key={customer.id} value={customer.id}>
                                    {customer.name} {customer.phone && `(${customer.phone})`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="customerName">Nama Pelanggan</Label>
                            <Input
                              id="customerName"
                              placeholder="Masukkan nama pelanggan"
                              value={customerName}
                              onChange={(e) => setCustomerName(e.target.value)}
                              disabled={selectedCustomer !== '' && selectedCustomer !== 'manual'}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="customerPhone">No. Telepon</Label>
                            <Input
                              id="customerPhone"
                              placeholder="Masukkan no. telepon"
                              value={customerPhone}
                              onChange={(e) => setCustomerPhone(e.target.value)}
                              disabled={selectedCustomer !== '' && selectedCustomer !== 'manual'}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="discount">Diskon (%)</Label>
                            <Input
                              id="discount"
                              type="number"
                              min="0"
                              max="100"
                              placeholder="0"
                              value={discount || ''}
                              onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="notes">Catatan</Label>
                            <Textarea
                              id="notes"
                              placeholder="Catatan tambahan..."
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                            />
                          </div>

                          <Separator />

                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Subtotal:</span>
                              <span>Rp {subtotal.toLocaleString('id-ID')}</span>
                            </div>
                            {discount > 0 && (
                              <div className="flex justify-between text-sm text-red-600">
                                <span>Diskon ({discount}%):</span>
                                <span>-Rp {discountAmount.toLocaleString('id-ID')}</span>
                              </div>
                            )}
                            <div className="flex justify-between font-bold text-lg">
                              <span>Total:</span>
                              <span>Rp {total.toLocaleString('id-ID')}</span>
                            </div>
                          </div>

                          <Button 
                            className="w-full" 
                            size="lg"
                            onClick={processPayment}
                            disabled={isProcessingPayment}
                          >
                            {isProcessingPayment ? 'Memproses...' : 'Proses Pembayaran'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
