'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  sellingPrice?: number; // Harga jual per variant
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

interface GroupedProduct {
  productId: string;
  productName: string;
  productSku: string;
  category: string;
  brand: string;
  priceRange: { min: number; max: number };
  totalStock: number;
  variantCount: number;
  sizes: string[];
  colors: Array<{ name: string; hexCode?: string }>;
  variants: ProductVariant[];
  isExpanded?: boolean;
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
  
  // Cascade dropdown states
  const [selectedProduct, setSelectedProduct] = useState<string>(''); // Product ID
  const [selectedSize, setSelectedSize] = useState<string>(''); // Size name
  const [selectedColor, setSelectedColor] = useState<string>(''); // Color name

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

  // Get available products (all products, no filter)
  const availableProducts = useMemo(() => {
    // Group by product ID (unique products only)
    const uniqueProducts = new Map<string, { id: string; name: string; brand: string; category: string }>();
    allProducts.forEach(v => {
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
  }, [allProducts]);

  // Get available sizes for selected product
  const availableSizes = useMemo(() => {
    if (!selectedProduct) return [];
    
    const sizes = new Set<string>();
    allProducts
      .filter(v => v.product.id === selectedProduct && v.stock > 0)
      .forEach(v => sizes.add(v.size.name));
    
    const sizeOrder: { [key: string]: number } = { 'S': 1, 'M': 2, 'L': 3, 'XL': 4, 'XXL': 5, 'XXXL': 6 };
    return Array.from(sizes).sort((a, b) => (sizeOrder[a] || 999) - (sizeOrder[b] || 999));
  }, [allProducts, selectedProduct]);

  // Get available stock (real stock - cart quantity)
  const getAvailableStock = useCallback((variantId: string, originalStock: number) => {
    const cartItem = cart.find(item => item.variant.id === variantId);
    const stockInCart = cartItem ? cartItem.quantity : 0;
    return originalStock - stockInCart;
  }, [cart]);

  // Get available colors for selected product and size
  const availableColors = useMemo(() => {
    if (!selectedProduct || !selectedSize) return [];
    
    const colors: Array<{ name: string; hexCode: string; stock: number; variantId: string }> = [];
    allProducts
      .filter(v => v.product.id === selectedProduct && v.size.name === selectedSize && v.stock > 0)
      .forEach(v => {
        const availableStock = getAvailableStock(v.id, v.stock);
        if (availableStock > 0) {
          colors.push({
            name: v.color.name,
            hexCode: v.color.hexCode || '',
            stock: availableStock,
            variantId: v.id
          });
        }
      });
    
    return colors.sort((a, b) => a.name.localeCompare(b.name));
  }, [allProducts, selectedProduct, selectedSize, getAvailableStock]);

  // Get selected variant data
  const selectedVariantData = useMemo(() => {
    if (!selectedProduct || !selectedSize || !selectedColor) return null;
    
    return allProducts.find(
      v => v.product.id === selectedProduct && 
           v.size.name === selectedSize && 
           v.color.name === selectedColor
    );
  }, [allProducts, selectedProduct, selectedSize, selectedColor]);

  // Get available sizes, colors, and categories
  // Search products
  const searchProducts = useCallback(async (term: string) => {
    setIsSearching(true);
    try {
      if (!term.trim()) {
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
  }, [allProducts]);

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
  }, [searchTerm, allProducts, searchProducts]);

  // Handle product selection (reset size and color)
  const handleProductChange = (productId: string) => {
    setSelectedProduct(productId);
    setSelectedSize(''); // Reset size
    setSelectedColor(''); // Reset color
  };

  // Handle size selection with smart color retention
  const handleSizeChange = (size: string) => {
    const previousColor = selectedColor;
    setSelectedSize(size);
    
    // Smart color retention: cek apakah warna sebelumnya tersedia di ukuran baru
    if (previousColor && selectedProduct) {
      const colorStillAvailable = allProducts.some(
        v => v.product.id === selectedProduct && 
             v.size.name === size && 
             v.color.name === previousColor && 
             v.stock > 0
      );
      
      if (colorStillAvailable) {
        // Retain the color if it's available
        setSelectedColor(previousColor);
      } else {
        // Reset if not available
        setSelectedColor('');
      }
    } else {
      setSelectedColor('');
    }
  };

  // Handle color selection
  const handleColorChange = (color: string) => {
    setSelectedColor(color);
  };

  // Reset all selections
  const resetSelection = () => {
    setSelectedProduct('');
    setSelectedSize('');
    setSelectedColor('');
  };

  // Add selected variant to cart
  const addSelectedToCart = () => {
    if (!selectedVariantData) {
      toast.error('Pilih produk, ukuran, dan warna terlebih dahulu');
      return;
    }
    
    const availableStock = getAvailableStock(selectedVariantData.id, selectedVariantData.stock);
    if (availableStock < 1) {
      toast.error('Stok habis atau sudah ada di keranjang');
      return;
    }
    
    addToCart(selectedVariantData);
    // Jangan reset selection agar filter tetap terpilih
  };

  // Clear all filters and selections
  const clearAllFilters = () => {
    setSearchTerm('');
    resetSelection();
  };

  // Add to cart
  const addToCart = (variant: ProductVariant) => {
    const existingItem = cart.find(item => item.variant.id === variant.id);
    const availableStock = getAvailableStock(variant.id, variant.stock);
    
    if (existingItem) {
      if (existingItem.quantity >= variant.stock) {
        toast.error('Stok tidak mencukupi');
        return;
      }
      updateQuantity(variant.id, existingItem.quantity + 1);
    } else {
      if (availableStock < 1) {
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
  const subtotal = cart.reduce((sum, item) => {
    const price = item.variant.sellingPrice || item.variant.product.sellingPrice;
    return sum + (price * item.quantity);
  }, 0);
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
  const price = item.variant.sellingPrice || item.variant.product.sellingPrice;
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
      <div className="container mx-auto p-3 sm:p-6">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-2">
          <div>
            <div className="h-6 sm:h-8 w-32 sm:w-40 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-4 w-24 sm:w-32 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>

        {/* Loading Animation Center */}
        <div className="flex items-center justify-center mb-6 sm:mb-8">
          <div className="text-center">
            <div className="relative mb-4">
              <CreditCard className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-blue-600 animate-pulse" />
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Memuat Point of Sale</h2>
            <p className="text-xs sm:text-sm text-gray-600">Menyiapkan sistem kasir...</p>
            <div className="flex items-center justify-center mt-4 space-x-1">
              <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce"></div>
              <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
          </div>
        </div>

        {/* Simple Skeleton Cards */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
          <div className="xl:col-span-2">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <div className="h-5 sm:h-6 w-20 sm:w-24 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-48 sm:h-64 bg-gray-100 rounded animate-pulse flex items-center justify-center">
                  <Search className="h-8 w-8 sm:h-12 sm:w-12 text-gray-300" />
                </div>
              </CardContent>
            </Card>
          </div>
          <div>
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <div className="h-5 sm:h-6 w-16 sm:w-20 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-48 sm:h-64 bg-gray-100 rounded animate-pulse flex items-center justify-center">
                  <ShoppingCart className="h-8 w-8 sm:h-12 sm:w-12 text-gray-300" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-3 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Point of Sale</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Sistem kasir 3PACHINO
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        {/* Product Search */}
        <div className="xl:col-span-2">
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="flex items-center justify-between text-lg sm:text-xl">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 sm:h-5 sm:w-5" />
                  Cari Produk
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    // Trigger barcode scanner (can be implemented later)
                    toast.info('Fitur barcode scanner akan segera tersedia');
                  }}
                  className="hidden sm:flex gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 5v14"></path>
                    <path d="M8 5v14"></path>
                    <path d="M12 5v14"></path>
                    <path d="M17 5v14"></path>
                    <path d="M21 5v14"></path>
                  </svg>
                  Scan Barcode
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3 sm:space-y-4">
                {/* Search Input */}
                <Input
                  placeholder="Cari produk, SKU, atau scan barcode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="text-base sm:text-lg"
                />

                {/* Dropdown Cascade - Quick Selection */}
                {!isLoadingProducts && (
                  <div className="space-y-3">
                    {/* Dropdown: Pilih Produk */}
                    <div>
                      <Label htmlFor="product-select" className="text-sm font-medium">
                        Pilih Nama Produk
                      </Label>
                      <Select value={selectedProduct} onValueChange={handleProductChange}>
                        <SelectTrigger id="product-select" className="mt-1">
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
                      <Label htmlFor="size-select" className="text-sm font-medium">
                        Pilih Ukuran
                      </Label>
                      <Select 
                        value={selectedSize} 
                        onValueChange={handleSizeChange}
                        disabled={!selectedProduct}
                      >
                        <SelectTrigger id="size-select" className="mt-1">
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
                          Tidak ada ukuran tersedia (stok habis)
                        </p>
                      )}
                    </div>

                    {/* Dropdown: Pilih Warna */}
                    <div>
                      <Label htmlFor="color-select" className="text-sm font-medium">
                        Pilih Warna
                      </Label>
                      <Select 
                        value={selectedColor} 
                        onValueChange={handleColorChange}
                        disabled={!selectedProduct || !selectedSize}
                      >
                        <SelectTrigger id="color-select" className="mt-1">
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
                          Tidak ada warna tersedia (stok habis)
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
                              <p className="text-lg font-bold text-primary">
                                Rp {(selectedVariantData.sellingPrice || selectedVariantData.product.sellingPrice).toLocaleString('id-ID')}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Stok tersedia: {getAvailableStock(selectedVariantData.id, selectedVariantData.stock)}
                              </p>
                            </div>
                            <Button
                              onClick={addSelectedToCart}
                              disabled={getAvailableStock(selectedVariantData.id, selectedVariantData.stock) < 1}
                              size="lg"
                              className="gap-2"
                            >
                              <ShoppingCart className="h-4 w-4" />
                              Tambah
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Clear Button */}
                    {(selectedProduct || searchTerm) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearAllFilters}
                        className="w-full"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                          <path d="M3 6h18"></path>
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        </svg>
                        Reset Semua
                      </Button>
                    )}
                  </div>
                )}

                {isLoadingProducts ? (
                  <div className="text-center py-8 sm:py-12">
                    <div className="flex items-center justify-center mb-4">
                      <div className="animate-pulse">
                        <Logo size="md" showText={true} usePng={true} />
                      </div>
                    </div>
                    <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">Memuat Produk</h3>
                    <p className="text-xs sm:text-sm text-gray-600">Sedang mengambil data produk terbaru...</p>
                    <div className="flex items-center justify-center mt-4 space-x-1">
                      <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce"></div>
                      <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                ) : isSearching ? (
                  <div className="text-center py-6 sm:py-8">
                    <div className="flex items-center justify-center mb-3">
                      <Search className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 animate-pulse" />
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600">Mencari produk...</p>
                    <div className="flex items-center justify-center mt-3 space-x-1">
                      <div className="h-1.5 w-1.5 bg-blue-600 rounded-full animate-bounce"></div>
                      <div className="h-1.5 w-1.5 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="h-1.5 w-1.5 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Hanya tampilkan list produk jika ada search, BUKAN dari dropdown */}
                    {searchTerm.trim() ? (
                      <>
                        <div className="text-xs sm:text-sm text-muted-foreground mb-2">
                          Menampilkan {searchResults.length} produk untuk "{searchTerm}"
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-h-96 overflow-y-auto">
                          {searchResults.map((variant) => {
                            const availableStock = getAvailableStock(variant.id, variant.stock);
                            const isOutOfStock = availableStock <= 0;
                            
                            return (
                              <Card 
                                key={variant.id} 
                                className={`cursor-pointer hover:shadow-md transition-shadow ${isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''}`} 
                                onClick={() => !isOutOfStock && addToCart(variant)}
                              >
                                <CardContent className="p-3 sm:p-4">
                                  <div className="space-y-2">
                                    <h3 className="font-medium text-sm sm:text-base leading-tight">{variant.product.name}</h3>
                                    <div className="flex flex-wrap gap-1">
                                      <Badge variant="outline" className="text-xs">
                                        {variant.size.name}
                                      </Badge>
                                      <Badge 
                                        variant="outline" 
                                        className="text-xs flex items-center gap-1"
                                        style={{ backgroundColor: variant.color.hexCode + '20', borderColor: variant.color.hexCode }}
                                      >
                                        {variant.color.hexCode && (
                                          <span
                                            className="w-2.5 h-2.5 rounded-full border inline-block"
                                            style={{ backgroundColor: variant.color.hexCode }}
                                          />
                                        )}
                                        {variant.color.name}
                                      </Badge>
                                    </div>
                                    <div className="flex justify-between items-center gap-2">
                                      <span className="font-bold text-primary text-sm sm:text-base">
                                        Rp {(variant.sellingPrice || variant.product.sellingPrice).toLocaleString('id-ID')}
                                      </span>
                                      <Badge variant={availableStock > 10 ? 'secondary' : availableStock > 0 ? 'destructive' : 'outline'} className="text-xs">
                                        Stok: {availableStock}
                                      </Badge>
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate">
                                      {variant.product.brand.name} • {variant.product.category.name}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>

                        {!isLoadingProducts && searchResults.length === 0 && (
                          <div className="text-center py-6 sm:py-8">
                            <div className="text-xs sm:text-sm text-muted-foreground">
                              Tidak ada produk yang ditemukan untuk "{searchTerm}"
                            </div>
                          </div>
                        )}
                      </>
                    ) : !selectedProduct ? (
                      <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed">
                        <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <h3 className="text-sm font-medium text-gray-900 mb-1">Pilih Produk untuk Memulai</h3>
                        <p className="text-xs text-gray-600">
                          Gunakan dropdown di atas atau ketik untuk mencari produk
                        </p>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Shopping Cart */}
        <div>
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="flex items-center justify-between text-lg sm:text-xl">
                <span className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
                  Keranjang ({cart.length})
                </span>
                {cart.length > 0 && (
                  <Button variant="outline" size="sm" onClick={clearCart}>
                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3 sm:space-y-4">
                {cart.length === 0 ? (
                  <div className="text-center py-6 sm:py-8 text-muted-foreground text-sm sm:text-base">
                    Keranjang masih kosong
                  </div>
                ) : (
                  <>
                    <div className="space-y-2 sm:space-y-3 max-h-60 sm:max-h-64 overflow-y-auto">
                      {cart.map((item) => (
                        <div key={item.variant.id} className="flex items-start gap-3 p-2 sm:p-3 border rounded-lg">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-xs sm:text-sm leading-tight">
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
                              Rp {(item.variant.sellingPrice || item.variant.product.sellingPrice).toLocaleString('id-ID')}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 sm:gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => updateQuantity(item.variant.id, item.quantity - 1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-6 sm:w-8 text-center text-xs sm:text-sm font-medium">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => updateQuantity(item.variant.id, item.quantity + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Separator />

                    <div className="space-y-1 sm:space-y-2">
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span>Subtotal:</span>
                        <span>Rp {subtotal.toLocaleString('id-ID')}</span>
                      </div>
                      {discount > 0 && (
                        <div className="flex justify-between text-xs sm:text-sm text-red-600">
                          <span>Diskon ({discount}%):</span>
                          <span>-Rp {discountAmount.toLocaleString('id-ID')}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between font-bold text-sm sm:text-base">
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
                      <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="text-lg sm:text-xl">Checkout</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3 sm:space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="customer" className="text-sm">Pilih Customer</Label>
                            <Select value={selectedCustomer} onValueChange={handleCustomerSelect}>
                              <SelectTrigger className="text-sm">
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
                            <Label htmlFor="customerName" className="text-sm">Nama Pelanggan</Label>
                            <Input
                              id="customerName"
                              placeholder="Masukkan nama pelanggan"
                              value={customerName}
                              onChange={(e) => setCustomerName(e.target.value)}
                              disabled={selectedCustomer !== '' && selectedCustomer !== 'manual'}
                              className="text-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="customerPhone" className="text-sm">No. Telepon</Label>
                            <Input
                              id="customerPhone"
                              placeholder="Masukkan no. telepon"
                              value={customerPhone}
                              onChange={(e) => setCustomerPhone(e.target.value)}
                              disabled={selectedCustomer !== '' && selectedCustomer !== 'manual'}
                              className="text-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="customerAddress" className="text-sm">Alamat</Label>
                            <Input
                              id="customerAddress"
                              placeholder="Masukkan alamat pelanggan"
                              value={customerAddress}
                              onChange={(e) => setCustomerAddress(e.target.value)}
                              disabled={selectedCustomer !== '' && selectedCustomer !== 'manual'}
                              className="text-sm"
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
                              <Label htmlFor="sendWhatsApp" className="text-xs sm:text-sm font-medium">
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
                            <Label htmlFor="discount" className="text-sm">Diskon (%)</Label>
                            <Input
                              id="discount"
                              type="number"
                              min="0"
                              max="100"
                              placeholder="0"
                              value={discount || ''}
                              onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                              className="text-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="notes" className="text-sm">Catatan</Label>
                            <Textarea
                              id="notes"
                              placeholder="Catatan tambahan..."
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              className="text-sm min-h-[60px] sm:min-h-[80px]"
                            />
                          </div>

                          <Separator />

                          <div className="space-y-1 sm:space-y-2">
                            <div className="flex justify-between text-xs sm:text-sm">
                              <span>Subtotal:</span>
                              <span>Rp {subtotal.toLocaleString('id-ID')}</span>
                            </div>
                            {discount > 0 && (
                              <div className="flex justify-between text-xs sm:text-sm text-red-600">
                                <span>Diskon ({discount}%):</span>
                                <span>-Rp {discountAmount.toLocaleString('id-ID')}</span>
                              </div>
                            )}
                            <div className="flex justify-between font-bold text-sm sm:text-lg">
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
