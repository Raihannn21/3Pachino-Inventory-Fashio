'use client';

import { useState, useEffect } from 'react';
import { generateQRCode, generateVariantQRData } from '@/lib/barcode';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { QrCode, Download, Copy, Check } from 'lucide-react';

interface ProductVariant {
  id: string;
  barcode: string;
  stock: number;
  size: {
    name: string;
  };
  color: {
    name: string;
  };
  product: {
    name: string;
    sku: string;
  };
}

interface BarcodeDisplayProps {
  variant: ProductVariant;
}

export default function BarcodeDisplay({ variant }: BarcodeDisplayProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateQR = async () => {
    setLoading(true);
    try {
      const qrData = generateVariantQRData(variant);
      const qrUrl = await generateQRCode(qrData);
      setQrCodeUrl(qrUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadQR = () => {
    if (!qrCodeUrl) return;
    
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `barcode-${variant.barcode}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyBarcode = async () => {
    try {
      await navigator.clipboard.writeText(variant.barcode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy barcode:', error);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          onClick={generateQR}
          disabled={!variant.barcode}
        >
          <QrCode className="h-4 w-4 mr-2" />
          Barcode
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Barcode & QR Code</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Product Info */}
          <div className="text-sm space-y-1">
            <p><strong>Produk:</strong> {variant.product.name}</p>
            <p><strong>SKU:</strong> {variant.product.sku}</p>
            <p><strong>Variant:</strong> {variant.size.name} - {variant.color.name}</p>
            <p><strong>Stok:</strong> {variant.stock} pcs</p>
          </div>

          {/* Barcode */}
          <div className="space-y-2">
            <Label>Barcode</Label>
            <div className="flex items-center gap-2">
              <code className="bg-gray-100 px-3 py-2 rounded flex-1 font-mono text-sm">
                {variant.barcode}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={copyBarcode}
                className="shrink-0"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* QR Code */}
          <div className="space-y-2">
            <Label>QR Code</Label>
            <div className="flex flex-col items-center space-y-3">
              {loading ? (
                <div className="w-48 h-48 bg-gray-100 rounded flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : qrCodeUrl ? (
                <img 
                  src={qrCodeUrl} 
                  alt="QR Code" 
                  className="w-48 h-48 border rounded"
                />
              ) : (
                <div className="w-48 h-48 bg-gray-100 rounded flex items-center justify-center">
                  <QrCode className="h-12 w-12 text-gray-400" />
                </div>
              )}
              
              {qrCodeUrl && (
                <Button onClick={downloadQR} size="sm" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Download QR Code
                </Button>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="text-xs text-muted-foreground bg-blue-50 p-3 rounded">
            <p><strong>Cara menggunakan:</strong></p>
            <ul className="mt-1 space-y-1 list-disc list-inside">
              <li>Scan QR code untuk melihat detail produk</li>
              <li>Gunakan barcode untuk pencarian cepat</li>
              <li>Download QR code untuk label produk</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
