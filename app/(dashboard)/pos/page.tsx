'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, Printer, Scan } from 'lucide-react';
import { toast } from 'sonner';
import { Logo } from '@/components/ui/logo';
import usbPrinter, { isUSBPrintSupported } from '@/lib/usb-printer';
import { thermalPrinter } from '@/lib/thermal-printer';

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
  customPrice?: number; // Harga custom untuk nego (optional)
  substituteFromVariantId?: string; // ID variant yang actual dijual (jika substitute)
  substituteFromSize?: string; // Nama size yang actual dijual (untuk display)
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

interface DraftOrder {
  id: string;
  name: string;
  cart: CartItem[];
  customer?: {
    id?: string;
    name?: string;
    phone?: string;
    address?: string;
  };
  notes?: string;
  discount: number;
  timestamp: number;
  total: number;
}

export default function POSPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  
  // Substitute modal states
  const [isSubstituteModalOpen, setIsSubstituteModalOpen] = useState(false);
  const [substituteTargetVariant, setSubstituteTargetVariant] = useState<ProductVariant | null>(null); // Variant yang dipesan (stok 0)
  const [availableSubstitutes, setAvailableSubstitutes] = useState<ProductVariant[]>([]); // List variant pengganti
  
  // Print receipt states
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<any>(null);
  
  // Barcode scanner states
  const [scannerBuffer, setScannerBuffer] = useState<string>('');
  const [isScannerActive, setIsScannerActive] = useState<boolean>(true);
  const scannerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Cascade dropdown states
  const [selectedProduct, setSelectedProduct] = useState<string>(''); // Product ID
  const [selectedSize, setSelectedSize] = useState<string>(''); // Size name
  const [selectedColor, setSelectedColor] = useState<string>(''); // Color name
  const [customPrice, setCustomPrice] = useState<string>(''); // Custom price untuk nego

  // Draft states
    // Helper: calculate total belanja
    function calculateTotal() {
      return cart.reduce((sum, item) => {
        const price = item.customPrice ?? item.variant.sellingPrice ?? item.variant.product.sellingPrice;
        return sum + (price * item.quantity);
      }, 0);
    }
  const [drafts, setDrafts] = useState<DraftOrder[]>([]);
  const [isDraftsDialogOpen, setIsDraftsDialogOpen] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  // Untuk auto-hapus draft setelah transaksi
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);

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

  // Get available sizes for selected product (SEMUA size termasuk stok 0)
  const availableSizes = useMemo(() => {
    if (!selectedProduct) return [];
    
    const sizes = new Set<string>();
    allProducts
      .filter(v => v.product.id === selectedProduct) // Tampilkan semua size, tidak filter stok
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

  // Get total stock for each size
  const getSizeStockInfo = useCallback((sizeName: string) => {
    if (!selectedProduct) return 0;
    let totalStock = 0;
    allProducts
      .filter(v => v.product.id === selectedProduct && v.size.name === sizeName)
      .forEach(v => {
        totalStock += getAvailableStock(v.id, v.stock);
      });
    return totalStock;
  }, [allProducts, selectedProduct, getAvailableStock]);

  // Get available colors for selected product and size (SEMUA warna termasuk stok 0)
  const availableColors = useMemo(() => {
    if (!selectedProduct || !selectedSize) return [];
    
    const colors: Array<{ name: string; hexCode: string; stock: number; variantId: string }> = [];
    allProducts
      .filter(v => v.product.id === selectedProduct && v.size.name === selectedSize) // Tampilkan semua warna
      .forEach(v => {
        const availableStock = getAvailableStock(v.id, v.stock);
        colors.push({
          name: v.color.name,
          hexCode: v.color.hexCode || '',
          stock: availableStock, // Tetap tampilkan meski stok 0
          variantId: v.id
        });
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
    
    // Load cart dari localStorage
    try {
      const savedCart = localStorage.getItem('pos_cart');
      const savedCustomerData = localStorage.getItem('pos_customer');
      
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);
        setCart(parsedCart);
      }
      
      if (savedCustomerData) {
        const customerData = JSON.parse(savedCustomerData);
        setSelectedCustomer(customerData.selectedCustomer || '');
        setCustomerName(customerData.customerName || '');
        setCustomerPhone(customerData.customerPhone || '');
        setCustomerAddress(customerData.customerAddress || '');
        setNotes(customerData.notes || '');
        setDiscount(customerData.discount || 0);
      }
    } catch (error) {
      console.error('Error loading cart from localStorage:', error);
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    try {
      if (cart.length > 0) {
        localStorage.setItem('pos_cart', JSON.stringify(cart));
      } else {
        localStorage.removeItem('pos_cart');
      }
    } catch (error) {
      console.error('Error saving cart to localStorage:', error);
    }
  }, [cart]);

  // Save customer data to localStorage whenever it changes
  useEffect(() => {
    try {
      const customerData = {
        selectedCustomer,
        customerName,
        customerPhone,
        customerAddress,
        notes,
        discount
      };
      
      if (customerName || customerPhone || notes || discount > 0) {
        localStorage.setItem('pos_customer', JSON.stringify(customerData));
      } else {
        localStorage.removeItem('pos_customer');
      }
    } catch (error) {
      console.error('Error saving customer data to localStorage:', error);
    }
  }, [selectedCustomer, customerName, customerPhone, customerAddress, notes, discount]);

  // Debounced search
  useEffect(() => {
    if (allProducts.length === 0) return; // Don't search if products not loaded yet
    
    const timer = setTimeout(() => {
      searchProducts(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, allProducts, searchProducts]);

  // Barcode Scanner - Keyboard Listener
  useEffect(() => {
    if (!isScannerActive) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore jika user sedang ketik di input field
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Ignore jika dialog terbuka
      if (document.querySelector('[role="dialog"]')) {
        return;
      }

      // Clear timeout sebelumnya
      if (scannerTimeoutRef.current) {
        clearTimeout(scannerTimeoutRef.current);
      }

      // Jika Enter ditekan, process barcode
      if (e.key === 'Enter' && scannerBuffer.length > 0) {
        e.preventDefault();
        handleBarcodeScanned(scannerBuffer.trim());
        setScannerBuffer('');
        return;
      }

      // Jika karakter biasa, tambahkan ke buffer
      if (e.key.length === 1) {
        setScannerBuffer(prev => prev + e.key);
        
        // Auto-reset buffer setelah 100ms (jika tidak ada input lagi)
        scannerTimeoutRef.current = setTimeout(() => {
          setScannerBuffer('');
        }, 100);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      if (scannerTimeoutRef.current) {
        clearTimeout(scannerTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScannerActive, scannerBuffer]);

  // Handle Barcode Scanned
  const handleBarcodeScanned = useCallback(async (barcode: string) => {
    console.log('Barcode scanned:', barcode);
    
    // Cari variant berdasarkan barcode
    const variant = allProducts.find(v => v.barcode === barcode);
    
    if (!variant) {
      toast.error(`Barcode tidak ditemukan: ${barcode}`);
      return;
    }

    // Cek apakah sudah ada di cart
    const existingItem = cart.find(item => item.variant.id === variant.id);
    
    if (existingItem) {
      // Cek stok tersedia
      const availableStock = getAvailableStock(variant.id, variant.stock);
      
      if (availableStock <= 0) {
        toast.error(`Stok ${variant.product.name} (${variant.size.name} - ${variant.color.name}) habis!`);
        return;
      }
      
      // Tambah quantity
      updateQuantity(variant.id, existingItem.quantity + 1);
      toast.success(`${variant.product.name} (${variant.size.name} - ${variant.color.name}) +1`, {
        icon: '📦',
        duration: 2000,
      });
    } else {
      // Cek stok
      if (variant.stock <= 0) {
        toast.error(`Stok ${variant.product.name} (${variant.size.name} - ${variant.color.name}) habis!`);
        return;
      }
      
      // Tambah item baru ke cart
      const newItem: CartItem = {
        variant: variant,
        quantity: 1,
      };
      
      setCart(prev => [...prev, newItem]);
      toast.success(`${variant.product.name} (${variant.size.name} - ${variant.color.name}) ditambahkan ke keranjang`, {
        icon: '✅',
        duration: 2000,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allProducts, cart, getAvailableStock]);

  // Process barcode from URL query parameter (from other pages)
  useEffect(() => {
    const barcodeFromUrl = searchParams.get('scan');
    
    if (barcodeFromUrl && allProducts.length > 0) {
      // Wait a bit for page to fully load
      setTimeout(() => {
        handleBarcodeScanned(barcodeFromUrl);
        
        // Clean URL (remove query parameter)
        router.replace('/pos', { scroll: false });
      }, 500);
    }
  }, [searchParams, allProducts, handleBarcodeScanned, router]);

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
    setCustomPrice(''); // Reset custom price
  };

  // Open substitute modal - cari size lain yang available
  const openSubstituteModal = (targetVariant: ProductVariant) => {
    // Cari variant lain dari product yang sama, color sama, tapi size berbeda dan stok > 0
    const substitutes = allProducts.filter(v => {
      const isSameProduct = v.product.id === targetVariant.product.id;
      const isSameColor = v.color.name === targetVariant.color.name;
      const isDifferentSize = v.size.name !== targetVariant.size.name;
      const hasStock = v.stock > 0;
      const notInCart = !cart.some(item => item.variant.id === v.id);
      
      return isSameProduct && isSameColor && isDifferentSize && hasStock && notInCart;
    });
    
    setSubstituteTargetVariant(targetVariant);
    setAvailableSubstitutes(substitutes);
    setIsSubstituteModalOpen(true);
  };

  // Add to cart with substitute
  const handleSubstituteAdd = (substituteVariant: ProductVariant, customPriceValue?: number) => {
    if (!substituteTargetVariant) return;
    
    // Cek apakah kombinasi variant + substitute sudah ada di cart
    const existingItem = cart.find(item => 
      item.variant.id === substituteTargetVariant.id && 
      item.substituteFromVariantId === substituteVariant.id
    );
    
    if (existingItem) {
      // Jika sudah ada, tambah quantity
      const availableStock = getAvailableStock(substituteVariant.id, substituteVariant.stock);
      if (existingItem.quantity >= availableStock) {
        toast.error('Stok tidak mencukupi');
        return;
      }
      setCart(cart.map(item => 
        item.variant.id === substituteTargetVariant.id && item.substituteFromVariantId === substituteVariant.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
      toast.success('Quantity ditambah');
    } else {
      // Jika belum ada, tambah item baru
      setCart([...cart, { 
        variant: substituteTargetVariant, // Variant yang dipesan customer (M)
        quantity: 1,
        customPrice: customPriceValue,
        substituteFromVariantId: substituteVariant.id, // Variant yang actual dijual (S)
        substituteFromSize: substituteVariant.size.name // Nama size actual ("S")
      }]);
      toast.success(`${substituteTargetVariant.product.name} ${substituteTargetVariant.size.name} ditambahkan (diganti dari ${substituteVariant.size.name})`);
    }
    
    setIsSubstituteModalOpen(false);
    setSubstituteTargetVariant(null);
    setAvailableSubstitutes([]);
    setCustomPrice(''); // Reset custom price
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
    
    // Parse custom price jika diisi
    const parsedCustomPrice = customPrice ? parseFloat(customPrice) : undefined;
    if (customPrice && (isNaN(parsedCustomPrice!) || parsedCustomPrice! <= 0)) {
      toast.error('Harga custom tidak valid');
      return;
    }
    
    addToCart(selectedVariantData, parsedCustomPrice);
    setCustomPrice(''); // Reset custom price setelah add
    // Jangan reset selection agar filter tetap terpilih
  };

  // Clear all filters and selections
  const clearAllFilters = () => {
    setSearchTerm('');
    resetSelection();
  };

  // Add to cart with optional custom price
  const addToCart = (variant: ProductVariant, customPriceValue?: number) => {
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
      setCart([...cart, { 
        variant, 
        quantity: 1,
        customPrice: customPriceValue // Simpan custom price jika ada
      }]);
      toast.success(`${variant.product.name} ditambahkan ke keranjang`);
    }
  };

  // Update quantity
  const updateQuantity = (variantId: string, newQuantity: number, substituteFromVariantId?: string) => {
    if (newQuantity <= 0) {
      removeFromCart(variantId, substituteFromVariantId);
      return;
    }

    // Find the actual variant to check stock (substitute if exists, otherwise original)
    const cartItem = cart.find(item => {
      if (substituteFromVariantId) {
        return item.variant.id === variantId && item.substituteFromVariantId === substituteFromVariantId;
      }
      return item.variant.id === variantId && !item.substituteFromVariantId;
    });
    
    if (cartItem) {
      // Check stock from substitute variant if exists, otherwise from original variant
      const variantToCheck = substituteFromVariantId 
        ? allProducts.find(v => v.id === substituteFromVariantId)
        : cartItem.variant;
      
      if (variantToCheck && newQuantity > variantToCheck.stock) {
        toast.error('Stok tidak mencukupi');
        return;
      }
    }

    setCart(cart.map(item => {
      if (substituteFromVariantId) {
        return (item.variant.id === variantId && item.substituteFromVariantId === substituteFromVariantId)
          ? { ...item, quantity: newQuantity }
          : item;
      }
      return (item.variant.id === variantId && !item.substituteFromVariantId)
        ? { ...item, quantity: newQuantity }
        : item;
    }));
  };

  // Update custom price for cart item
  const updatePrice = (variantId: string, newPrice: number | undefined, substituteFromVariantId?: string) => {
    setCart(cart.map(item => {
      if (substituteFromVariantId) {
        return (item.variant.id === variantId && item.substituteFromVariantId === substituteFromVariantId)
          ? { ...item, customPrice: newPrice }
          : item;
      }
      return (item.variant.id === variantId && !item.substituteFromVariantId)
        ? { ...item, customPrice: newPrice }
        : item;
    }));
  };

  // Remove from cart
  const removeFromCart = (variantId: string, substituteFromVariantId?: string) => {
    setCart(cart.filter(item => {
      if (substituteFromVariantId) {
        return !(item.variant.id === variantId && item.substituteFromVariantId === substituteFromVariantId);
      }
      return !(item.variant.id === variantId && !item.substituteFromVariantId);
    }));
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
    
    // Clear localStorage
    try {
      localStorage.removeItem('pos_cart');
      localStorage.removeItem('pos_customer');
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  };

  // ========== DRAFT MANAGEMENT ==========
  
  // Load drafts from localStorage
  useEffect(() => {
    try {
      const savedDrafts = localStorage.getItem('pos_drafts');
      if (savedDrafts) {
        setDrafts(JSON.parse(savedDrafts));
      }
    } catch (error) {
      console.error('Error loading drafts:', error);
    }
  }, []);

  // Save draft
  const saveDraft = () => {
    if (cart.length === 0) {
      toast.error('Keranjang kosong, tidak bisa simpan draft');
      return;
    }

    if (!draftName.trim()) {
      toast.error('Masukkan nama draft terlebih dahulu');
      return;
    }

    setIsSavingDraft(true);
    try {
      const newDraft: DraftOrder = {
        id: Date.now().toString(),
        name: draftName.trim(),
        cart: [...cart],
        customer: {
          id: selectedCustomer || undefined,
          name: customerName || undefined,
          phone: customerPhone || undefined,
          address: customerAddress || undefined,
        },
        notes: notes || undefined,
        discount,
        timestamp: Date.now(),
        total: calculateTotal(),
      };

      const updatedDrafts = [...drafts, newDraft];
      setDrafts(updatedDrafts);
      localStorage.setItem('pos_drafts', JSON.stringify(updatedDrafts));

      toast.success(`Draft "${draftName}" berhasil disimpan`);
      setDraftName('');
      setIsDraftsDialogOpen(false);
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('Gagal menyimpan draft');
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Load draft
  const loadDraft = (draft: DraftOrder) => {
    try {
      setCart(draft.cart);
      setSelectedCustomer(draft.customer?.id || '');
      setCustomerName(draft.customer?.name || '');
      setCustomerPhone(draft.customer?.phone || '');
      setCustomerAddress(draft.customer?.address || '');
      setNotes(draft.notes || '');
      setDiscount(draft.discount);
      setActiveDraftId(draft.id); // Simpan id draft yang sedang dimuat

      toast.success(`Draft "${draft.name}" dimuat`);
      setIsDraftsDialogOpen(false);
    } catch (error) {
      console.error('Error loading draft:', error);
      toast.error('Gagal memuat draft');
    }
  };

  // Delete draft
  const deleteDraft = (draftId: string) => {
    try {
      const updatedDrafts = drafts.filter(d => d.id !== draftId);
      setDrafts(updatedDrafts);
      localStorage.setItem('pos_drafts', JSON.stringify(updatedDrafts));
      toast.success('Draft dihapus');
    } catch (error) {
      console.error('Error deleting draft:', error);
      toast.error('Gagal menghapus draft');
    }
  };

  // ========== END DRAFT MANAGEMENT ==========

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
    // Gunakan customPrice jika ada, fallback ke default price
    const price = item.customPrice ?? item.variant.sellingPrice ?? item.variant.product.sellingPrice;
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
  const price = item.customPrice ?? item.variant.sellingPrice ?? item.variant.product.sellingPrice;
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

  // Print receipt via USB
  const handlePrintUSB = async () => {
    if (!lastTransaction) {
      toast.error('Data transaksi tidak ditemukan');
      return;
    }

    try {
      // Connect to USB printer
      const connected = await usbPrinter.connect();
      if (!connected) {
        toast.error('Gagal connect ke printer USB');
        return;
      }

      // Prepare receipt data
      const receiptData = {
        invoiceNumber: lastTransaction.invoiceNumber,
        date: new Date(lastTransaction.createdAt).toLocaleString('id-ID'),
        customerName: lastTransaction.supplier?.name,
        items: lastTransaction.items.map((item: any) => ({
          name: item.variant?.product?.name || item.product?.name || 'Product',
          variant: item.variant ? `${item.variant.size?.name} • ${item.variant.color?.name}` : '',
          quantity: item.quantity,
          price: item.unitPrice,
          subtotal: item.totalPrice
        })),
        totalAmount: lastTransaction.totalAmount,
        notes: lastTransaction.notes
      };

      await usbPrinter.printReceipt(receiptData);
      toast.success('Print berhasil!');
      
    } catch (error: any) {
      console.error('USB Print error:', error);
      toast.error(error.message || 'Gagal print via USB');
    }
  };

  // Print receipt via Bluetooth
  const handlePrintBluetooth = async () => {
    if (!lastTransaction) {
      toast.error('Data transaksi tidak ditemukan');
      return;
    }

    try {
      // Connect to Bluetooth printer
      const connected = await thermalPrinter.connect();
      if (!connected) {
        toast.error('Gagal connect ke printer Bluetooth');
        return;
      }

      // Prepare receipt data
      const receiptData = {
        invoiceNumber: lastTransaction.invoiceNumber,
        date: new Date(lastTransaction.createdAt).toLocaleString('id-ID'),
        customerName: lastTransaction.supplier?.name,
        items: lastTransaction.items.map((item: any) => ({
          name: item.variant?.product?.name || item.product?.name || 'Product',
          variant: item.variant ? `${item.variant.size?.name} • ${item.variant.color?.name}` : '',
          quantity: item.quantity,
          price: item.unitPrice,
          subtotal: item.totalPrice
        })),
        totalAmount: lastTransaction.totalAmount,
        notes: lastTransaction.notes
      };

      await thermalPrinter.printReceipt(receiptData);
      toast.success('Print berhasil!');
      
    } catch (error: any) {
      console.error('Bluetooth Print error:', error);
      toast.error(error.message || 'Gagal print via Bluetooth');
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
            quantity: item.quantity,
            // Kirim customPrice jika ada (harga nego)
            price: item.customPrice ?? item.variant.sellingPrice ?? item.variant.product.sellingPrice,
            // Kirim substituteFromVariantId jika item adalah substitute
            substituteFromVariantId: item.substituteFromVariantId
          })),
          discount,
          notes
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Transaksi berhasil diproses!');
        
        // Simpan transaction data untuk print
        setLastTransaction(data.transaction);
        
        // Send WhatsApp if enabled
        if (sendWhatsApp && customerPhone.trim()) {
          await handleSendWhatsApp(data.transaction);
        }
        
        // Jika transaksi dari draft, hapus draft tersebut
        if (activeDraftId) {
          const updatedDrafts = drafts.filter(d => d.id !== activeDraftId);
          setDrafts(updatedDrafts);
          localStorage.setItem('pos_drafts', JSON.stringify(updatedDrafts));
          setActiveDraftId(null);
        }
        
        clearCart();
        setIsCheckoutOpen(false);
        
        // Show print dialog
        setIsPrintDialogOpen(true);
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
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Memuat Penjualan</h2>
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Penjualan</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Sistem kasir 3PACHINO
          </p>
        </div>
        
        {/* Scanner Status Indicator */}
        <div className="flex items-center gap-3">
          <div 
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
              isScannerActive 
                ? 'bg-green-50 border-green-500 text-green-700' 
                : 'bg-gray-50 border-gray-300 text-gray-500'
            }`}
            title={isScannerActive ? 'Scanner aktif - Siap menerima scan' : 'Scanner nonaktif'}
          >
            <Scan className={`h-4 w-4 ${isScannerActive ? 'animate-pulse' : ''}`} />
            <span className="text-sm font-medium hidden sm:inline">
              {isScannerActive ? 'Scanner Aktif' : 'Scanner Nonaktif'}
            </span>
            <div className={`w-2 h-2 rounded-full ${isScannerActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsScannerActive(!isScannerActive)}
            className="hidden sm:flex"
          >
            {isScannerActive ? 'Nonaktifkan' : 'Aktifkan'} Scanner
          </Button>
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
                {/* Search Input - Dinonaktifkan
                <Input
                  placeholder="Cari produk, SKU, atau scan barcode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="text-base sm:text-lg"
                />
                */}

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
                          {availableSizes.map((size: string) => {
                            const sizeStock = getSizeStockInfo(size);
                            return (
                              <SelectItem 
                                key={size} 
                                value={size}
                              >
                                <div className="flex items-center gap-2">
                                  <span className={sizeStock === 0 ? 'text-gray-400' : ''}>
                                    {size} (Stok: {sizeStock})
                                  </span>
                                  {sizeStock === 0 && (
                                    <span className="text-xs text-red-500 font-semibold">• HABIS</span>
                                  )}
                                </div>
                              </SelectItem>
                            );
                          })}
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
                            <SelectItem 
                              key={color.name} 
                              value={color.name}
                            >
                              <div className="flex items-center gap-2">
                                {color.hexCode && (
                                  <span
                                    className="w-4 h-4 rounded-full border inline-block"
                                    style={{ backgroundColor: color.hexCode }}
                                  />
                                )}
                                <span className={color.stock === 0 ? 'text-gray-400' : ''}>
                                  {color.name} (Stok: {color.stock})
                                </span>
                                {color.stock === 0 && (
                                  <span className="text-xs text-red-500 font-semibold">• HABIS</span>
                                )}
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
                          
                          {/* Harga Default */}
                          <div className="pt-2">
                            <p className="text-xs text-muted-foreground mb-1">Harga Default:</p>
                            <p className="text-lg font-bold text-primary">
                              Rp {(selectedVariantData.sellingPrice || selectedVariantData.product.sellingPrice).toLocaleString('id-ID')}
                            </p>
                          </div>

                          {/* Input Harga Custom (Optional) - NEGO */}
                          <div className="pt-2 space-y-1">
                            <Label htmlFor="custom-price" className="text-xs font-medium text-gray-700">
                              Harga Jual (Opsional - untuk nego):
                            </Label>
                            <Input
                              id="custom-price"
                              type="number"
                              placeholder="Kosongkan untuk pakai harga default"
                              value={customPrice}
                              onChange={(e) => setCustomPrice(e.target.value)}
                              className="text-sm"
                              min="0"
                              step="1000"
                            />
                            {customPrice && (
                              <p className="text-xs text-blue-600">
                                💰 Harga jual: Rp {parseFloat(customPrice).toLocaleString('id-ID')}
                              </p>
                            )}
                          </div>

                          {/* Stock & Add Button OR Substitute Button */}
                          <div className="pt-2">
                            {getAvailableStock(selectedVariantData.id, selectedVariantData.stock) > 0 ? (
                              // Stock Available - Show normal add button
                              <div className="flex justify-between items-center">
                                <p className="text-xs text-muted-foreground">
                                  Stok tersedia: {getAvailableStock(selectedVariantData.id, selectedVariantData.stock)}
                                </p>
                                <Button
                                  onClick={addSelectedToCart}
                                  size="lg"
                                  className="gap-2"
                                >
                                  <ShoppingCart className="h-4 w-4" />
                                  Tambah
                                </Button>
                              </div>
                            ) : (
                              // Stock Habis - Show substitute button
                              <div className="space-y-2">
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                  <div className="flex items-center gap-2 text-red-700 mb-2">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <p className="text-sm font-semibold">Stok Habis!</p>
                                  </div>
                                  <p className="text-xs text-red-600 mb-3">
                                    Size {selectedVariantData.size.name} tidak tersedia
                                  </p>
                                  <Button
                                    onClick={() => openSubstituteModal(selectedVariantData)}
                                    variant="outline"
                                    size="sm"
                                    className="w-full gap-2 border-orange-300 bg-orange-50 hover:bg-orange-100 text-orange-700"
                                  >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                    </svg>
                                    Ganti dengan Size Lain
                                  </Button>
                                </div>
                              </div>
                            )}
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
                          Menampilkan {searchResults.length} produk untuk &quot;{searchTerm}&quot;
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
                              Tidak ada produk yang ditemukan untuk &quot;{searchTerm}&quot;
                            </div>
                          </div>
                        )}
                      </>
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
                <div className="flex gap-2">
                  {/* Lihat Drafts Button */}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsDraftsDialogOpen(true)}
                    className="text-xs sm:text-sm"
                  >
                    📋 Drafts {drafts.length > 0 && `(${drafts.length})`}
                  </Button>
                  
                  {/* Clear Cart Button */}
                  {cart.length > 0 && (
                    <Button variant="outline" size="sm" onClick={clearCart}>
                      <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  )}
                </div>
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
                      {cart.map((item) => {
                        const defaultPrice = item.variant.sellingPrice || item.variant.product.sellingPrice;
                        const currentPrice = item.customPrice ?? defaultPrice;
                        const isCustomPrice = item.customPrice !== undefined;
                        // Create unique key: combine variant.id with substituteFromVariantId if exists
                        const uniqueKey = item.substituteFromVariantId 
                          ? `${item.variant.id}-sub-${item.substituteFromVariantId}`
                          : item.variant.id;
                        
                        return (
                          <div key={uniqueKey} className="flex flex-col gap-2 p-2 sm:p-3 border rounded-lg">
                            {/* Row 1: Product Info & Qty Controls */}
                            <div className="flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-xs sm:text-sm leading-tight">
                                  {item.variant.product.name}
                                </h4>
                                <div className="flex gap-1 mt-1 flex-wrap">
                                  <Badge variant="outline" className="text-xs">
                                    {item.variant.size.name}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {item.variant.color.name}
                                  </Badge>
                                  {item.substituteFromSize && (
                                    <Badge variant="default" className="text-xs bg-orange-500 hover:bg-orange-600">
                                      🔄 Diganti dari {item.substituteFromSize}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 sm:gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => updateQuantity(item.variant.id, item.quantity - 1, item.substituteFromVariantId)}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-6 sm:w-8 text-center text-xs sm:text-sm font-medium">{item.quantity}</span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => updateQuantity(item.variant.id, item.quantity + 1, item.substituteFromVariantId)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>

                            {/* Row 2: Price Info & Edit */}
                            <div className="flex items-center gap-2 border-t pt-2">
                              <div className="flex-1 space-y-1">
                                <div className="text-[10px] text-muted-foreground">
                                  Default: Rp {defaultPrice.toLocaleString('id-ID')}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Label htmlFor={`price-${item.variant.id}`} className="text-xs font-medium whitespace-nowrap">
                                    Harga Jual:
                                  </Label>
                                  <Input
                                    id={`price-${item.variant.id}`}
                                    type="number"
                                    value={item.customPrice ?? ''}
                                    placeholder={defaultPrice.toString()}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      updatePrice(item.variant.id, val ? parseFloat(val) : undefined, item.substituteFromVariantId);
                                    }}
                                    className="h-8 text-xs flex-1"
                                    min="0"
                                    step="1000"
                                  />
                                </div>
                                {isCustomPrice && (
                                  <div className="text-[10px] text-blue-600">
                                    💰 Harga custom (nego)
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-xs font-bold">
                                  Rp {(currentPrice * item.quantity).toLocaleString('id-ID')}
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                  @{currentPrice.toLocaleString('id-ID')}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
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

                          {/* Simpan Draft Button */}
                          <Button 
                            className="w-full" 
                            size="lg"
                            variant="outline"
                            onClick={() => {
                              setIsCheckoutOpen(false);
                              setIsDraftsDialogOpen(true);
                            }}
                          >
                            💾 Simpan sebagai Draft
                          </Button>

                          {/* Proses Pembayaran Button */}
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

          {/* Substitute Size Modal - Moved outside cart conditional */}
          <Dialog open={isSubstituteModalOpen} onOpenChange={setIsSubstituteModalOpen}>
            <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl">Pilih Size Pengganti</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 sm:space-y-4">
                {substituteTargetVariant && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-700">
                      <strong>Diminta:</strong> {substituteTargetVariant.product.name} - Size {substituteTargetVariant.size.name} ({substituteTargetVariant.color.name})
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                      Stok habis! Pilih size lain sebagai pengganti.
                    </p>
                  </div>
                )}

                {availableSubstitutes.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <p>Tidak ada size pengganti yang tersedia</p>
                    <p className="text-xs mt-2">Semua size lain juga habis atau sudah ada di keranjang</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {availableSubstitutes.map((substitute) => (
                      <div 
                        key={substitute.id}
                        className="p-3 border rounded-md hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-sm">
                              Size {substitute.size.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Stok: {substitute.stock} pcs
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Harga: Rp {(substitute.sellingPrice ?? substitute.product.sellingPrice).toLocaleString('id-ID')}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => {
                              const parsedPrice = customPrice ? parseFloat(customPrice) : undefined;
                              handleSubstituteAdd(substitute, parsedPrice);
                              setIsSubstituteModalOpen(false);
                              setSubstituteTargetVariant(null);
                              setAvailableSubstitutes([]);
                            }}
                            className="ml-3"
                          >
                            Pilih
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setIsSubstituteModalOpen(false);
                    setSubstituteTargetVariant(null);
                    setAvailableSubstitutes([]);
                  }}
                >
                  Batal
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Print Receipt Dialog */}
          <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
            <DialogContent className="w-[95vw] max-w-md">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl">Print Struk</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 sm:space-y-4">
                <p className="text-sm text-muted-foreground">
                  Pilih metode print untuk mencetak struk transaksi
                </p>

                {/* Print USB Button */}
                {isUSBPrintSupported() && (
                  <Button
                    variant="outline"
                    className="w-full h-auto py-4 flex-col gap-2"
                    onClick={async () => {
                      await handlePrintUSB();
                      setIsPrintDialogOpen(false);
                      router.push('/sales');
                    }}
                  >
                    <Printer className="h-6 w-6" />
                    <div className="text-center">
                      <div className="font-semibold">Print via USB</div>
                      <div className="text-xs text-muted-foreground">
                        Untuk PC/Laptop dengan printer USB
                      </div>
                    </div>
                  </Button>
                )}

                {/* Print Bluetooth Button */}
                {thermalPrinter.isBluetoothSupported() && (
                  <Button
                    variant="outline"
                    className="w-full h-auto py-4 flex-col gap-2"
                    onClick={async () => {
                      await handlePrintBluetooth();
                      setIsPrintDialogOpen(false);
                      router.push('/sales');
                    }}
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                    </svg>
                    <div className="text-center">
                      <div className="font-semibold">Print via Bluetooth</div>
                      <div className="text-xs text-muted-foreground">
                        Untuk mobile/tablet dengan printer Bluetooth
                      </div>
                    </div>
                  </Button>
                )}

                {/* Skip Print Button */}
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setIsPrintDialogOpen(false);
                    router.push('/sales');
                  }}
                >
                  Lewati Print
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Drafts Dialog */}
          <Dialog open={isDraftsDialogOpen} onOpenChange={setIsDraftsDialogOpen}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>📋 Draft Orders</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                {/* Simpan Draft Baru Section */}
                {cart.length > 0 && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4 space-y-3">
                      <h3 className="font-semibold text-sm">Simpan Keranjang Saat Ini</h3>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Nama draft (contoh: Pelanggan A, Order Pagi, dll)"
                          value={draftName}
                          onChange={(e) => setDraftName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && draftName.trim()) {
                              saveDraft();
                            }
                          }}
                        />
                        <Button 
                          onClick={saveDraft} 
                          disabled={isSavingDraft || !draftName.trim()}
                        >
                          {isSavingDraft ? 'Menyimpan...' : '💾 Simpan'}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Total keranjang: Rp {calculateTotal().toLocaleString('id-ID')} • {cart.length} item
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Daftar Draft */}
                <div>
                  <h3 className="font-semibold mb-3">Draft Tersimpan ({drafts.length})</h3>
                  
                  {drafts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Belum ada draft tersimpan</p>
                      <p className="text-sm mt-1">Simpan keranjang sebagai draft untuk melanjutkan nanti</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {drafts
                        .sort((a, b) => b.timestamp - a.timestamp) // Sort by newest first
                        .map((draft) => (
                          <Card key={draft.id} className="border">
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start gap-4">
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <h4 className="font-semibold">{draft.name}</h4>
                                      <p className="text-xs text-muted-foreground">
                                        {new Date(draft.timestamp).toLocaleDateString('id-ID', {
                                          day: 'numeric',
                                          month: 'long',
                                          year: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </p>
                                    </div>
                                    <Badge variant="secondary">
                                      {draft.cart.length} item
                                    </Badge>
                                  </div>
                                  
                                  {draft.customer?.name && (
                                    <p className="text-sm">
                                      <span className="text-muted-foreground">Customer:</span> {draft.customer.name}
                                    </p>
                                  )}
                                  
                                  <p className="text-sm font-semibold text-blue-600">
                                    Total: Rp {draft.total.toLocaleString('id-ID')}
                                  </p>
                                  
                                  {draft.notes && (
                                    <p className="text-xs text-muted-foreground italic">
                                      &ldquo;{draft.notes}&rdquo;
                                    </p>
                                  )}
                                </div>
                                
                                <div className="flex flex-col gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => loadDraft(draft)}
                                  >
                                    📂 Muat
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => deleteDraft(draft.id)}
                                  >
                                    🗑️ Hapus
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
