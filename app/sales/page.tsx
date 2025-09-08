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
import { Search, Eye, Calendar, TrendingUp, Package, Users, Receipt as ReceiptIcon, ShoppingCart } from 'lucide-react';
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

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto p-3 sm:p-6">
        {/* Header Skeleton */}
        <div className="space-y-4 sm:space-y-6">
          <div>
            <div className="h-6 sm:h-8 w-40 sm:w-48 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-4 w-32 sm:w-64 bg-gray-200 rounded animate-pulse"></div>
          </div>

          {/* Loading Animation Center */}
          <div className="flex items-center justify-center mb-6 sm:mb-8">
            <div className="text-center">
              <div className="relative mb-4">
                <ShoppingCart className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-blue-600 animate-pulse" />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Memuat Data Penjualan</h2>
              <p className="text-xs sm:text-sm text-gray-600">Mengambil data transaksi terbaru...</p>
              <div className="flex items-center justify-center mt-4 space-x-1">
                <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce"></div>
                <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
          </div>

          {/* Summary Cards Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {[1, 2, 3].map((item) => (
              <Card key={item} className="border-0 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="h-3 sm:h-4 w-20 sm:w-24 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-6 sm:h-8 w-16 sm:w-20 bg-gray-200 rounded animate-pulse mb-2"></div>
                  <div className="h-3 w-24 sm:w-32 bg-gray-200 rounded animate-pulse"></div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Search and Table Skeleton */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="h-5 sm:h-6 w-28 sm:w-32 bg-gray-200 rounded animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="h-48 sm:h-64 bg-gray-100 rounded animate-pulse flex items-center justify-center">
                <TrendingUp className="h-8 w-8 sm:h-12 sm:w-12 text-gray-300" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-3 sm:p-6">
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Data Penjualan</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Kelola dan pantau semua transaksi penjualan
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Total Penjualan</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold">Rp {totalSales.toLocaleString('id-ID')}</div>
              <p className="text-xs text-muted-foreground">
                Dari {totalTransactions} transaksi
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Total Transaksi</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold">{totalTransactions}</div>
              <p className="text-xs text-muted-foreground">
                Transaksi berhasil
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Rata-rata Transaksi</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold">Rp {averageTransaction.toLocaleString('id-ID')}</div>
              <p className="text-xs text-muted-foreground">
                Per transaksi
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Daftar Transaksi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari berdasarkan nomor invoice atau customer..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 text-sm"
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
              </div>
              <Button onClick={handleSearch} className="w-full sm:w-auto">
                Cari
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="text-sm text-muted-foreground">Memuat data...</div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Mobile Card View */}
                <div className="block sm:hidden space-y-3">
                  {salesData?.sales.map((sale) => (
                    <Card key={sale.id} className="p-3">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-sm">{sale.invoiceNumber}</div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(sale.transactionDate), 'dd MMM yyyy HH:mm', { locale: id })}
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {sale.items.length} item{sale.items.length > 1 ? 's' : ''}
                          </Badge>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-semibold text-green-600 text-sm">
                              Rp {Number(sale.totalAmount).toLocaleString('id-ID')}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Kasir: {sale.user.name}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => viewDetail(sale)}
                              className="text-xs px-2 py-1"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Detail
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => showReceiptDialog(sale)}
                              className="text-xs px-2 py-1"
                            >
                              <ReceiptIcon className="h-3 w-3 mr-1" />
                              Struk
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden sm:block overflow-x-auto">
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
                </div>

                {/* Pagination */}
                {salesData && salesData.pagination.pages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
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
          <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">Detail Transaksi</DialogTitle>
            </DialogHeader>
            {selectedTransaction && (
              <div className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-muted-foreground">No. Invoice</label>
                    <div className="font-semibold text-sm sm:text-base">{selectedTransaction.invoiceNumber}</div>
                  </div>
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-muted-foreground">Tanggal</label>
                    <div className="text-sm sm:text-base">{format(new Date(selectedTransaction.transactionDate), 'dd MMMM yyyy HH:mm', { locale: id })}</div>
                  </div>
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-muted-foreground">Kasir</label>
                    <div className="text-sm sm:text-base">{selectedTransaction.user.name}</div>
                  </div>
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-muted-foreground">Total</label>
                    <div className="font-semibold text-green-600 text-sm sm:text-base">
                      Rp {Number(selectedTransaction.totalAmount).toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>

                {selectedTransaction.notes && (
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-muted-foreground">Catatan</label>
                    <div className="mt-1 p-2 bg-gray-50 rounded text-xs sm:text-sm">
                      {selectedTransaction.notes}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs sm:text-sm font-medium text-muted-foreground mb-2 block">Items</label>
                  
                  {/* Mobile Item View */}
                  <div className="block sm:hidden space-y-2">
                    {selectedTransaction.items.map((item) => (
                      <div key={item.id} className="border rounded-lg p-3 space-y-2">
                        <div>
                          <div className="font-medium text-sm">{item.variant?.product.name || item.product.name}</div>
                          <div className="text-xs text-muted-foreground">{item.variant?.product.sku || item.product.sku}</div>
                        </div>
                        
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
                        
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Qty:</span> {item.quantity}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Harga:</span> Rp {Number(item.unitPrice).toLocaleString('id-ID')}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Total:</span> 
                            <span className="font-semibold"> Rp {Number(item.totalPrice).toLocaleString('id-ID')}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden sm:block max-h-64 overflow-y-auto border rounded-md">
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
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Receipt Dialog */}
        <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
          <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">Struk Penjualan</DialogTitle>
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
