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
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Plus, Minus, Trash2, ShoppingCart, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { Logo } from '@/components/ui/logo';

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
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [discount, setDiscount] = useState(0);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [sendWhatsApp, setSendWhatsApp] = useState(false);

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
      setIsPageLoading(false); // Set page loading false when products are loaded
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
    setCustomerAddress('');
    setNotes('');
    setDiscount(0);
    setSendWhatsApp(false);
  };

  // Handle customer selection
  const handleCustomerSelect = (customerId: string) => {
    setSelectedCustomer(customerId);
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setCustomerName(customer.name);
      setCustomerPhone(customer.phone || '');
      setCustomerAddress(customer.address || '');
    }
  };

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + (item.variant.product.sellingPrice * item.quantity), 0);
  const discountAmount = (subtotal * discount) / 100;
  const total = subtotal - discountAmount;

  // Handle WhatsApp send
  const handleSendWhatsApp = async (transaction: any) => {
    try {
      // Format phone number (remove non-digits and ensure starts with 62)
      let phoneNumber = customerPhone.replace(/\D/g, '');
      if (phoneNumber.startsWith('0')) {
        phoneNumber = '62' + phoneNumber.substring(1);
      } else if (!phoneNumber.startsWith('62')) {
        phoneNumber = '62' + phoneNumber;
      }

      // Create receipt URL
      const receiptUrl = `${window.location.origin}/sales/${transaction.id}`;
      
      // Create WhatsApp message
      const message = `Halo! Terima kasih sudah berbelanja di 3PACHINO! 🛍️

📧 Invoice: ${transaction.invoiceNumber}
📅 Tanggal: ${new Date(transaction.transactionDate).toLocaleDateString('id-ID')}
${customerName ? `👤 Customer: ${customerName}` : ''}

🛍️ Items:
${cart.map(item => {
  const price = item.variant.product.sellingPrice;
  const itemTotal = price * item.quantity;
  return `• ${item.variant.product.name} (${item.quantity}x) ${item.variant.size.name} • ${item.variant.color.name}
  @Rp ${price.toLocaleString('id-ID')} = Rp ${itemTotal.toLocaleString('id-ID')}`;
}).join('\n')}

💰 Subtotal: Rp ${subtotal.toLocaleString('id-ID')}
${discount > 0 ? `🏷️ Diskon: ${discount}% (-Rp ${discountAmount.toLocaleString('id-ID')})` : ''}
💰 Total: Rp ${total.toLocaleString('id-ID')}

🧾 Lihat struk lengkap: ${receiptUrl}

Terima kasih telah berbelanja di 3PACHINO! 🙏`;

      // Create WhatsApp URL
      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
      
      // Open WhatsApp
      window.open(whatsappUrl, '_blank');
      
      toast.success('WhatsApp dibuka! Tinggal klik "Send" untuk kirim ke customer');
    } catch (error) {
      console.error('Error sending WhatsApp:', error);
      toast.error('Gagal membuka WhatsApp');
    }
  };

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
        
        // Send WhatsApp if enabled
        if (sendWhatsApp && customerPhone.trim()) {
          await handleSendWhatsApp(data.transaction);
        }
        
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

  // Loading full page
  if (isPageLoading) {
    return (
      <div className="container mx-auto p-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="h-8 w-40 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>

        {/* Loading Animation Center */}
        <div className="flex items-center justify-center mb-8">
          <div className="text-center">
            <div className="relative mb-4">
              <CreditCard className="h-16 w-16 mx-auto text-blue-600 animate-pulse" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Memuat Point of Sale</h2>
            <p className="text-sm text-gray-600">Menyiapkan sistem kasir...</p>
            <div className="flex items-center justify-center mt-4 space-x-1">
              <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce"></div>
              <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
          </div>
        </div>

        {/* Simple Skeleton Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <div className="h-6 w-24 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-gray-100 rounded animate-pulse flex items-center justify-center">
                  <Search className="h-12 w-12 text-gray-300" />
                </div>
              </CardContent>
            </Card>
          </div>
          <div>
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <div className="h-6 w-20 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-gray-100 rounded animate-pulse flex items-center justify-center">
                  <ShoppingCart className="h-12 w-12 text-gray-300" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

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
                  <div className="text-center py-12">
                    <div className="flex items-center justify-center mb-4">
                      <div className="animate-pulse">
                        <Logo size="lg" showText={true} usePng={true} />
                      </div>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Memuat Produk</h3>
                    <p className="text-sm text-gray-600">Sedang mengambil data produk terbaru...</p>
                    <div className="flex items-center justify-center mt-4 space-x-1">
                      <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce"></div>
                      <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                ) : isSearching ? (
                  <div className="text-center py-8">
                    <div className="flex items-center justify-center mb-3">
                      <Search className="h-8 w-8 text-blue-600 animate-pulse" />
                    </div>
                    <p className="text-sm text-gray-600">Mencari produk...</p>
                    <div className="flex items-center justify-center mt-3 space-x-1">
                      <div className="h-1.5 w-1.5 bg-blue-600 rounded-full animate-bounce"></div>
                      <div className="h-1.5 w-1.5 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="h-1.5 w-1.5 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
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
                            <Label htmlFor="customerAddress">Alamat</Label>
                            <Input
                              id="customerAddress"
                              placeholder="Masukkan alamat pelanggan"
                              value={customerAddress}
                              onChange={(e) => setCustomerAddress(e.target.value)}
                              disabled={selectedCustomer !== '' && selectedCustomer !== 'manual'}
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id="sendWhatsApp"
                                checked={sendWhatsApp}
                                onCheckedChange={(checked) => setSendWhatsApp(checked as boolean)}
                                disabled={!customerPhone.trim()}
                              />
                              <Label htmlFor="sendWhatsApp" className="text-sm font-medium">
                                📱 Kirim struk ke WhatsApp customer
                              </Label>
                            </div>
                            {!customerPhone.trim() && (
                              <p className="text-xs text-muted-foreground">
                                * Masukkan nomor telepon untuk mengaktifkan fitur ini
                              </p>
                            )}
                            {customerPhone.trim() && sendWhatsApp && (
                              <p className="text-xs text-green-600">
                                ✅ WhatsApp akan terbuka dengan pesan siap kirim
                              </p>
                            )}
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
