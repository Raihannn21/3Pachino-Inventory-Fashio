'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import BarcodeDisplay from '@/components/ui/barcode-display';
import { ArrowLeft, Plus, Edit, Package, Palette, Ruler, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface ProductVariant {
  id: string;
  stock: number;
  minStock: number;
  costPrice?: number;
  sellingPrice?: number;
  barcode?: string;
  size: {
    id: string;
    name: string;
  };
  color: {
    id: string;
    name: string;
    hexCode?: string;
  };
}

interface Product {
  id: string;
  name: string;
  sku: string;
  description?: string;
  season?: string;
  gender?: string;
  costPrice: number;
  sellingPrice: number;
  category: {
    name: string;
  };
  brand: {
    name: string;
  };
  variants: ProductVariant[];
}

interface Size {
  id: string;
  name: string;
}

interface Color {
  id: string;
  name: string;
  hexCode?: string;
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [productId, setProductId] = useState<string>('');
  const [product, setProduct] = useState<Product | null>(null);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [loading, setLoading] = useState(true);
  const [addVariantOpen, setAddVariantOpen] = useState(false);
  const [editVariantOpen, setEditVariantOpen] = useState(false);
  const [deleteVariantOpen, setDeleteVariantOpen] = useState(false);
  const [editProductOpen, setEditProductOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [variantToDelete, setVariantToDelete] = useState<ProductVariant | null>(null);

  const [variantForm, setVariantForm] = useState({
    sizeId: '',
    colorId: '',
    minStock: '5',
    sellingPrice: '',
    // For new size/color
    newSizeName: '',
    newColorName: '',
    newColorHex: '',
    useNewSize: false,
    useNewColor: false
  });
  const [productForm, setProductForm] = useState({
    name: '',
    costPrice: '',
    sellingPrice: ''
  });
  const [stockAdjustmentReason, setStockAdjustmentReason] = useState('');
  const [originalStock, setOriginalStock] = useState(0);
  const [isUpdatingProduct, setIsUpdatingProduct] = useState(false);

  useEffect(() => {
    const initParams = async () => {
      const { id } = await params;
      setProductId(id);
    };
    initParams();
  }, [params]);

  useEffect(() => {
    if (productId) {
      fetchProduct();
      fetchSizes();
      fetchColors();
    }
  }, [productId]);

  const fetchProduct = async () => {
    try {
      const response = await fetch(`/api/products/${productId}`);
      if (response.ok) {
        const data = await response.json();
        setProduct(data);
      }
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSizes = async () => {
    try {
      const response = await fetch('/api/sizes');
      if (response.ok) {
        const data = await response.json();
        setSizes(data);
      }
    } catch (error) {
      console.error('Error fetching sizes:', error);
    }
  };

  const fetchColors = async () => {
    try {
      const response = await fetch('/api/colors');
      if (response.ok) {
        const data = await response.json();
        setColors(data);
      }
    } catch (error) {
      console.error('Error fetching colors:', error);
    }
  };

  const handleAddVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      let sizeId = variantForm.sizeId;
      let colorId = variantForm.colorId;

      // Create new size if needed
      if (variantForm.useNewSize && variantForm.newSizeName.trim()) {
        const sizeResponse = await fetch('/api/sizes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: variantForm.newSizeName.trim() }),
        });
        
        if (sizeResponse.ok) {
          const newSize = await sizeResponse.json();
          sizeId = newSize.id;
          // Refresh sizes list
          fetchSizes();
        } else {
          let errorMessage = 'Gagal membuat ukuran baru';
          try {
            const errorData = await sizeResponse.json();
            errorMessage = errorData.error || errorMessage;
          } catch (e) {
            console.error('Error parsing size response:', e);
          }
          toast.error(errorMessage);
          return;
        }
      }

      // Create new color if needed
      if (variantForm.useNewColor && variantForm.newColorName.trim()) {
        const colorData: any = { name: variantForm.newColorName.trim() };
        if (variantForm.newColorHex) {
          colorData.hexCode = variantForm.newColorHex;
        }

        const colorResponse = await fetch('/api/colors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(colorData),
        });
        
        if (colorResponse.ok) {
          const newColor = await colorResponse.json();
          colorId = newColor.id;
          // Refresh colors list
          fetchColors();
        } else {
          let errorMessage = 'Gagal membuat warna baru';
          try {
            const errorData = await colorResponse.json();
            errorMessage = errorData.error || errorMessage;
          } catch (e) {
            console.error('Error parsing color response:', e);
          }
          toast.error(errorMessage);
          return;
        }
      }

      // Validate that we have both size and color
      if (!sizeId || !colorId) {
        toast.error('Ukuran dan warna harus dipilih atau dibuat');
        return;
      }

      const requestBody: any = {
        sizeId,
        colorId,
        stock: 0, // Selalu mulai dari 0
        minStock: parseInt(variantForm.minStock),
      };

      // Only include selling price if provided (cost price always same as product)
      if (variantForm.sellingPrice && variantForm.sellingPrice.trim() !== '') {
        requestBody.sellingPrice = parseFloat(variantForm.sellingPrice);
      }

      const response = await fetch(`/api/products/${productId}/variants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        setVariantForm({
          sizeId: '',
          colorId: '',
          minStock: '5',
          sellingPrice: '',
          newSizeName: '',
          newColorName: '',
          newColorHex: '',
          useNewSize: false,
          useNewColor: false
        });
        setAddVariantOpen(false);
        fetchProduct();
        toast.success('Varian berhasil ditambahkan');
      } else {
        let errorMessage = 'Gagal menambahkan varian';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          console.error('Error parsing variant response:', e);
        }
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Error adding variant:', error);
      toast.error('Gagal menambahkan varian');
    }
  };

  const handleEditVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVariant) return;

    try {
      const requestBody: any = {
        minStock: parseInt(variantForm.minStock),
      };

      // Only include selling price if provided (cost price always same as product)
      if (variantForm.sellingPrice && variantForm.sellingPrice.trim() !== '') {
        requestBody.sellingPrice = parseFloat(variantForm.sellingPrice);
      } else {
        requestBody.sellingPrice = null; // Reset to use product price
      }

      const response = await fetch(`/api/products/${productId}/variants/${selectedVariant.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        setEditVariantOpen(false);
        setSelectedVariant(null);
        fetchProduct();
        toast.success('Varian berhasil diperbarui');
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Gagal memperbarui varian');
      }
    } catch (error) {
      console.error('Error updating variant:', error);
      toast.error('Gagal memperbarui varian');
    }
  };

  const handleDeleteVariant = (variant: ProductVariant) => {
    setVariantToDelete(variant);
    setDeleteVariantOpen(true);
  };

  const confirmDeleteVariant = async () => {
    if (!variantToDelete) return;

    try {
      const response = await fetch(`/api/products/${productId}/variants/${variantToDelete.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Varian berhasil dihapus');
        setDeleteVariantOpen(false);
        setVariantToDelete(null);
        fetchProduct();
      } else {
        toast.error(data.error || 'Gagal menghapus varian');
      }
    } catch (error) {
      console.error('Error deleting variant:', error);
      toast.error('Gagal menghapus varian');
    }
  };

  const closeDeleteDialog = () => {
    setDeleteVariantOpen(false);
    setVariantToDelete(null);
  };

  const openEditProduct = () => {
    if (product) {
      setProductForm({
        name: product.name,
        costPrice: product.costPrice.toString(),
        sellingPrice: product.sellingPrice.toString()
      });
      setEditProductOpen(true);
    }
  };

  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProduct(true);
    
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: productForm.name,
          costPrice: parseFloat(productForm.costPrice),
          sellingPrice: parseFloat(productForm.sellingPrice)
        }),
      });

      if (response.ok) {
        toast.success('Produk berhasil diperbarui');
        setEditProductOpen(false);
        fetchProduct();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Gagal memperbarui produk');
      }
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Gagal memperbarui produk');
    } finally {
      setIsUpdatingProduct(false);
    }
  };

  const closeEditProduct = () => {
    setEditProductOpen(false);
    setProductForm({
      name: '',
      costPrice: '',
      sellingPrice: ''
    });
  };

  const openEditVariant = (variant: ProductVariant) => {
    setSelectedVariant(variant);
    setOriginalStock(variant.stock); // Save original stock for comparison
    setVariantForm({
      sizeId: variant.size.id,
      colorId: variant.color.id,
      minStock: variant.minStock.toString(),
      sellingPrice: variant.sellingPrice?.toString() || '',
      newSizeName: '',
      newColorName: '',
      newColorHex: '',
      useNewSize: false,
      useNewColor: false
    });
    setStockAdjustmentReason(''); // Reset reason
    setEditVariantOpen(true);
  };

  const getTotalStock = () => {
    return product?.variants.reduce((total, variant) => total + variant.stock, 0) || 0;
  };

  const getSeasonText = (season?: string) => {
    switch (season) {
      case 'ALL_SEASON': return 'Semua Musim';
      case 'SPRING_SUMMER': return 'Spring/Summer';
      case 'FALL_WINTER': return 'Fall/Winter';
      default: return season;
    }
  };

  const getGenderText = (gender?: string) => {
    switch (gender) {
      case 'UNISEX': return 'Unisex';
      case 'MALE': return 'Pria';
      case 'FEMALE': return 'Wanita';
      case 'KIDS': return 'Anak-anak';
      default: return gender;
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-8">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <Package className="h-16 w-16 animate-spin mx-auto mb-6 text-blue-600" />
            <p className="text-lg font-medium text-gray-900">Memuat detail produk...</p>
            <p className="text-sm text-muted-foreground mt-2">Mohon tunggu sebentar</p>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="text-center py-12 sm:py-16">
          <Package className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mx-auto mb-4 sm:mb-6" />
          <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3">Produk tidak ditemukan</h3>
          <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">Produk yang Anda cari tidak ada atau telah dihapus</p>
          <Button onClick={() => router.push('/products')} className="w-full sm:w-auto">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali ke Produk
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 sm:mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push('/products')}
          className="self-start sm:mr-4 hover:bg-blue-50"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-gray-900 break-words">{product.name}</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2 break-words">
            SKU: {product.sku} • {product.brand.name} • {product.category.name}
          </p>
        </div>
        <Button
          onClick={openEditProduct}
          className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
        >
          <Edit className="h-4 w-4 mr-2" />
          Edit Produk
        </Button>
      </div>

      {/* Product Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 mb-6 sm:mb-8">
        <Card className="lg:col-span-2 bg-white shadow-sm border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg sm:text-xl font-semibold text-gray-900">Informasi Produk</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600">Nama Produk</label>
                <p className="text-base sm:text-lg font-semibold text-gray-900 break-words">{product.name}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600">SKU</label>
                <p className="text-base sm:text-lg font-mono text-gray-900 break-all">{product.sku}</p>
              </div>
            </div>

            {product.description && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600">Deskripsi</label>
                <p className="text-gray-900 leading-relaxed break-words">{product.description}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-2 p-3 sm:p-4 bg-red-50 rounded-lg border border-red-200">
                <label className="text-sm font-medium text-red-700">Harga Modal</label>
                <p className="text-lg sm:text-xl font-bold text-red-600">Rp {product.costPrice.toLocaleString()}</p>
              </div>
              <div className="space-y-2 p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
                <label className="text-sm font-medium text-green-700">Harga Jual</label>
                <p className="text-lg sm:text-xl font-bold text-green-600">Rp {product.sellingPrice.toLocaleString()}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 sm:gap-3">
              {product.season && (
                <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-blue-100 text-blue-800">
                  {getSeasonText(product.season)}
                </span>
              )}
              {product.gender && (
                <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-purple-100 text-purple-800">
                  {getGenderText(product.gender)}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg sm:text-xl font-semibold text-gray-900">Ringkasan Stok</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4 sm:space-y-6">
              <div className="text-center p-4 sm:p-6 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-3xl sm:text-4xl font-bold text-blue-600">{getTotalStock()}</p>
                <p className="text-blue-700 font-medium mt-2">Total Stok</p>
              </div>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex justify-between items-center p-2 sm:p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-600">Total Varian:</span>
                  <span className="font-bold text-gray-900">{product.variants.length}</span>
                </div>
                <div className="flex justify-between items-center p-2 sm:p-3 bg-red-50 rounded-lg">
                  <span className="text-sm font-medium text-red-600">Stok Rendah:</span>
                  <span className="font-bold text-red-600">
                    {product.variants.filter(v => v.stock <= v.minStock).length}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 sm:p-3 bg-green-50 rounded-lg">
                  <span className="text-sm font-medium text-green-600">Profit Margin:</span>
                  <span className="font-bold text-green-600">
                    {product.sellingPrice > 0 ? Math.round(((product.sellingPrice - product.costPrice) / product.sellingPrice) * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Variants Section */}
      <Card className="shadow-sm border-0">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6">
          <div>
            <CardTitle className="text-lg sm:text-xl font-semibold text-slate-800">Varian Produk</CardTitle>
            <p className="text-sm text-slate-600 mt-1">Kelola ukuran dan warna untuk produk ini</p>
          </div>
          <Dialog open={addVariantOpen} onOpenChange={setAddVariantOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Tambah Varian
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto mx-4">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl font-semibold text-slate-800">Tambah Varian Baru</DialogTitle>
                <p className="text-sm text-slate-600">Buat varian baru dengan ukuran dan warna</p>
              </DialogHeader>
              <form onSubmit={handleAddVariant} className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Ukuran</label>
                    <Select value={variantForm.sizeId} onValueChange={(value) => setVariantForm(prev => ({...prev, sizeId: value}))}>
                      <SelectTrigger className="border-slate-300 focus:border-blue-500 focus:ring-blue-500">
                        <SelectValue placeholder="Pilih ukuran" />
                      </SelectTrigger>
                      <SelectContent>
                        {sizes.map((size) => (
                          <SelectItem key={size.id} value={size.id}>
                            <div className="flex items-center">
                              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-2">
                                <Ruler className="h-3 w-3 text-blue-600" />
                              </div>
                              {size.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Warna</label>
                    <Select value={variantForm.colorId} onValueChange={(value) => setVariantForm(prev => ({...prev, colorId: value}))}>
                      <SelectTrigger className="border-slate-300 focus:border-blue-500 focus:ring-blue-500">
                        <SelectValue placeholder="Pilih warna" />
                      </SelectTrigger>
                      <SelectContent>
                        {colors.map((color) => (
                          <SelectItem key={color.id} value={color.id}>
                            <div className="flex items-center">
                              {color.hexCode && (
                                <div 
                                  className="w-4 h-4 rounded-full mr-2 border-2 border-white shadow-sm ring-1 ring-slate-200"
                                  style={{ backgroundColor: color.hexCode }}
                                />
                              )}
                              <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center mr-2">
                                <Palette className="h-3 w-3 text-purple-600" />
                              </div>
                              {color.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Minimum Stok</label>
                  <Input
                    type="number"
                    value={variantForm.minStock}
                    onChange={(e) => setVariantForm(prev => ({...prev, minStock: e.target.value}))}
                    placeholder="5"
                    className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="bg-amber-50 border border-amber-200 p-3 sm:p-4 rounded-lg">
                  <p className="font-medium text-amber-900 text-sm mb-2 sm:mb-3">Info Stok</p>
                  <ul className="space-y-1 sm:space-y-2 text-sm text-amber-700">
                    <li className="flex items-start">
                      <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                      Stok awal akan dimulai dari <strong>0</strong>
                    </li>
                    <li className="flex items-start">
                      <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                      Stok akan bertambah melalui <strong>sistem produksi</strong>
                    </li>
                    <li className="flex items-start">
                      <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                      Tidak perlu input stok manual saat membuat varian
                    </li>
                  </ul>
                </div>

                <div className="bg-blue-50 border border-blue-200 p-3 sm:p-4 rounded-lg">
                  <p className="font-medium text-blue-900 text-sm mb-2">Info Barcode</p>
                  <p className="text-sm text-blue-700">Barcode akan dibuat otomatis setelah varian ditambahkan.</p>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setAddVariantOpen(false)} className="w-full sm:w-auto">
                    Batal
                  </Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
                    Tambah Varian
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {product.variants.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <Package className="h-6 w-6 sm:h-8 sm:w-8 text-slate-400" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-slate-700 mb-2">Belum ada varian</h3>
                <p className="text-sm sm:text-base text-slate-500 mb-4 sm:mb-6 max-w-sm text-center">
                  Tambahkan varian ukuran dan warna untuk produk ini agar dapat dijual
                </p>
                <Button 
                  onClick={() => setAddVariantOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Varian Pertama
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Mobile Card Layout */}
              <div className="block lg:hidden space-y-4">
                {product.variants.map((variant) => (
                  <div key={variant.id} className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Ruler className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-700">{variant.size.name}</p>
                          <p className="text-sm text-slate-500">Ukuran</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditVariant(variant)}
                          className="hover:bg-slate-100 p-2"
                          title="Edit Varian"
                        >
                          <Edit className="h-4 w-4 text-slate-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteVariant(variant)}
                          className="hover:bg-red-100 p-2"
                          title="Hapus Varian"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {variant.color.hexCode && (
                        <div 
                          className="w-5 h-5 rounded-full border-2 border-white shadow-sm ring-1 ring-slate-200"
                          style={{ backgroundColor: variant.color.hexCode }}
                        />
                      )}
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <Palette className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-700">{variant.color.name}</p>
                        <p className="text-sm text-slate-500">Warna</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-slate-500 mb-1">Harga Jual</p>
                        <p className="text-green-600 font-bold">
                          Rp {(variant.sellingPrice || product.sellingPrice).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 mb-1">Stok</p>
                        <p className={`font-bold text-lg ${
                          variant.stock <= variant.minStock ? 'text-red-600' : 'text-emerald-600'
                        }`}>
                          {variant.stock}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-slate-500 mb-1">Min. Stok</p>
                        <p className="text-slate-600 font-medium">{variant.minStock}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 mb-1">Status</p>
                        {variant.stock <= variant.minStock ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2"></div>
                            Stok Rendah
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2"></div>
                            Normal
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-slate-500 mb-2">Barcode</p>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-slate-100 px-3 py-1.5 rounded-md font-mono text-slate-700 flex-1 break-all">
                          {variant.barcode || 'Auto-generated'}
                        </code>
                        {variant.barcode && (
                          <BarcodeDisplay 
                            variant={{
                              ...variant,
                              barcode: variant.barcode,
                              product: {
                                name: product.name,
                                sku: product.sku,
                              }
                            }} 
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table Layout */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-4 px-4 font-semibold text-slate-700">Ukuran</th>
                      <th className="text-left py-4 px-4 font-semibold text-slate-700">Warna</th>
                      <th className="text-center py-4 px-4 font-semibold text-slate-700">Harga Jual</th>
                      <th className="text-center py-4 px-4 font-semibold text-slate-700">Stok</th>
                      <th className="text-center py-4 px-4 font-semibold text-slate-700">Min. Stok</th>
                      <th className="text-left py-4 px-4 font-semibold text-slate-700">Barcode</th>
                      <th className="text-center py-4 px-4 font-semibold text-slate-700">Status</th>
                      <th className="text-center py-4 px-4 font-semibold text-slate-700">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {product.variants.map((variant) => (
                      <tr key={variant.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                              <Ruler className="h-4 w-4 text-blue-600" />
                            </div>
                            <span className="font-medium text-slate-700">{variant.size.name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center">
                            {variant.color.hexCode && (
                              <div 
                                className="w-5 h-5 rounded-full mr-3 border-2 border-white shadow-sm ring-1 ring-slate-200"
                                style={{ backgroundColor: variant.color.hexCode }}
                              />
                            )}
                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                              <Palette className="h-4 w-4 text-purple-600" />
                            </div>
                            <span className="font-medium text-slate-700">{variant.color.name}</span>
                          </div>
                        </td>
                        <td className="text-center py-4 px-4">
                          <span className="text-green-600 font-bold">
                            Rp {(variant.sellingPrice || product.sellingPrice).toLocaleString()}
                          </span>
                        </td>
                        <td className="text-center py-4 px-4">
                          <span className={`font-bold text-lg ${
                            variant.stock <= variant.minStock ? 'text-red-600' : 'text-emerald-600'
                          }`}>
                            {variant.stock}
                          </span>
                        </td>
                        <td className="text-center py-4 px-4">
                          <span className="text-slate-600 font-medium">{variant.minStock}</span>
                        </td>
                        <td className="py-4 px-4 text-sm">
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-slate-100 px-3 py-1.5 rounded-md font-mono text-slate-700">
                              {variant.barcode || 'Auto-generated'}
                            </code>
                            {variant.barcode && (
                              <BarcodeDisplay 
                                variant={{
                                  ...variant,
                                  barcode: variant.barcode,
                                  product: {
                                    name: product.name,
                                    sku: product.sku,
                                  }
                                }} 
                              />
                            )}
                          </div>
                        </td>
                        <td className="text-center py-4 px-4">
                          {variant.stock <= variant.minStock ? (
                            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                              <div className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2"></div>
                              Stok Rendah
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
                              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2"></div>
                              Normal
                            </span>
                          )}
                        </td>
                        <td className="text-center py-4 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditVariant(variant)}
                              className="hover:bg-slate-100"
                              title="Edit Varian"
                            >
                              <Edit className="h-4 w-4 text-slate-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteVariant(variant)}
                              className="hover:bg-red-100"
                              title="Hapus Varian"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Add Variant Dialog */}
      <Dialog open={addVariantOpen} onOpenChange={setAddVariantOpen}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-semibold text-slate-800">Tambah Varian Baru</DialogTitle>
            <p className="text-sm text-slate-600">Buat kombinasi ukuran dan warna baru untuk produk</p>
          </DialogHeader>
          <form onSubmit={handleAddVariant} className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="size">Ukuran</Label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="existing-size"
                      name="size-option"
                      checked={!variantForm.useNewSize}
                      onChange={() => setVariantForm(prev => ({...prev, useNewSize: false, newSizeName: ''}))}
                      className="text-blue-600"
                    />
                    <label htmlFor="existing-size" className="text-sm font-medium">Pilih dari yang ada</label>
                  </div>
                  {!variantForm.useNewSize && (
                    <Select value={variantForm.sizeId} onValueChange={(value) => setVariantForm(prev => ({...prev, sizeId: value}))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih ukuran" />
                      </SelectTrigger>
                      <SelectContent>
                        {sizes.map((size) => (
                          <SelectItem key={size.id} value={size.id}>
                            {size.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="new-size"
                      name="size-option"
                      checked={variantForm.useNewSize}
                      onChange={() => setVariantForm(prev => ({...prev, useNewSize: true, sizeId: ''}))}
                      className="text-blue-600"
                    />
                    <label htmlFor="new-size" className="text-sm font-medium">Tambah ukuran baru</label>
                  </div>
                  {variantForm.useNewSize && (
                    <Input
                      placeholder="Contoh: XL, 42, 32"
                      value={variantForm.newSizeName}
                      onChange={(e) => setVariantForm(prev => ({...prev, newSizeName: e.target.value}))}
                      required={variantForm.useNewSize}
                    />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Warna</Label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="existing-color"
                      name="color-option"
                      checked={!variantForm.useNewColor}
                      onChange={() => setVariantForm(prev => ({...prev, useNewColor: false, newColorName: '', newColorHex: ''}))}
                      className="text-blue-600"
                    />
                    <label htmlFor="existing-color" className="text-sm font-medium">Pilih dari yang ada</label>
                  </div>
                  {!variantForm.useNewColor && (
                    <Select value={variantForm.colorId} onValueChange={(value) => setVariantForm(prev => ({...prev, colorId: value}))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih warna" />
                      </SelectTrigger>
                      <SelectContent>
                        {colors.map((color) => (
                          <SelectItem key={color.id} value={color.id}>
                            <div className="flex items-center gap-2">
                              {color.hexCode && (
                                <div 
                                  className="w-4 h-4 rounded-full border border-gray-300"
                                  style={{ backgroundColor: color.hexCode }}
                                />
                              )}
                              {color.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="new-color"
                      name="color-option"
                      checked={variantForm.useNewColor}
                      onChange={() => setVariantForm(prev => ({...prev, useNewColor: true, colorId: ''}))}
                      className="text-blue-600"
                    />
                    <label htmlFor="new-color" className="text-sm font-medium">Tambah warna baru</label>
                  </div>
                  {variantForm.useNewColor && (
                    <div className="space-y-2">
                      <Input
                        placeholder="Nama warna (contoh: Merah Marun)"
                        value={variantForm.newColorName}
                        onChange={(e) => setVariantForm(prev => ({...prev, newColorName: e.target.value}))}
                        required={variantForm.useNewColor}
                      />
                      <div className="flex items-center gap-2">
                        <Input
                          type="color"
                          value={variantForm.newColorHex}
                          onChange={(e) => setVariantForm(prev => ({...prev, newColorHex: e.target.value}))}
                          className="w-16 h-10 border rounded cursor-pointer"
                        />
                        <Input
                          placeholder="Kode hex (opsional)"
                          value={variantForm.newColorHex}
                          onChange={(e) => setVariantForm(prev => ({...prev, newColorHex: e.target.value}))}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="variantSellingPrice">Harga Jual (Rp)</Label>
                <Input
                  id="variantSellingPrice"
                  type="number"
                  value={variantForm.sellingPrice}
                  onChange={(e) => setVariantForm(prev => ({...prev, sellingPrice: e.target.value}))}
                  placeholder={`Default: ${product?.sellingPrice.toLocaleString()}`}
                  min="0"
                  step="1000"
                />
                <p className="text-xs text-slate-500">Kosongkan untuk menggunakan harga produk</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="minStock">Stok Minimum</Label>
                <Input
                  id="minStock"
                  type="number"
                  value={variantForm.minStock}
                  onChange={(e) => setVariantForm(prev => ({...prev, minStock: e.target.value}))}
                  placeholder="5"
                  min="0"
                  required
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-3 sm:p-4 rounded-lg">
              <p className="font-medium text-blue-900 text-sm mb-2">Info Stok Awal</p>
              <p className="text-xs text-blue-600">
                Stok awal varian akan dimulai dari 0. Gunakan fitur Produksi atau Stock Adjustment untuk menambah stok.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setAddVariantOpen(false);
                  setVariantForm({
                    sizeId: '',
                    colorId: '',
                    minStock: '5',
                    sellingPrice: '',
                    newSizeName: '',
                    newColorName: '',
                    newColorHex: '',
                    useNewSize: false,
                    useNewColor: false
                  });
                }}
                className="w-full sm:w-auto"
              >
                Batal
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Tambah Varian
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Variant Dialog */}
      <Dialog open={editVariantOpen} onOpenChange={setEditVariantOpen}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-semibold text-slate-800">Edit Varian</DialogTitle>
            <p className="text-sm text-slate-600">Ubah pengaturan untuk varian produk</p>
          </DialogHeader>
          {selectedVariant && (
            <form onSubmit={handleEditVariant} className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Ukuran</label>
                  <div className="flex items-center p-3 border border-slate-200 rounded-lg bg-slate-50">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <Ruler className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className="font-medium text-slate-700">{selectedVariant.size.name}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Warna</label>
                  <div className="flex items-center p-3 border border-slate-200 rounded-lg bg-slate-50">
                    {selectedVariant.color.hexCode && (
                      <div 
                        className="w-5 h-5 rounded-full mr-3 border-2 border-white shadow-sm ring-1 ring-slate-200"
                        style={{ backgroundColor: selectedVariant.color.hexCode }}
                      />
                    )}
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                      <Palette className="h-4 w-4 text-purple-600" />
                    </div>
                    <span className="font-medium text-slate-700">{selectedVariant.color.name}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Stok Minimum</label>
                <Input
                  type="number"
                  value={variantForm.minStock}
                  onChange={(e) => setVariantForm(prev => ({...prev, minStock: e.target.value}))}
                  className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Harga Jual (Rp)</label>
                <Input
                  type="number"
                  value={variantForm.sellingPrice}
                  onChange={(e) => setVariantForm(prev => ({...prev, sellingPrice: e.target.value}))}
                  placeholder={`Default: ${product?.sellingPrice.toLocaleString()}`}
                  className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                  min="0"
                  step="1000"
                />
                <p className="text-xs text-slate-500">Kosongkan untuk menggunakan harga produk</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-3 sm:p-4 rounded-lg">
                <p className="font-medium text-blue-900 text-sm mb-2 sm:mb-3">Info Stok Saat Ini</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="flex items-center">
                    <span className="text-sm text-blue-700 mr-2">Stok:</span>
                    <span className={`font-bold text-lg ${
                      selectedVariant?.stock <= selectedVariant?.minStock ? 'text-red-600' : 'text-emerald-600'
                    }`}>
                      {selectedVariant?.stock} pcs
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm text-blue-700 mr-2">Status:</span>
                    <span className={`font-medium text-sm ${
                      selectedVariant?.stock <= selectedVariant?.minStock ? 'text-red-600' : 'text-emerald-600'
                    }`}>
                      {selectedVariant?.stock <= selectedVariant?.minStock ? 'Stok Rendah' : 'Normal'}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-blue-600 mt-2 sm:mt-3">
                  <strong>Catatan:</strong> Stok hanya dapat diubah melalui Sistem Produksi atau Stock Adjustments.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3 sm:p-4 rounded-lg">
                <p className="font-medium text-slate-700 text-sm mb-2">Info Barcode</p>
                <p className="text-xs text-slate-600 mb-2">Barcode tidak dapat diubah setelah varian dibuat.</p>
                {selectedVariant?.barcode && (
                  <div className="flex items-center">
                    <span className="text-xs text-slate-600 mr-2">Current Barcode:</span>
                    <code className="text-xs bg-slate-200 px-2 py-1 rounded font-mono break-all">{selectedVariant.barcode}</code>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setEditVariantOpen(false)} className="w-full sm:w-auto">
                  Batal
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
                  Update Varian
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Variant Confirmation Dialog */}
      <Dialog open={deleteVariantOpen} onOpenChange={setDeleteVariantOpen}>
        <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto mx-auto">
          <DialogHeader className="text-center sm:text-left">
            <DialogTitle className="text-lg sm:text-xl font-semibold text-red-700 flex items-center justify-center sm:justify-start gap-2">
              <Trash2 className="h-5 w-5" />
              Konfirmasi Hapus Varian
            </DialogTitle>
          </DialogHeader>
          {variantToDelete && (
            <div className="space-y-4">
              <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800 mb-2 sm:mb-3 text-center sm:text-left">
                  Anda akan menghapus varian berikut:
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <Ruler className="h-4 w-4 text-red-600" />
                    <span className="font-medium text-red-700">Size: {variantToDelete.size.name}</span>
                  </div>
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <Palette className="h-4 w-4 text-red-600" />
                    <span className="font-medium text-red-700">Color: {variantToDelete.color.name}</span>
                  </div>
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <Package className="h-4 w-4 text-red-600" />
                    <span className="font-medium text-red-700">Stock: {variantToDelete.stock} pcs</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4">
                <p className="text-sm text-yellow-800 text-center sm:text-left">
                  <strong>⚠️ Peringatan:</strong> Aksi ini tidak dapat dibatalkan. Varian akan dihapus permanen dari sistem.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row justify-center sm:justify-end gap-3 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={closeDeleteDialog}
                  className="w-full sm:w-auto"
                >
                  Batal
                </Button>
                <Button 
                  type="button" 
                  variant="destructive"
                  onClick={confirmDeleteVariant}
                  className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Ya, Hapus Varian
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={editProductOpen} onOpenChange={setEditProductOpen}>
        <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Edit Produk</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditProduct} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="productName">Nama Produk</Label>
              <Input
                id="productName"
                value={productForm.name}
                onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                placeholder="Masukkan nama produk"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="costPrice">Harga Modal (Rp)</Label>
                <Input
                  id="costPrice"
                  type="number"
                  value={productForm.costPrice}
                  onChange={(e) => setProductForm({...productForm, costPrice: e.target.value})}
                  placeholder="0"
                  min="0"
                  step="1000"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sellingPrice">Harga Jual (Rp)</Label>
                <Input
                  id="sellingPrice"
                  type="number"
                  value={productForm.sellingPrice}
                  onChange={(e) => setProductForm({...productForm, sellingPrice: e.target.value})}
                  placeholder="0"
                  min="0"
                  step="1000"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={closeEditProduct}
                disabled={isUpdatingProduct}
                className="w-full sm:w-auto"
              >
                Batal
              </Button>
              <Button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                disabled={isUpdatingProduct}
              >
                {isUpdatingProduct ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    Simpan Perubahan
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
