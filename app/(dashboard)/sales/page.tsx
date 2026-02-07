'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
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
import { Eye, Calendar, TrendingUp, Package, Users, Receipt as ReceiptIcon, ShoppingCart, Trash2, ChevronDown, Printer } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { id } from 'date-fns/locale';
import { toast } from 'sonner';
import Receipt from '@/components/receipt/Receipt';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DayPicker, DateRange } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { 
  printThermalDailyReport, 
  isThermalPrinterConnected, 
  connectThermalPrinter,
  type DailyReportData 
} from '@/lib/thermal-printer';

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
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [open, setOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptTransaction, setReceiptTransaction] = useState<Transaction | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPrintingReport, setIsPrintingReport] = useState(false);
  const [summaryStats, setSummaryStats] = useState({
    totalRevenue: 0,
    totalTransactions: 0,
    averageTransaction: 0
  });

  // Fetch sales data
  const fetchSales = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      });

      if (dateRange?.from && dateRange?.to) {
        // Set to start of day (00:00:00) and end of day (23:59:59)
        const startOfDayDate = startOfDay(dateRange.from);
        const endOfDayDate = endOfDay(dateRange.to);
        params.append('startDate', startOfDayDate.toISOString());
        params.append('endDate', endOfDayDate.toISOString());
      }

      const response = await fetch(`/api/sales?${params}`);
      const data = await response.json();

      if (response.ok) {
        setSalesData(data);
        
        // Fetch ALL data for correct summary statistics (without pagination)
        const allParams = new URLSearchParams({
          page: '1',
          limit: '999999' // Get all records
        });
        
        if (dateRange?.from && dateRange?.to) {
          const startOfDayDate = startOfDay(dateRange.from);
          const endOfDayDate = endOfDay(dateRange.to);
          allParams.append('startDate', startOfDayDate.toISOString());
          allParams.append('endDate', endOfDayDate.toISOString());
        }
        
        const allResponse = await fetch(`/api/sales?${allParams}`);
        const allData = await allResponse.json();
        
        if (allResponse.ok && allData.sales) {
          const totalRevenue = allData.sales.reduce((sum: number, sale: any) => sum + Number(sale.totalAmount), 0);
          const totalTx = allData.sales.length;
          const avgTx = totalTx > 0 ? totalRevenue / totalTx : 0;
          
          setSummaryStats({
            totalRevenue: totalRevenue,
            totalTransactions: totalTx,
            averageTransaction: avgTx
          });
        }
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
    fetchSales(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, dateRange]);

  // Handle date range change
  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from && range?.to) {
      setCurrentPage(1);
      setOpen(false);
    }
  };

  // Format date range for display
  const formatDateRange = () => {
    if (dateRange?.from && dateRange?.to) {
      return `${format(dateRange.from, 'dd MMM yyyy', { locale: id })} - ${format(dateRange.to, 'dd MMM yyyy', { locale: id })}`;
    }
    return 'Pilih Tanggal';
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

  // Open delete confirmation
  const openDeleteConfirmation = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
    setIsDeleteOpen(true);
  };

  // Delete transaction
  const handleDeleteTransaction = async () => {
    if (!transactionToDelete) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/sales/${transactionToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Transaksi ${transactionToDelete.invoiceNumber} berhasil dihapus dan inventory dikembalikan`);
        setIsDeleteOpen(false);
        setTransactionToDelete(null);
        // Refresh data
        fetchSales(currentPage);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Gagal menghapus transaksi');
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('Gagal menghapus transaksi');
    } finally {
      setIsDeleting(false);
    }
  };

  // Print daily report
  const handlePrintDailyReport = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      toast.error('Silakan pilih rentang tanggal terlebih dahulu');
      return;
    }

    // Check if printer connected
    if (!isThermalPrinterConnected()) {
      toast.error('Printer thermal belum terkoneksi. Silakan connect printer terlebih dahulu di halaman Struk.');
      return;
    }

    try {
      setIsPrintingReport(true);

      // Fetch ALL sales data without pagination for print
      const params = new URLSearchParams({
        page: '1',
        limit: '999999' // Fetch all data
      });

      if (dateRange?.from && dateRange?.to) {
        const startOfDayDate = startOfDay(dateRange.from);
        const endOfDayDate = endOfDay(dateRange.to);
        params.append('startDate', startOfDayDate.toISOString());
        params.append('endDate', endOfDayDate.toISOString());
      }

      const response = await fetch(`/api/sales?${params}`);
      const allSalesData = await response.json();

      if (!response.ok || !allSalesData.sales) {
        toast.error('Gagal mengambil data penjualan');
        return;
      }

      // Group sales by customer and calculate totals
      const customerMap = new Map<string, { name: string; count: number; total: number }>();
      
      allSalesData.sales.forEach((sale: Transaction) => {
        const customerName = sale.supplier?.name || 'Customer';
        const existing = customerMap.get(customerName) || { name: customerName, count: 0, total: 0 };
        customerMap.set(customerName, {
          name: customerName,
          count: existing.count + 1,
          total: existing.total + Number(sale.totalAmount)
        });
      });

      // Convert to array
      const customers = Array.from(customerMap.values()).map(customer => ({
        name: customer.name,
        transactionCount: customer.count,
        totalAmount: customer.total
      }));

      // Calculate totals from ALL data
      const totalRevenue = allSalesData.sales.reduce((sum: number, sale: Transaction) => sum + Number(sale.totalAmount), 0);
      const totalTx = allSalesData.sales.length;

      // Calculate Cash vs Transfer totals
      let totalCash = 0;
      let totalTransfer = 0;
      
      allSalesData.sales.forEach((sale: Transaction) => {
        const amount = Number(sale.totalAmount);
        const notes = sale.notes || '';
        
        if (notes.toLowerCase().includes('cash')) {
          totalCash += amount;
        } else if (notes.toLowerCase().includes('transfer')) {
          totalTransfer += amount;
        }
        // Jika tidak ada keterangan atau format lain, tidak dihitung di breakdown
      });

      // Format date range
      const dateRangeStr = dateRange.from && dateRange.to
        ? `${format(dateRange.from, 'dd MMM yyyy', { locale: id })} - ${format(dateRange.to, 'dd MMM yyyy', { locale: id })}`
        : format(new Date(), 'dd MMM yyyy', { locale: id });

      const reportData: DailyReportData = {
        date: format(dateRange.from, 'dd MMM yyyy', { locale: id }),
        dateRange: dateRangeStr,
        customers: customers,
        totalRevenue: totalRevenue,
        totalTransactions: totalTx,
        totalCash: totalCash,
        totalTransfer: totalTransfer
      };

      await printThermalDailyReport(reportData);
      toast.success(`Laporan harian berhasil dicetak! (${totalTx} transaksi)`);
    } catch (error) {
      console.error('Error printing daily report:', error);
      toast.error('Gagal mencetak laporan harian');
    } finally {
      setIsPrintingReport(false);
    }
  };

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
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Memuat Struk Penjualan</h2>
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
              <CardTitle className="text-xs sm:text-sm font-medium">Total Struk</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold">Rp {summaryStats.totalRevenue.toLocaleString('id-ID')}</div>
              <p className="text-xs text-muted-foreground">
                Dari {summaryStats.totalTransactions} transaksi
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Total Transaksi</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold">{summaryStats.totalTransactions}</div>
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
              <div className="text-lg sm:text-2xl font-bold">Rp {summaryStats.averageTransaction.toLocaleString('id-ID')}</div>
              <p className="text-xs text-muted-foreground">
                Per transaksi
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Date Filter */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Daftar Transaksi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4">
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="justify-between text-left font-normal w-full sm:w-auto"
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {formatDateRange()}
                    </div>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <DayPicker
                    mode="range"
                    selected={dateRange}
                    onSelect={handleDateRangeChange}
                    numberOfMonths={2}
                    locale={id}
                    className="p-3"
                    classNames={{
                      months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                      month: "space-y-4",
                      caption: "flex justify-center pt-1 relative items-center",
                      caption_label: "text-sm font-medium",
                      nav: "space-x-1 flex items-center",
                      nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                      nav_button_previous: "absolute left-1",
                      nav_button_next: "absolute right-1",
                      table: "w-full border-collapse space-y-1",
                      head_row: "flex",
                      head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                      row: "flex w-full mt-2",
                      cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                      day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
                      day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                      day_today: "bg-accent text-accent-foreground",
                      day_outside: "text-muted-foreground opacity-50",
                      day_disabled: "text-muted-foreground opacity-50",
                      day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                      day_hidden: "invisible",
                    }}
                  />
                </PopoverContent>
              </Popover>
              
              {/* Print Daily Report Button */}
              <Button
                onClick={handlePrintDailyReport}
                disabled={isPrintingReport || !dateRange?.from || !dateRange?.to}
                variant="default"
                className="w-full sm:w-auto"
              >
                <Printer className="h-4 w-4 mr-2" />
                {isPrintingReport ? 'Mencetak...' : 'Print Laporan Harian'}
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
                            <div className="font-medium text-sm">{sale.supplier?.name || 'Walk-in Customer'}</div>
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
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => openDeleteConfirmation(sale)}
                              className="text-xs px-2 py-1"
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
                <div className="hidden sm:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama Customer</TableHead>
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
                            {sale.supplier?.name || 'Walk-in Customer'}
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
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => openDeleteConfirmation(sale)}
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
                      Tidak ada transaksi pada periode ini
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

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <DialogContent className="w-[95vw] max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg">Konfirmasi Hapus Transaksi</DialogTitle>
            </DialogHeader>
            
            {transactionToDelete && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm">
                    Apakah Anda yakin ingin menghapus transaksi <strong>{transactionToDelete.invoiceNumber}</strong>?
                  </p>
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-xs text-yellow-800 font-medium">⚠️ Peringatan:</p>
                    <ul className="text-xs text-yellow-700 mt-1 space-y-1">
                      <li>• Stock barang akan dikembalikan ke inventory</li>
                      <li>• Total: Rp {Number(transactionToDelete.totalAmount).toLocaleString('id-ID')}</li>
                      <li>• {transactionToDelete.items.length} item akan dikembalikan</li>
                      <li>• Tindakan ini tidak dapat dibatalkan</li>
                    </ul>
                  </div>
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
                    onClick={handleDeleteTransaction}
                    disabled={isDeleting}
                    className="w-full sm:w-auto"
                  >
                    {isDeleting ? 'Menghapus...' : 'Ya, Hapus Transaksi'}
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
