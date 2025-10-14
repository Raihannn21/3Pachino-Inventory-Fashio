'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Eye, Users, TrendingUp, Calendar, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  type: string;
  transactions: any[];
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  // Fetch customers data
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/customers');
      const data = await response.json();
      if (response.ok) {
        setCustomers(data.customers || []);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Gagal memuat data customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Filter customers
  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.phone && customer.phone.includes(searchTerm)) ||
    (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // View customer detail
  const viewCustomerDetail = (customerId: string) => {
    router.push(`/customers/${customerId}`);
  };

  // Open delete confirmation
  const openDeleteConfirmation = (customer: Customer) => {
    setCustomerToDelete(customer);
    setIsDeleteOpen(true);
  };

  // Delete customer
  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/customers/${customerToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success(`Customer ${customerToDelete.name} berhasil dihapus`);
        setIsDeleteOpen(false);
        setCustomerToDelete(null);
        // Refresh data
        fetchCustomers();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Gagal menghapus customer');
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast.error('Gagal menghapus customer');
    } finally {
      setIsDeleting(false);
    }
  };

  // Calculate summary stats
  const totalCustomers = customers.length;
  const customersWithTransactions = customers.filter(c => c.transactions && c.transactions.length > 0).length;
  const totalTransactions = customers.reduce((sum, c) => sum + (c.transactions?.length || 0), 0);

  if (loading) {
    return (
      <div className="container mx-auto p-4 sm:p-6">
        <div className="space-y-4 sm:space-y-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Users className="h-12 w-12 mx-auto text-blue-600 animate-pulse mb-4" />
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Memuat Data Customers</h2>
              <p className="text-sm text-gray-600">Mengambil data customers...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6">
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Data Customers</h1>
          <p className="text-sm text-muted-foreground">
            Kelola data pelanggan dan riwayat transaksi
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{totalCustomers}</div>
              <p className="text-xs text-gray-600">
                Total pelanggan terdaftar
              </p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{customersWithTransactions}</div>
              <p className="text-xs text-gray-600">
                Customers dengan transaksi
              </p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transaksi</CardTitle>
              <Calendar className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{totalTransactions}</div>
              <p className="text-xs text-gray-600">
                Dari semua customers
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Cari customer (nama, email, phone)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Results */}
            <div className="mt-4">
              {filteredCustomers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <div className="text-sm text-gray-600">
                    {searchTerm ? 'Tidak ada customer yang sesuai dengan pencarian' : 'Belum ada data customer'}
                  </div>
                </div>
              ) : (
                <>
                  {/* Mobile Card View */}
                  <div className="block sm:hidden space-y-3">
                    {filteredCustomers.map((customer) => (
                      <Card key={customer.id} className="p-3">
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium text-sm">{customer.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {customer.phone || customer.email || 'No contact info'}
                              </div>
                            </div>
                            <Badge variant={customer.transactions?.length > 0 ? 'default' : 'secondary'} className="text-xs">
                              {customer.transactions?.length || 0} transaksi
                            </Badge>
                          </div>
                          
                          <div className="flex justify-between items-center pt-2 border-t">
                            <div className="text-xs text-muted-foreground">
                              Type: {customer.type}
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => viewCustomerDetail(customer.id)}
                                className="text-xs px-2 py-1"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                Detail
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => openDeleteConfirmation(customer)}
                                className="text-xs px-2 py-1"
                                disabled={customer.transactions && customer.transactions.length > 0}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden sm:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nama</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Transaksi</TableHead>
                          <TableHead>Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCustomers.map((customer) => (
                          <TableRow key={customer.id}>
                            <TableCell className="font-medium">
                              {customer.name}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {customer.phone && (
                                  <div className="text-sm">{customer.phone}</div>
                                )}
                                {customer.email && (
                                  <div className="text-xs text-muted-foreground">{customer.email}</div>
                                )}
                                {!customer.phone && !customer.email && (
                                  <div className="text-xs text-muted-foreground">No contact info</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{customer.type}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={customer.transactions?.length > 0 ? 'default' : 'secondary'}>
                                {customer.transactions?.length || 0} transaksi
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-2 justify-end">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => viewCustomerDetail(customer.id)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Detail
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => openDeleteConfirmation(customer)}
                                  disabled={customer.transactions && customer.transactions.length > 0}
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Hapus
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
            </div>
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <DialogContent className="w-[95vw] max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg">Konfirmasi Hapus Customer</DialogTitle>
            </DialogHeader>
            
            {customerToDelete && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm">
                    Apakah Anda yakin ingin menghapus customer <strong>{customerToDelete.name}</strong>?
                  </p>
                  
                  {customerToDelete.transactions && customerToDelete.transactions.length > 0 ? (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-xs text-red-800 font-medium">❌ Tidak dapat dihapus:</p>
                      <p className="text-xs text-red-700 mt-1">
                        Customer ini memiliki {customerToDelete.transactions.length} riwayat transaksi
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-xs text-yellow-800 font-medium">⚠️ Peringatan:</p>
                      <p className="text-xs text-yellow-700 mt-1">
                        Tindakan ini tidak dapat dibatalkan
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsDeleteOpen(false)}
                    disabled={isDeleting}
                    className="w-full sm:w-auto"
                  >
                    Batal
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleDeleteCustomer}
                    disabled={isDeleting || (customerToDelete.transactions && customerToDelete.transactions.length > 0)}
                    className="w-full sm:w-auto"
                  >
                    {isDeleting ? 'Menghapus...' : 'Ya, Hapus Customer'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}