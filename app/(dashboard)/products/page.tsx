'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Package, Eye } from 'lucide-react';
import AddProductForm from '@/components/forms/add-product-form';

interface Product {
  id: string;
  name: string;
  sku: string;
  description?: string;
  season?: string;
  gender?: string;
  costPrice: number;
  sellingPrice: number;
  isActive: boolean;
  category: {
    id: string;
    name: string;
  };
  brand: {
    id: string;
    name: string;
  };
  variants: Array<{
    id: string;
    stock: number;
    size: {
      name: string;
    };
    color: {
      name: string;
    };
  }>;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTotalStock = (variants: Product['variants']) => {
    return variants.reduce((total, variant) => total + variant.stock, 0);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-3 sm:p-6 lg:p-8">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-3">
          <div>
            <div className="h-6 sm:h-8 w-24 sm:w-32 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-4 w-32 sm:w-48 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="h-8 sm:h-10 w-28 sm:w-32 bg-gray-200 rounded animate-pulse"></div>
        </div>

        {/* Loading Animation Center */}
        <div className="flex items-center justify-center mb-6 sm:mb-8">
          <div className="text-center">
            <div className="relative mb-4">
              <Package className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-blue-600 animate-pulse" />
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Memuat Produk</h2>
            <p className="text-xs sm:text-sm text-gray-600">Mengambil data produk terbaru...</p>
            <div className="flex items-center justify-center mt-4 space-x-1">
              <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce"></div>
              <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
          </div>
        </div>

        {/* Search and Filters Skeleton */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 mb-6 sm:mb-8">
          <div className="relative flex-1 sm:max-w-sm">
            <div className="h-9 sm:h-10 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="h-9 sm:h-10 w-full sm:w-24 bg-gray-200 rounded animate-pulse"></div>
        </div>

        {/* Product Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
            <Card key={item} className="border-0 shadow-sm">
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-3 sm:space-y-4">
                  <div className="h-4 sm:h-5 w-28 sm:w-32 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-3 sm:h-4 w-16 sm:w-20 bg-gray-200 rounded animate-pulse"></div>
                  <div className="space-y-2">
                    <div className="h-3 w-20 sm:w-24 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-3 w-24 sm:w-28 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="h-5 sm:h-6 w-16 sm:w-20 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-3 sm:h-4 w-12 sm:w-16 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                  <div className="h-7 sm:h-8 w-14 sm:w-16 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Produk</h1>
          <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
            Kelola inventori fashion Anda
          </p>
        </div>
        <AddProductForm onProductAdded={fetchProducts} />
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 mb-6 sm:mb-8">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari produk..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 text-sm sm:text-base"
          />
        </div>
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <Card className="bg-white shadow-sm border-0">
          <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16 px-4">
            <Package className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mb-4 sm:mb-6" />
            <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3 text-center">Tidak ada produk ditemukan</h3>
            <p className="text-muted-foreground text-center mb-4 sm:mb-6 max-w-md text-sm sm:text-base">
              {searchTerm
                ? "Tidak ada produk yang cocok dengan pencarian Anda."
                : "Mulai dengan menambahkan produk pertama Anda."}
            </p>
            <AddProductForm onProductAdded={fetchProducts} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="hover:shadow-lg transition-all duration-200 bg-white border-0 shadow-sm">
              <CardHeader className="pb-3 sm:pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 sm:space-y-2 flex-1 min-w-0">
                    <CardTitle className="text-base sm:text-lg font-semibold text-gray-900 leading-tight">{product.name}</CardTitle>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      SKU: {product.sku}
                    </p>
                    <p className="text-xs sm:text-sm text-blue-600 font-medium">
                      {product.category.name}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm sm:text-lg font-bold text-gray-900">
                      Rp {product.sellingPrice.toLocaleString()}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Modal: Rp {product.costPrice.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3 sm:space-y-4">
                  {/* Stock Summary */}
                  <div className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg">
                    <span className="text-xs sm:text-sm font-medium text-gray-700">Total Stok:</span>
                    <span className={`text-xs sm:text-sm font-bold ${
                      getTotalStock(product.variants) < 10 
                        ? 'text-red-600' 
                        : 'text-green-600'
                    }`}>
                      {getTotalStock(product.variants)} pcs
                    </span>
                  </div>

                  {/* Variants Preview */}
                  <div>
                    <p className="text-xs sm:text-sm font-medium mb-2 sm:mb-3 text-gray-700">Varian:</p>
                    <div className="space-y-1 sm:space-y-2 max-h-20 sm:max-h-24 overflow-y-auto">
                      {product.variants.slice(0, 3).map((variant) => (
                        <div key={variant.id} className="flex items-center justify-between text-xs p-1.5 sm:p-2 bg-gray-50 rounded">
                          <span className="text-gray-600 truncate">
                            {variant.size.name} - {variant.color.name}
                          </span>
                          <span className={`font-medium flex-shrink-0 ${
                            variant.stock < 5 ? 'text-red-600' : 'text-gray-900'
                          }`}>
                            {variant.stock}
                          </span>
                        </div>
                      ))}
                      {product.variants.length > 3 && (
                        <p className="text-xs text-muted-foreground px-1.5 sm:px-2">
                          +{product.variants.length - 3} varian lainnya
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="pt-1 sm:pt-2">
                    <Link href={`/products/${product.id}`}>
                      <Button variant="outline" className="w-full hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 text-xs sm:text-sm">
                        <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        Lihat Detail
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
