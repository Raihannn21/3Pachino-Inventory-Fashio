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

export const exportTransactionsToExcel = (transactions: TransactionForExport[], period: number) => {
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
  XLSX.utils.book_append_sheet(wb, ws, 'Laporan Transaksi');

  // Generate filename with current date
  const currentDate = new Date().toISOString().split('T')[0];
  const filename = `Laporan_Transaksi_${period}hari_${currentDate}.xlsx`;

  // Save file
  XLSX.writeFile(wb, filename);
};
