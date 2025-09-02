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
      <div className="max-w-7xl mx-auto p-8">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <Package className="h-16 w-16 animate-spin mx-auto mb-6 text-blue-600" />
            <p className="text-lg font-medium text-gray-900">Memuat produk...</p>
            <p className="text-sm text-muted-foreground mt-2">Mohon tunggu sebentar</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Produk</h1>
          <p className="text-muted-foreground mt-2">
            Kelola inventori fashion Anda
          </p>
        </div>
        <AddProductForm onProductAdded={fetchProducts} />
      </div>

      {/* Search and Filter */}
      <div className="flex items-center space-x-4 mb-8">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari produk..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <Card className="bg-white shadow-sm border-0">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="h-16 w-16 text-muted-foreground mb-6" />
            <h3 className="text-xl font-semibold mb-3">Tidak ada produk ditemukan</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              {searchTerm
                ? "Tidak ada produk yang cocok dengan pencarian Anda."
                : "Mulai dengan menambahkan produk pertama Anda."}
            </p>
            <AddProductForm onProductAdded={fetchProducts} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="hover:shadow-lg transition-all duration-200 bg-white border-0 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <CardTitle className="text-lg font-semibold text-gray-900">{product.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      SKU: {product.sku}
                    </p>
                    <p className="text-sm text-blue-600 font-medium">
                      {product.category.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">
                      Rp {product.sellingPrice.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Modal: Rp {product.costPrice.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  {/* Stock Summary */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">Total Stok:</span>
                    <span className={`text-sm font-bold ${
                      getTotalStock(product.variants) < 10 
                        ? 'text-red-600' 
                        : 'text-green-600'
                    }`}>
                      {getTotalStock(product.variants)} pcs
                    </span>
                  </div>

                  {/* Variants Preview */}
                  <div>
                    <p className="text-sm font-medium mb-3 text-gray-700">Varian:</p>
                    <div className="space-y-2 max-h-24 overflow-y-auto">
                      {product.variants.slice(0, 3).map((variant) => (
                        <div key={variant.id} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded">
                          <span className="text-gray-600">
                            {variant.size.name} - {variant.color.name}
                          </span>
                          <span className={`font-medium ${
                            variant.stock < 5 ? 'text-red-600' : 'text-gray-900'
                          }`}>
                            {variant.stock}
                          </span>
                        </div>
                      ))}
                      {product.variants.length > 3 && (
                        <p className="text-xs text-muted-foreground px-2">
                          +{product.variants.length - 3} varian lainnya
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="pt-2">
                    <Link href={`/products/${product.id}`}>
                      <Button variant="outline" className="w-full hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300">
                        <Eye className="h-4 w-4 mr-2" />
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
