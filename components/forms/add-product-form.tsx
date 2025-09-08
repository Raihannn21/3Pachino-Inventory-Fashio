'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Tags } from 'lucide-react';

interface Category {
  id: string;
  name: string;
}

interface AddProductFormProps {
  onProductAdded: () => void;
}

export default function AddProductForm({ onProductAdded }: AddProductFormProps) {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    costPrice: '',
    sellingPrice: '',
  });

  useEffect(() => {
    if (open) {
      fetchCategories();
    }
  }, [open]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // Generate SKU berdasarkan nama produk
  const generateSku = (productName: string) => {
    const cleanName = productName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const prefix = '3P'; // 3Pachino
    const nameCode = cleanName.substring(0, 4).padEnd(4, '0');
    const timestamp = Date.now().toString().slice(-4);
    return `${prefix}${nameCode}${timestamp}`;
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });

      if (response.ok) {
        const newCategory = await response.json();
        setCategories(prev => [...prev, newCategory]);
        setFormData(prev => ({ ...prev, categoryId: newCategory.id }));
        setNewCategoryName('');
        setShowNewCategory(false);
      } else {
        alert('Gagal membuat kategori baru');
      }
    } catch (error) {
      console.error('Error creating category:', error);
      alert('Gagal membuat kategori baru');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Generate SKU otomatis
      const sku = generateSku(formData.name);
      
      const productData = {
        name: formData.name,
        sku: sku,
        categoryId: formData.categoryId,
        costPrice: parseFloat(formData.costPrice),
        sellingPrice: parseFloat(formData.sellingPrice),
      };

      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });

      if (response.ok) {
        // Reset form
        setFormData({
          name: '',
          categoryId: '',
          costPrice: '',
          sellingPrice: '',
        });
        setOpen(false);
        onProductAdded();
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error creating product:', error);
      alert('Gagal menambahkan produk');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Produk
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tambah Produk Baru</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nama Produk</label>
            <Input
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Masukkan nama produk"
              required
            />
            {formData.name && (
              <p className="text-xs text-muted-foreground">
                SKU akan dibuat otomatis: {generateSku(formData.name)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Kategori</label>
            <div className="flex gap-2">
              <Select 
                value={formData.categoryId} 
                onValueChange={(value) => {
                  if (value === 'new') {
                    setShowNewCategory(true);
                  } else {
                    handleInputChange('categoryId', value);
                  }
                }}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="new">
                    <div className="flex items-center">
                      <Plus className="h-4 w-4 mr-2" />
                      Tambah Kategori Baru
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {showNewCategory && (
              <div className="flex gap-2 mt-2">
                <Input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Nama kategori baru"
                  className="flex-1"
                />
                <Button 
                  type="button" 
                  size="sm" 
                  onClick={handleCreateCategory}
                  disabled={!newCategoryName.trim()}
                >
                  <Tags className="h-4 w-4" />
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setShowNewCategory(false);
                    setNewCategoryName('');
                  }}
                >
                  Batal
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Harga Modal (Rp)</label>
              <Input
                type="number"
                value={formData.costPrice}
                onChange={(e) => handleInputChange('costPrice', e.target.value)}
                placeholder="50000"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Harga Jual (Rp)</label>
              <Input
                type="number"
                value={formData.sellingPrice}
                onChange={(e) => handleInputChange('sellingPrice', e.target.value)}
                placeholder="85000"
                required
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Menyimpan...' : 'Simpan Produk'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
