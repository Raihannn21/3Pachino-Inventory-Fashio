'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Logo } from '@/components/ui/logo';
import { 
  Printer, 
  Download, 
  Share2, 
  Copy,
  Calendar,
  Hash,
  User,
  MessageCircle,
  Bluetooth,
  BluetoothConnected
} from 'lucide-react';
import { toast } from "sonner";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { 
  thermalPrinter, 
  isBluetoothSupported, 
  type ReceiptData 
} from '@/lib/thermal-printer';

// Print CSS optimized untuk thermal printer 80mm
const printStyles = `
  @media print {
    @page {
      size: 80mm auto;
      margin: 0;
    }
    
    body * {
      visibility: hidden;
    }
    .receipt-print-area,
    .receipt-print-area * {
      visibility: visible;
    }
    .receipt-print-area {
      position: absolute;
      left: 0;
      top: 0;
      width: 80mm;
      background: white;
      overflow: visible;
    }
    .no-print {
      display: none !important;
    }
    
    /* Optimize for 80mm thermal paper */
    .receipt-print-area .receipt-content {
      padding: 2mm !important;
      width: 76mm !important;
      page-break-inside: avoid;
    }
    
    .receipt-print-area .store-name {
      font-size: 18pt !important;
      font-weight: bold !important;
    }
    
    .receipt-print-area .store-info {
      font-size: 10pt !important;
    }
    
    .receipt-print-area .invoice-info span,
    .receipt-print-area .total-row {
      font-size: 10pt !important;
    }
    
    .receipt-print-area .total-final {
      font-size: 14pt !important;
      font-weight: bold !important;
    }
    
    .receipt-print-area .item-name {
      font-size: 10pt !important;
    }
    
    .receipt-print-area .item-variant {
      font-size: 9pt !important;
    }
    
    /* Hide watermark for print */
    .receipt-print-area img,
    .receipt-print-area .watermark {
      display: none !important;
    }
    
    /* Receipt items layout */
    .receipt-items {
      page-break-inside: auto;
    }
    
    .receipt-item {
      page-break-inside: avoid;
      display: flex !important;
      flex-direction: column !important;
      margin-bottom: 3mm !important;
    }
    
    .item-qty-price {
      text-align: left !important;
      display: flex !important;
      flex-direction: row !important;
      justify-content: space-between !important;
    }
  }
`;

interface ReceiptProps {
  transaction: {
    id: string;
    invoiceNumber: string;
    transactionDate: string;
    totalAmount: number;
    notes?: string;
    items: Array<{
      id: string;
      quantity: number;
      price: number;
      subtotal: number;
      variant?: {
        size: { name: string };
        color: { name: string };
        product: {
          name: string;
          category: { name: string };
          brand: { name: string };
        };
      };
      product?: {
        name: string;
        category: { name: string };
        brand: { name: string };
      };
    }>;
  };
  customerName?: string;
  onClose?: () => void;
}

