'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Building2, Phone, Mail, MapPin, Eye, Search, Edit } from 'lucide-react';
import { toast } from 'sonner';

interface Customer {
  id: string;
  name: string;
  contact?: string;
  phone?: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Fetch customers
  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers');
      const data = await response.json();
      
      if (response.ok) {
        setCustomers(data.customers);
        setFilteredCustomers(data.customers); // Initialize filtered list
      } else {
        toast.error(data.error || 'Gagal memuat data customer');
      }
    } catch (error) {
      toast.error('Gagal memuat data customer');
    } finally {
      setLoading(false);
    }
  };

  // Search customers with highlighting
  const searchCustomers = (term: string) => {
    if (!term.trim()) {
      setFilteredCustomers(customers);
      return;
    }

    const searchLower = term.toLowerCase();
    const filtered = customers.filter(customer => 
      customer.name.toLowerCase().includes(searchLower) ||
      customer.contact?.toLowerCase().includes(searchLower) ||
      customer.phone?.toLowerCase().includes(searchLower) ||
      customer.address?.toLowerCase().includes(searchLower) ||
      customer.id.toLowerCase().includes(searchLower)
    );
    
    setFilteredCustomers(filtered);
  };

  // Highlight search term in text
  const highlightText = (text: string, searchTerm: string) => {
    if (!searchTerm.trim()) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 px-1 rounded">
          {part}
        </mark>
      ) : part
    );
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      searchCustomers(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, customers, searchCustomers]);

  // Keyboard shortcut for search (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Create customer
  const createCustomer = async () => {
    if (!name.trim()) {
      toast.error('Nama customer wajib diisi');
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          contact: contact.trim(),
          phone: phone.trim(),
          address: address.trim()
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Customer berhasil ditambahkan!');
        setIsCreateOpen(false);
        resetForm();
        fetchCustomers(); // This will refresh both customers and filteredCustomers
      } else {
        toast.error(data.error || 'Gagal menambahkan customer');
      }
    } catch (error) {
      toast.error('Gagal menambahkan customer');
    } finally {
      setIsCreating(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setName('');
    setContact('');
    setPhone('');
    setAddress('');
  };

  // Open edit dialog
  const openEditDialog = (customer: Customer) => {
    setEditingCustomer(customer);
    setName(customer.name);
    setContact(customer.contact || '');
    setPhone(customer.phone || '');
    setAddress(customer.address || '');
    setIsEditOpen(true);
  };

  // Update customer
  const updateCustomer = async () => {
    if (!name.trim()) {
      toast.error('Nama customer wajib diisi');
      return;
    }

    if (!editingCustomer) return;

    setIsEditing(true);
    try {
      const response = await fetch(`/api/customers/${editingCustomer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          contact: contact.trim() || null,
          phone: phone.trim() || null,
          address: address.trim() || null,
        }),
      });

      if (response.ok) {
        toast.success('Customer berhasil diperbarui!');
        setIsEditOpen(false);
        resetForm();
        setEditingCustomer(null);
        fetchCustomers();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Gagal memperbarui customer');
      }
    } catch (error) {
      console.error('Error updating customer:', error);
      toast.error('Gagal memperbarui customer');
    } finally {
      setIsEditing(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 sm:p-6">
        {/* Header Skeleton */}
        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <div className="h-6 sm:h-8 w-32 sm:w-40 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-3 sm:h-4 w-48 sm:w-56 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="h-9 sm:h-10 w-full sm:w-36 bg-gray-200 rounded animate-pulse"></div>
          </div>

          {/* Loading Animation Center */}
          <div className="flex items-center justify-center mb-6 sm:mb-8">
            <div className="text-center">
              <div className="relative mb-4">
                <Building2 className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-blue-600 animate-pulse" />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Memuat Data Customer</h2>
              <p className="text-sm text-gray-600">Mengambil data customer terbaru...</p>
              <div className="flex items-center justify-center mt-4 space-x-1">
                <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce"></div>
                <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
          </div>

          {/* Summary Cards Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[1, 2].map((item) => (
              <Card key={item} className="border-0 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="h-3 sm:h-4 w-20 sm:w-24 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-3 sm:h-4 w-3 sm:w-4 bg-gray-200 rounded animate-pulse"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-6 sm:h-8 w-12 sm:w-16 bg-gray-200 rounded animate-pulse mb-2"></div>
                  <div className="h-2 sm:h-3 w-20 sm:w-24 bg-gray-200 rounded animate-pulse"></div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Search Section Skeleton */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="h-5 sm:h-6 w-24 sm:w-32 bg-gray-200 rounded animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="h-9 sm:h-10 w-full bg-gray-200 rounded animate-pulse"></div>
            </CardContent>
          </Card>

          {/* Table Skeleton */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="h-5 sm:h-6 w-28 sm:w-32 bg-gray-200 rounded animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="h-48 sm:h-64 bg-gray-100 rounded animate-pulse flex items-center justify-center">
                <Building2 className="h-8 w-8 sm:h-12 sm:w-12 text-gray-300" />
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
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Data Customer</h1>
            <p className="text-sm text-muted-foreground">
              Kelola data customer dan pelanggan setia
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                <span className="sm:inline">Tambah Customer</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-md">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl">Tambah Customer Baru</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nama Customer *</Label>
                  <Input
                    id="name"
                    placeholder="Masukkan nama customer"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact">Nama Kontak</Label>
                  <Input
                    id="contact"
                    placeholder="Nama lengkap customer"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">No. Telepon</Label>
                  <Input
                    id="phone"
                    placeholder="No. telepon customer"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Alamat</Label>
                  <Textarea
                    id="address"
                    placeholder="Alamat lengkap customer"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={createCustomer}
                  disabled={isCreating}
                >
                  {isCreating ? 'Menambahkan...' : 'Tambah Customer'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit Customer Dialog */}
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent className="w-[95vw] max-w-md">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl">Edit Customer</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Nama Customer</Label>
                  <Input
                    id="edit-name"
                    placeholder="Masukkan nama customer"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-contact">Kontak</Label>
                  <Input
                    id="edit-contact"
                    placeholder="Masukkan kontak"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">No. Telepon</Label>
                  <Input
                    id="edit-phone"
                    placeholder="Masukkan no. telepon"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-address">Alamat</Label>
                  <Textarea
                    id="edit-address"
                    placeholder="Masukkan alamat"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={3}
                    className="min-h-[80px]"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:justify-end mt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsEditOpen(false);
                    resetForm();
                    setEditingCustomer(null);
                  }}
                  className="w-full sm:w-auto"
                >
                  Batal
                </Button>
                <Button 
                  onClick={updateCustomer}
                  disabled={isEditing}
                  className="w-full sm:w-auto"
                >
                  {isEditing ? 'Menyimpan...' : 'Simpan Perubahan'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
              <Building2 className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-gray-900">{customers.length}</div>
              <p className="text-xs text-gray-600">
                Customer terdaftar
              </p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hasil Pencarian</CardTitle>
              <Search className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-gray-900">{filteredCustomers.length}</div>
              <p className="text-xs text-gray-600">
                Customer ditemukan
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search Section */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Search className="h-4 w-4 sm:h-5 sm:w-5" />
              Cari Customer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder="Cari berdasarkan nama, kontak, telepon, atau alamat... (Ctrl+K)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 text-sm"
              />
            </div>
            {searchTerm && (
              <div className="mt-2 text-xs text-muted-foreground">
                Menampilkan {filteredCustomers.length} dari {customers.length} customer
                {searchTerm && ` untuk "${searchTerm}"`}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customers List */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Daftar Customer</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredCustomers.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <div className="text-sm text-gray-600 mb-4">
                  {searchTerm 
                    ? `Tidak ada customer yang ditemukan untuk "${searchTerm}"` 
                    : 'Belum ada customer yang terdaftar'
                  }
                </div>
                {!searchTerm && (
                  <Button 
                    className="w-full sm:w-auto" 
                    onClick={() => setIsCreateOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah Customer Pertama
                  </Button>
                )}
                {searchTerm && (
                  <Button 
                    variant="outline"
                    className="w-full sm:w-auto" 
                    onClick={() => setSearchTerm('')}
                  >
                    Clear Search
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* Mobile Card Layout */}
                <div className="block lg:hidden space-y-3">
                  {filteredCustomers.map((customer) => (
                    <Card key={customer.id} className="border border-gray-200">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          {/* Header */}
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-semibold text-gray-900 text-sm">
                                {highlightText(customer.name, searchTerm)}
                              </div>
                              <div className="text-xs text-gray-600 mt-1">
                                ID: {highlightText(customer.id.slice(0, 8), searchTerm)}...
                              </div>
                            </div>
                          </div>

                          {/* Contact Info */}
                          <div className="space-y-2 text-sm">
                            {customer.contact && (
                              <div className="flex items-center gap-2">
                                <div className="text-xs text-gray-600 w-16">Kontak:</div>
                                <div className="font-medium">{highlightText(customer.contact, searchTerm)}</div>
                              </div>
                            )}
                            {customer.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-3 w-3 text-gray-600" />
                                <div className="text-xs text-gray-600 w-14">Phone:</div>
                                <div className="font-medium">{highlightText(customer.phone, searchTerm)}</div>
                              </div>
                            )}
                            {customer.address && (
                              <div className="flex items-start gap-2">
                                <MapPin className="h-3 w-3 text-gray-600 mt-0.5" />
                                <div className="text-xs text-gray-600 w-14">Alamat:</div>
                                <div className="text-sm flex-1">{highlightText(customer.address, searchTerm)}</div>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 pt-2 border-t">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-xs"
                              onClick={() => openEditDialog(customer)}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-xs"
                              onClick={() => window.location.href = `/customers/${customer.id}`}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              History
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
                        <TableHead>Nama Customer</TableHead>
                        <TableHead>Kontak</TableHead>
                        <TableHead>Telepon</TableHead>
                        <TableHead>Alamat</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCustomers.map((customer) => (
                        <TableRow key={customer.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {highlightText(customer.name, searchTerm)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                ID: {highlightText(customer.id.slice(0, 8), searchTerm)}...
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {customer.contact ? (
                              <div className="flex items-center gap-1">
                                <div>{highlightText(customer.contact, searchTerm)}</div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {customer.phone ? (
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3 text-muted-foreground" />
                                <div>{highlightText(customer.phone, searchTerm)}</div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {customer.address ? (
                              <div className="flex items-start gap-1">
                                <MapPin className="h-3 w-3 text-muted-foreground mt-0.5" />
                                <div className="text-sm max-w-xs truncate">
                                  {highlightText(customer.address, searchTerm)}
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center gap-2 justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditDialog(customer)}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.location.href = `/customers/${customer.id}`}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View History
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
