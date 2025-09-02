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
  }, [searchTerm, customers]);

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
      <div className="container mx-auto p-6">
        {/* Header Skeleton */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <div className="h-8 w-40 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-4 w-56 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="h-10 w-36 bg-gray-200 rounded animate-pulse"></div>
          </div>

          {/* Loading Animation Center */}
          <div className="flex items-center justify-center mb-8">
            <div className="text-center">
              <div className="relative mb-4">
                <Building2 className="h-16 w-16 mx-auto text-blue-600 animate-pulse" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Memuat Data Customer</h2>
              <p className="text-sm text-gray-600">Mengambil data customer terbaru...</p>
              <div className="flex items-center justify-center mt-4 space-x-1">
                <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce"></div>
                <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
          </div>

          {/* Search and Stats Skeleton */}
          <div className="flex items-center justify-between">
            <div className="h-10 w-64 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
          </div>

          {/* Table Skeleton */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gray-100 rounded animate-pulse flex items-center justify-center">
                <Building2 className="h-12 w-12 text-gray-300" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Data Customer</h1>
            <p className="text-muted-foreground">
              Kelola data customer dan pelanggan setia
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="lg">
                <Plus className="h-4 w-4 mr-2" />
                Tambah Customer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tambah Customer Baru</DialogTitle>
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
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Customer</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-name">Nama Customer</Label>
                  <Input
                    id="edit-name"
                    placeholder="Masukkan nama customer"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-contact">Kontak</Label>
                  <Input
                    id="edit-contact"
                    placeholder="Masukkan kontak"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-phone">No. Telepon</Label>
                  <Input
                    id="edit-phone"
                    placeholder="Masukkan no. telepon"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-address">Alamat</Label>
                  <Textarea
                    id="edit-address"
                    placeholder="Masukkan alamat"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsEditOpen(false);
                    resetForm();
                    setEditingCustomer(null);
                  }}
                >
                  Batal
                </Button>
                <Button 
                  onClick={updateCustomer}
                  disabled={isEditing}
                >
                  {isEditing ? 'Menyimpan...' : 'Simpan Perubahan'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{customers.length}</div>
              <p className="text-xs text-muted-foreground">
                Customer terdaftar
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hasil Pencarian</CardTitle>
              <Search className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredCustomers.length}</div>
              <p className="text-xs text-muted-foreground">
                Customer ditemukan
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
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
        <Card>
          <CardHeader>
            <CardTitle>Daftar Customer</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredCustomers.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <div className="text-sm text-muted-foreground">
                  {searchTerm 
                    ? `Tidak ada customer yang ditemukan untuk "${searchTerm}"` 
                    : 'Belum ada customer yang terdaftar'
                  }
                </div>
                {!searchTerm && (
                  <Button 
                    className="mt-4" 
                    onClick={() => setIsCreateOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah Customer Pertama
                  </Button>
                )}
                {searchTerm && (
                  <Button 
                    variant="outline"
                    className="mt-4" 
                    onClick={() => setSearchTerm('')}
                  >
                    Clear Search
                  </Button>
                )}
              </div>
            ) : (
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