export default function Receipt({ transaction, customerName, onClose }: ReceiptProps) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isThermalConnected, setIsThermalConnected] = useState(false);
  const [isConnectingThermal, setIsConnectingThermal] = useState(false);
  const [isPrintingThermal, setIsPrintingThermal] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handlePrint = () => {
    const printContent = receiptRef.current;
    if (!printContent) return;

    // Langsung cetak tanpa window baru
    window.print();
  };

  // Thermal Printer Functions
  const handleConnectThermal = async () => {
    if (!isBluetoothSupported()) {
      toast.error('Browser Anda tidak mendukung Bluetooth. Gunakan Chrome atau Edge.');
      return;
    }

    setIsConnectingThermal(true);
    try {
      await thermalPrinter.connect();
      setIsThermalConnected(true);
      toast.success('Printer thermal berhasil terkoneksi!');
    } catch (error: any) {
      console.error('Error connecting thermal printer:', error);
      if (error.name === 'NotFoundError') {
        toast.error('Tidak ada printer ditemukan. Pastikan printer Bluetooth aktif.');
      } else if (error.name === 'SecurityError') {
        toast.error('Akses Bluetooth ditolak. Izinkan akses Bluetooth di browser.');
      } else {
        toast.error('Gagal terkoneksi ke printer thermal.');
      }
    } finally {
      setIsConnectingThermal(false);
    }
  };

  const handleDisconnectThermal = async () => {
    try {
      await thermalPrinter.disconnect();
      setIsThermalConnected(false);
      toast.success('Printer thermal terputus');
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  };

  const handlePrintThermal = async () => {
    if (!isThermalConnected) {
      toast.error('Printer belum terkoneksi. Silakan connect terlebih dahulu.');
      return;
    }

    setIsPrintingThermal(true);
    try {
      const receiptData: ReceiptData = {
        invoiceNumber: transaction.invoiceNumber,
        date: formatDate(transaction.transactionDate),
        items: transaction.items.map(item => {
          const product = item.variant?.product || item.product;
          return {
            name: product?.name || 'Unknown Product',
            variant: item.variant 
              ? `${item.variant.size?.name} • ${item.variant.color?.name}`
              : undefined,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.subtotal
          };
        }),
        totalAmount: transaction.totalAmount,
        notes: transaction.notes,
        customerName: customerName
      };

      await thermalPrinter.printReceipt(receiptData);
      toast.success('Struk berhasil dicetak ke printer thermal!');
    } catch (error: any) {
      console.error('Error printing to thermal:', error);
      toast.error('Gagal mencetak ke printer thermal. Coba reconnect printer.');
      setIsThermalConnected(false);
    } finally {
      setIsPrintingThermal(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!receiptRef.current) return;
    
    setIsGeneratingPDF(true);
    try {
      // Capture the receipt as image
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: true,
        height: receiptRef.current.scrollHeight,
        width: receiptRef.current.scrollWidth
      });

      const imgData = canvas.toDataURL('image/png');
      
      // Calculate dimensions
      const imgWidth = 76; // PDF width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Calculate dynamic PDF height based on content
      const pdfHeight = Math.max(120, imgHeight + 10); // Minimum 120mm or content height + margin
      
      // Create PDF with dynamic height
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, pdfHeight] // Dynamic height based on content
      });

      // Check if content needs multiple pages
      const maxHeightPerPage = 280; // Maximum height per page in mm
      
      if (imgHeight <= maxHeightPerPage) {
        // Single page
        pdf.addImage(imgData, 'PNG', 2, 2, imgWidth, imgHeight);
      } else {
        // Multiple pages needed
        let currentY = 0;
        let pageNumber = 1;
        
        while (currentY < imgHeight) {
          if (pageNumber > 1) {
            pdf.addPage([80, Math.min(maxHeightPerPage + 10, imgHeight - currentY + 10)]);
          }
          
          const remainingHeight = Math.min(maxHeightPerPage, imgHeight - currentY);
          
          // Create a temporary canvas for this page section
          const pageCanvas = document.createElement('canvas');
          const pageCtx = pageCanvas.getContext('2d')!;
          
          const scaleFactor = canvas.width / imgWidth;
          const sourceY = currentY * scaleFactor;
          const sourceHeight = remainingHeight * scaleFactor;
          
          pageCanvas.width = canvas.width;
          pageCanvas.height = sourceHeight;
          
          // Draw the section of the original canvas
          pageCtx.drawImage(
            canvas,
            0, sourceY, // Source x, y
            canvas.width, sourceHeight, // Source width, height
            0, 0, // Destination x, y
            canvas.width, sourceHeight // Destination width, height
          );
          
          const pageImgData = pageCanvas.toDataURL('image/png');
          pdf.addImage(pageImgData, 'PNG', 2, 2, imgWidth, remainingHeight);
          
          currentY += maxHeightPerPage;
          pageNumber++;
        }
      }

      pdf.save(`Struk-${transaction.invoiceNumber}.pdf`);
      
      toast.success('PDF berhasil didownload!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Gagal generate PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleShare = async () => {
    if (!receiptRef.current) return;
    
    try {
      // Generate canvas from receipt
      const canvas = await html2canvas(receiptRef.current, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher quality
        width: receiptRef.current.offsetWidth,
        height: receiptRef.current.offsetHeight,
        useCORS: true,
        allowTaint: true
      });

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob!);
        }, 'image/png');
      });

      // Create file from blob
      const file = new File([blob], `struk-${transaction.invoiceNumber}.png`, {
        type: 'image/png'
      });

      // Check if Web Share API supports files
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: `Struk Penjualan - ${transaction.invoiceNumber}`,
            text: `Struk penjualan dari 3PACHINO`,
            files: [file]
          });
          toast.success('Struk berhasil dibagikan!');
        } catch (error) {
          // User cancelled or error sharing
          console.log('Share cancelled or failed');
        }
      } else {
        // Fallback: Download image
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `struk-${transaction.invoiceNumber}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success('Struk berhasil diunduh sebagai gambar!');
      }
    } catch (error) {
      console.error('Error sharing receipt image:', error);
      toast.error('Gagal membagikan struk. Silakan coba lagi.');
    }
  };

  const handlePrintVersion = () => {
    const printUrl = `${window.location.origin}/sales/${transaction.id}/print?auto-print=true`;
    window.open(printUrl, '_blank');
  };

  const handleCopyUrl = async () => {
    const receiptUrl = `${window.location.origin}/sales/${transaction.id}`;
    await navigator.clipboard.writeText(receiptUrl);
    toast.success('Link struk berhasil disalin!');
  };

  const handleWhatsApp = () => {
    const receiptUrl = `${window.location.origin}/sales/${transaction.id}`;
    const message = `Halo! Berikut struk pembelian Anda:

📧 *Invoice:* ${transaction.invoiceNumber}
📅 *Tanggal:* ${formatDate(transaction.transactionDate)}
${customerName && customerName.trim() !== '' ? `👤 *Customer:* ${customerName}` : ''}

🛍️ *Items:*
${transaction.items.map(item => {
  const product = item.variant?.product || item.product;
  return `• ${product?.name} (${item.quantity}x) ${formatCurrency(item.subtotal)}`;
}).join('\n')}

💰 *Total:* ${formatCurrency(transaction.totalAmount)}

Lihat struk lengkap: ${receiptUrl}

Terima kasih telah berbelanja di 3PACHINO! 🙏`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
  };

  const handleCopyInvoice = async () => {
    await navigator.clipboard.writeText(transaction.invoiceNumber);
    toast.success('Nomor invoice disalin!');
  };

  const subtotal = transaction.items.reduce((sum, item) => sum + item.subtotal, 0);
  const tax = 0; // Bisa ditambahkan jika ada PPN
  const discount = 0; // Bisa ditambahkan jika ada diskon

  return (
    <>
      {/* Inject print styles */}
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      
      <div className="space-y-3 sm:space-y-4">
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 mb-3 sm:mb-4 no-print">
        {/* Thermal Printer Section */}
        {isBluetoothSupported() && (
          <div className="flex flex-wrap gap-2 w-full sm:w-auto border-b sm:border-b-0 sm:border-r border-gray-200 pb-2 sm:pb-0 sm:pr-2 mb-2 sm:mb-0">
            {!isThermalConnected ? (
              <Button 
                onClick={handleConnectThermal} 
                variant="default" 
                size="sm"
                disabled={isConnectingThermal}
                className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700"
              >
                <Bluetooth className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="text-xs sm:text-sm">
                  {isConnectingThermal ? 'Connecting...' : 'Connect Thermal'}
                </span>
              </Button>
            ) : (
              <>
                <Button 
                  onClick={handlePrintThermal} 
                  variant="default" 
                  size="sm"
                  disabled={isPrintingThermal}
                  className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700"
                >
                  <Printer className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="text-xs sm:text-sm">
                    {isPrintingThermal ? 'Printing...' : 'Print Thermal'}
                  </span>
                </Button>
                <Button 
                  onClick={handleDisconnectThermal} 
                  variant="outline" 
                  size="sm"
                  className="flex-1 sm:flex-none"
                >
                  <BluetoothConnected className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="text-xs sm:text-sm">Disconnect</span>
                </Button>
              </>
            )}
          </div>
        )}
        
        <div className="flex flex-wrap gap-2">
          <Button onClick={handlePrint} variant="outline" size="sm" className="flex-1 sm:flex-none">
            <Printer className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="text-xs sm:text-sm">Cetak Browser</span>
          </Button>
          <Button 
            onClick={handleDownloadPDF} 
            variant="outline" 
            size="sm"
            disabled={isGeneratingPDF}
            className="flex-1 sm:flex-none"
          >
            <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="text-xs sm:text-sm">{isGeneratingPDF ? 'Generating...' : 'Download PDF'}</span>
          </Button>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleShare} variant="outline" size="sm" className="flex-1 sm:flex-none">
            <Share2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="text-xs sm:text-sm">Bagikan</span>
          </Button>
          <Button onClick={handleWhatsApp} variant="outline" size="sm" className="text-green-600 hover:text-green-700 flex-1 sm:flex-none">
            <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="text-xs sm:text-sm">WhatsApp</span>
          </Button>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleCopyUrl} variant="outline" size="sm" className="flex-1 sm:flex-none">
            <Copy className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="text-xs sm:text-sm">Salin Link</span>
          </Button>
          <Button onClick={handleCopyInvoice} variant="outline" size="sm" className="flex-1 sm:flex-none">
            <Hash className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="text-xs sm:text-sm">Salin Invoice</span>
          </Button>
        </div>
        {onClose && (
          <Button onClick={onClose} variant="ghost" size="sm" className="w-full sm:w-auto sm:ml-auto">
            <span className="text-xs sm:text-sm">Tutup</span>
          </Button>
        )}
      </div>

      {/* Receipt Content */}
      <div ref={receiptRef} className="receipt bg-white receipt-print-area">
        <Card className="shadow-lg">
          <CardContent className="p-3 sm:p-6 relative">
            {/* Watermark Background */}
            <div className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center pointer-events-none opacity-40 z-0">
              <div className="w-full h-full max-w-lg max-h-lg flex items-center justify-center">
                <Image 
                  src="/3pachino.png" 
                  alt="3PACHINO Watermark" 
                  width={500}
                  height={500}
                  unoptimized
                  className="w-full h-full object-contain transform scale-200"
                  style={{ minWidth: '500px', minHeight: '500px' }}
                />
              </div>
            </div>
            
            {/* Content with z-index to appear above watermark */}
            <div className="receipt-content relative z-10 bg-white/80">
              {/* Header */}
              <div className="header text-center mb-4 sm:mb-6 bg-white p-3 sm:p-4 rounded">
                <h1 className="store-name text-xl sm:text-2xl font-bold">3PACHINO</h1>
                <div className="store-info text-xs sm:text-sm text-gray-600 mt-2">
                  <p>Premium Fashion Store</p>
                  <p>Telp: 0813-9590-7612</p>
                </div>
              </div>

              <Separator className="my-3 sm:my-4" />

            {/* Invoice Info */}
            <div className="invoice-info space-y-2 mb-3 sm:mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 sm:gap-2">
                  <Hash className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
                  <span className="text-xs sm:text-sm font-medium">Invoice:</span>
                </div>
                <span className="font-mono font-bold text-sm sm:text-base">{transaction.invoiceNumber}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 sm:gap-2">
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
                  <span className="text-xs sm:text-sm font-medium">Tanggal:</span>
                </div>
                <span className="text-sm sm:text-base">{formatDate(transaction.transactionDate)}</span>
              </div>

              {customerName && customerName.trim() !== '' && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <User className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
                    <span className="text-xs sm:text-sm font-medium">Customer:</span>
                  </div>
                  <span className="text-sm sm:text-base break-words max-w-[60%] text-right">{customerName}</span>
                </div>
              )}
            </div>

            <Separator className="my-3 sm:my-4" />

            {/* Items */}
            <div className="receipt-items space-y-2 sm:space-y-3 mb-3 sm:mb-4">
              <h3 className="font-medium text-xs sm:text-sm">ITEM PEMBELIAN:</h3>
              {transaction.items.map((item, index) => {
                const product = item.variant?.product || item.product;
                return (
                  <div key={index} className="receipt-item item flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-3 border-b border-gray-100 pb-2">
                    <div className="item-details flex-1">
                      <div className="item-name font-medium text-xs sm:text-sm leading-tight">
                        {product?.name}
                      </div>
                      <div className="item-variant text-xs text-gray-600 mt-0.5">
                        {product?.category?.name && product.category.name}
                        {product?.category?.name && product?.brand?.name && ' • '}
                        {product?.brand?.name && product.brand.name}
                        {item.variant && (
                          <span>
                            {(product?.category?.name || product?.brand?.name) && ' • '}
                            {item.variant.size?.name} • {item.variant.color?.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="item-qty-price text-left sm:text-right flex sm:flex-col justify-between sm:justify-start">
                      <div className="text-xs text-gray-600">
                        {item.quantity}x {formatCurrency(item.price)}
                      </div>
                      <div className="font-medium text-sm sm:text-base">
                        {formatCurrency(item.subtotal)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <Separator className="my-3 sm:my-4" />

            {/* Total Section */}
            <div className="total-section space-y-1 sm:space-y-2">
              <div className="total-row flex justify-between text-sm sm:text-base">
                <span>Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              
              {discount > 0 && (
                <div className="total-row flex justify-between text-green-600 text-sm sm:text-base">
                  <span>Diskon:</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              
              {tax > 0 && (
                <div className="total-row flex justify-between text-sm sm:text-base">
                  <span>PPN (11%):</span>
                  <span>{formatCurrency(tax)}</span>
                </div>
              )}
              
              <Separator />
              
              <div className="total-final flex justify-between text-base sm:text-lg font-bold">
                <span>TOTAL:</span>
                <span>{formatCurrency(transaction.totalAmount)}</span>
              </div>
            </div>

            {transaction.notes && (
              <>
                <Separator className="my-3 sm:my-4" />
                <div className="text-xs sm:text-sm">
                  <span className="font-medium">Catatan: </span>
                  <span className="text-gray-600">{transaction.notes}</span>
                </div>
              </>
            )}

            {/* Footer */}
            <div className="footer text-center mt-4 sm:mt-6 pt-3 sm:pt-4 border-t">
              <p className="text-xs text-gray-600 mb-2">
                Terima kasih telah berbelanja di 3PACHINO!
              </p>
              <p className="text-xs text-gray-500">
                Barang yang sudah dibeli tidak dapat dikembalikan
              </p>
              <p className="text-xs text-gray-500">
                Simpan struk ini sebagai bukti pembelian
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Follow us @3pachino
              </p>
            </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  );
}
