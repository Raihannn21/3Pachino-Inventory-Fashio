'use client';

import { useState, useRef } from 'react';
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
  MessageCircle
} from 'lucide-react';
import { toast } from "sonner";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Print CSS untuk memastikan hanya receipt yang dicetak
const printStyles = `
  @media print {
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
      width: 100%;
      background: white;
    }
    .no-print {
      display: none !important;
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

  const handleDownloadPDF = async () => {
    if (!receiptRef.current) return;
    
    setIsGeneratingPDF(true);
    try {
      // Capture the receipt as image
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false
      });

      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 120] // Thermal printer size
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 76;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 2, 2, imgWidth, imgHeight);
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
      
      <div className="space-y-4">
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 mb-4 no-print">
        <div className="flex gap-2">
          <Button onClick={handlePrint} variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Cetak
          </Button>
          <Button onClick={handlePrintVersion} variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Print Version
          </Button>
          <Button 
            onClick={handleDownloadPDF} 
            variant="outline" 
            size="sm"
            disabled={isGeneratingPDF}
          >
            <Download className="h-4 w-4 mr-2" />
            {isGeneratingPDF ? 'Generating...' : 'Download PDF'}
          </Button>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={handleShare} variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Bagikan
          </Button>
          <Button onClick={handleWhatsApp} variant="outline" size="sm" className="text-green-600 hover:text-green-700">
            <MessageCircle className="h-4 w-4 mr-2" />
            WhatsApp
          </Button>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={handleCopyUrl} variant="outline" size="sm">
            <Copy className="h-4 w-4 mr-2" />
            Salin Link
          </Button>
          <Button onClick={handleCopyInvoice} variant="outline" size="sm">
            <Hash className="h-4 w-4 mr-2" />
            Salin Invoice
          </Button>
        </div>
        {onClose && (
          <Button onClick={onClose} variant="ghost" size="sm" className="ml-auto">
            Tutup
          </Button>
        )}
      </div>

      {/* Receipt Content */}
      <div ref={receiptRef} className="receipt bg-white receipt-print-area">
        <Card className="shadow-lg">
          <CardContent className="p-6 relative">
            {/* Watermark Background */}
            <div className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center pointer-events-none opacity-40 z-0">
              <div className="w-full h-full max-w-lg max-h-lg flex items-center justify-center">
                <img 
                  src="/3pachino.png" 
                  alt="3PACHINO Watermark" 
                  className="w-full h-full object-contain transform scale-200"
                  style={{ minWidth: '500px', minHeight: '500px' }}
                />
              </div>
            </div>
            
            {/* Content with z-index to appear above watermark */}
            <div className="relative z-10 bg-white/80">
              {/* Header */}
              <div className="header text-center mb-6 bg-white p-4 rounded">
                <h1 className="store-name text-2xl font-bold">3PACHINO</h1>
                <div className="store-info text-sm text-gray-600 mt-2">
                  <p>Premium Fashion Store</p>
                  <p>Telp: 0813-9590-7612</p>
                </div>
              </div>

              <Separator className="my-4" />

            {/* Invoice Info */}
            <div className="invoice-info space-y-2 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Invoice:</span>
                </div>
                <span className="font-mono font-bold">{transaction.invoiceNumber}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Tanggal:</span>
                </div>
                <span>{formatDate(transaction.transactionDate)}</span>
              </div>

              {customerName && customerName.trim() !== '' && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Customer:</span>
                  </div>
                  <span>{customerName}</span>
                </div>
              )}
            </div>

            <Separator className="my-4" />

            {/* Items */}
            <div className="items space-y-3 mb-4">
              <h3 className="font-medium text-sm">ITEM PEMBELIAN:</h3>
              {transaction.items.map((item, index) => {
                const product = item.variant?.product || item.product;
                return (
                  <div key={index} className="item">
                    <div className="item-details flex-1">
                      <div className="item-name font-medium text-sm">
                        {product?.name}
                      </div>
                      <div className="item-variant text-xs text-gray-600">
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
                    <div className="item-qty-price text-right">
                      <div className="text-xs text-gray-600">
                        {item.quantity}x {formatCurrency(item.price)}
                      </div>
                      <div className="font-medium">
                        {formatCurrency(item.subtotal)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <Separator className="my-4" />

            {/* Total Section */}
            <div className="total-section space-y-2">
              <div className="total-row flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              
              {discount > 0 && (
                <div className="total-row flex justify-between text-green-600">
                  <span>Diskon:</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              
              {tax > 0 && (
                <div className="total-row flex justify-between">
                  <span>PPN (11%):</span>
                  <span>{formatCurrency(tax)}</span>
                </div>
              )}
              
              <Separator />
              
              <div className="total-final flex justify-between text-lg font-bold">
                <span>TOTAL:</span>
                <span>{formatCurrency(transaction.totalAmount)}</span>
              </div>
            </div>

            {transaction.notes && (
              <>
                <Separator className="my-4" />
                <div className="text-sm">
                  <span className="font-medium">Catatan: </span>
                  <span className="text-gray-600">{transaction.notes}</span>
                </div>
              </>
            )}

            {/* Footer */}
            <div className="footer text-center mt-6 pt-4 border-t">
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
