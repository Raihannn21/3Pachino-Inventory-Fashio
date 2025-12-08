import * as XLSX from 'xlsx';

export interface TransactionForExport {
  id: string;
  date: string;
  type: string;
  supplier: string;
  user: string;
  totalAmount: number;
  profit: number;
  itemCount: number;
  status: string;
  invoiceNumber: string;
}

export interface VariantForExport {
  barcode: string;
  productName: string;
  size: string;
  color: string;
  stock?: number;
}

export const exportBarcodesToExcel = (variants: VariantForExport[], productName: string) => {
  // Format data for Excel
  const excelData = variants.map((variant, index) => ({
    'No': index + 1,
    'Barcode': variant.barcode,
    'Nama Produk': variant.productName,
    'Ukuran': variant.size,
    'Warna': variant.color,
    'Stok': variant.stock || 0,
  }));

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(excelData);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 5 },  // No
    { wch: 20 }, // Barcode
    { wch: 30 }, // Nama Produk
    { wch: 10 }, // Ukuran
    { wch: 15 }, // Warna
    { wch: 10 }, // Stok
  ];

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Barcode List');

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().slice(0, 10);
  const fileName = `Barcode_${productName.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.xlsx`;

  // Download file
  XLSX.writeFile(workbook, fileName);
};

export const exportTransactionsToExcel = (transactions: TransactionForExport[], period: number, filePrefix: string = 'Transaksi') => {
  // Format data for Excel
  const excelData = transactions.map((transaction, index) => ({
    'No': index + 1,
    'Tanggal': new Date(transaction.date).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }),
    'No. Invoice': transaction.invoiceNumber,
    'Tipe Transaksi': 
      transaction.type === 'SALE' ? 'Penjualan' :
      transaction.type === 'PURCHASE' ? 'Pembelian' :
      transaction.type === 'RETURN_SALE' ? 'Retur Jual' :
      transaction.type === 'RETURN_PURCHASE' ? 'Retur Beli' :
      'Penyesuaian',
    'Supplier/User': transaction.type === 'PURCHASE' || transaction.type === 'RETURN_PURCHASE' 
      ? transaction.supplier 
      : transaction.user,
    'Jumlah Item': transaction.itemCount,
    'Total Amount (IDR)': transaction.totalAmount,
    'Profit (IDR)': transaction.type === 'SALE' ? transaction.profit : 0,
    'Status': 
      transaction.status === 'COMPLETED' ? 'Selesai' :
      transaction.status === 'PENDING' ? 'Pending' :
      'Batal'
  }));

  // Calculate summary
  const totalSales = transactions
    .filter(t => t.type === 'SALE')
    .reduce((sum, t) => sum + t.totalAmount, 0);
  
  const totalPurchases = transactions
    .filter(t => t.type === 'PURCHASE')
    .reduce((sum, t) => sum + t.totalAmount, 0);
  
  const totalProfit = transactions
    .filter(t => t.type === 'SALE')
    .reduce((sum, t) => sum + t.profit, 0);
  
  const totalItems = transactions
    .reduce((sum, t) => sum + t.itemCount, 0);

  // Add summary rows
  const summaryData = [
    {},
    { 'No': '', 'Tanggal': 'RINGKASAN', 'No. Invoice': '', 'Tipe Transaksi': '', 'Supplier/User': '', 'Jumlah Item': '', 'Total Amount (IDR)': '', 'Profit (IDR)': '', 'Status': '' },
    {},
    { 'No': '', 'Tanggal': 'Total Penjualan', 'No. Invoice': '', 'Tipe Transaksi': '', 'Supplier/User': '', 'Jumlah Item': '', 'Total Amount (IDR)': totalSales, 'Profit (IDR)': '', 'Status': '' },
    { 'No': '', 'Tanggal': 'Total Pembelian', 'No. Invoice': '', 'Tipe Transaksi': '', 'Supplier/User': '', 'Jumlah Item': '', 'Total Amount (IDR)': totalPurchases, 'Profit (IDR)': '', 'Status': '' },
    { 'No': '', 'Tanggal': 'Total Profit', 'No. Invoice': '', 'Tipe Transaksi': '', 'Supplier/User': '', 'Jumlah Item': '', 'Total Amount (IDR)': '', 'Profit (IDR)': totalProfit, 'Status': '' },
    { 'No': '', 'Tanggal': 'Total Item', 'No. Invoice': '', 'Tipe Transaksi': '', 'Supplier/User': '', 'Jumlah Item': totalItems, 'Total Amount (IDR)': '', 'Profit (IDR)': '', 'Status': '' },
  ];

  const finalData = [...excelData, ...summaryData];

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(finalData);

  // Set column widths
  const colWidths = [
    { wch: 5 },   // No
    { wch: 15 },  // Tanggal
    { wch: 15 },  // No. Invoice
    { wch: 15 },  // Tipe Transaksi
    { wch: 20 },  // Supplier/User
    { wch: 12 },  // Jumlah Item
    { wch: 18 },  // Total Amount
    { wch: 15 },  // Profit
    { wch: 10 },  // Status
  ];
  ws['!cols'] = colWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, `Laporan ${filePrefix}`);

  // Generate filename with current date
  const currentDate = new Date().toISOString().split('T')[0];
  const filename = `Laporan_${filePrefix}_${period}hari_${currentDate}.xlsx`;

  // Save file
  XLSX.writeFile(wb, filename);
};
