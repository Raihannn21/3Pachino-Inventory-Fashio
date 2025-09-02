'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Eye, Calendar, TrendingUp, Package, Users, Receipt as ReceiptIcon } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import Receipt from '@/components/receipt/Receipt';

interface TransactionItem {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  variant?: {
    product: {
      name: string;
      sku: string;
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
    };
  };
  product: {
    name: string;
    sku: string;
    category: {
      name: string;
    };
    brand: {
      name: string;
    };
  };
}

interface Transaction {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  notes?: string;
  transactionDate: string;
  items: TransactionItem[];
  supplier?: {
    id: string;
    name: string;
    phone?: string;
  };
  user: {
    name: string;
    email: string;
  };
}

interface SalesData {
  sales: Transaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function SalesPage() {
  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptTransaction, setReceiptTransaction] = useState<Transaction | null>(null);

  // Fetch sales data
  const fetchSales = async (page = 1, search = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      });

      if (search) {
        params.append('search', search);
      }

      const response = await fetch(`/api/sales?${params}`);
      const data = await response.json();

      if (response.ok) {
        setSalesData(data);
      } else {
        console.error('Failed to fetch sales:', data.error);
      }
    } catch (error) {
      console.error('Error fetching sales:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales(currentPage, searchTerm);
  }, [currentPage]);

  // Handle search
  const handleSearch = () => {
    setCurrentPage(1);
    fetchSales(1, searchTerm);
  };

  // View transaction detail
  const viewDetail = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsDetailOpen(true);
  };

  // Show receipt
  const showReceiptDialog = (transaction: Transaction) => {
    setReceiptTransaction(transaction);
    setShowReceipt(true);
  };

  // Calculate summary statistics
  const totalSales = salesData?.sales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0) || 0;
  const totalTransactions = salesData?.pagination.total || 0;
  const averageTransaction = totalTransactions > 0 ? totalSales / totalTransactions : 0;

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Penjualan</h1>
          <p className="text-muted-foreground">
            Kelola dan pantau semua transaksi penjualan
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Penjualan</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Rp {totalSales.toLocaleString('id-ID')}</div>
              <p className="text-xs text-muted-foreground">
                Dari {totalTransactions} transaksi
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transaksi</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTransactions}</div>
              <p className="text-xs text-muted-foreground">
                Transaksi berhasil
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rata-rata Transaksi</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Rp {averageTransaction.toLocaleString('id-ID')}</div>
              <p className="text-xs text-muted-foreground">
                Per transaksi
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card>
          <CardHeader>
            <CardTitle>Daftar Transaksi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari berdasarkan nomor invoice atau customer..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
              </div>
              <Button onClick={handleSearch}>
                Cari
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="text-sm text-muted-foreground">Memuat data...</div>
              </div>
            ) : (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No. Invoice</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Kasir</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesData?.sales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell className="font-medium">
                          {sale.invoiceNumber}
                        </TableCell>
                        <TableCell>
                          {format(new Date(sale.transactionDate), 'dd MMM yyyy HH:mm', { locale: id })}
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-green-600">
                            Rp {Number(sale.totalAmount).toLocaleString('id-ID')}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {sale.items.length} item{sale.items.length > 1 ? 's' : ''}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {sale.user.name}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => viewDetail(sale)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Detail
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => showReceiptDialog(sale)}
                            >
                              <ReceiptIcon className="h-4 w-4 mr-1" />
                              Struk
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {salesData && salesData.pagination.pages > 1 && (
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Menampilkan {((salesData.pagination.page - 1) * salesData.pagination.limit) + 1} - {Math.min(salesData.pagination.page * salesData.pagination.limit, salesData.pagination.total)} dari {salesData.pagination.total} transaksi
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage(currentPage - 1)}
                      >
                        Sebelumnya
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage >= salesData.pagination.pages}
                        onClick={() => setCurrentPage(currentPage + 1)}
                      >
                        Selanjutnya
                      </Button>
                    </div>
                  </div>
                )}

                {salesData?.sales.length === 0 && (
                  <div className="text-center py-8">
                    <div className="text-sm text-muted-foreground">
                      {searchTerm ? `Tidak ada transaksi yang ditemukan untuk "${searchTerm}"` : 'Belum ada transaksi penjualan'}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transaction Detail Modal */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detail Transaksi</DialogTitle>
            </DialogHeader>
            {selectedTransaction && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">No. Invoice</label>
                    <div className="font-semibold">{selectedTransaction.invoiceNumber}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Tanggal</label>
                    <div>{format(new Date(selectedTransaction.transactionDate), 'dd MMMM yyyy HH:mm', { locale: id })}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Kasir</label>
                    <div>{selectedTransaction.user.name}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Total</label>
                    <div className="font-semibold text-green-600">
                      Rp {Number(selectedTransaction.totalAmount).toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>

                {selectedTransaction.notes && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Catatan</label>
                    <div className="mt-1 p-2 bg-gray-50 rounded text-sm">
                      {selectedTransaction.notes}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Items</label>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produk</TableHead>
                        <TableHead>Varian</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Harga</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedTransaction.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{item.variant?.product.name || item.product.name}</div>
                              <div className="text-xs text-muted-foreground">{item.variant?.product.sku || item.product.sku}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {item.variant && (
                              <div className="flex gap-1">
                                <Badge variant="outline" className="text-xs">
                                  {item.variant.size.name}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {item.variant.color.name}
                                </Badge>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>Rp {Number(item.unitPrice).toLocaleString('id-ID')}</TableCell>
                          <TableCell className="font-semibold">
                            Rp {Number(item.totalPrice).toLocaleString('id-ID')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Receipt Dialog */}
        <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Struk Penjualan</DialogTitle>
            </DialogHeader>
            {receiptTransaction && (
              <Receipt 
                transaction={{
                  id: receiptTransaction.id,
                  invoiceNumber: receiptTransaction.invoiceNumber,
                  transactionDate: receiptTransaction.transactionDate,
                  totalAmount: Number(receiptTransaction.totalAmount),
                  notes: receiptTransaction.notes,
                  items: receiptTransaction.items.map(item => ({
                    id: item.id,
                    quantity: item.quantity,
                    price: Number(item.unitPrice),
                    subtotal: Number(item.totalPrice),
                    variant: item.variant ? {
                      size: item.variant.size,
                      color: item.variant.color,
                      product: item.variant.product
                    } : undefined,
                    product: item.product
                  }))
                }}
                customerName={receiptTransaction.supplier?.name || 'Walk-in Customer'}
                onClose={() => setShowReceipt(false)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
