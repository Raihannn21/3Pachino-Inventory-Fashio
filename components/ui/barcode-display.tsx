'use client';

import { useState, useRef } from 'react';
import Barcode from 'react-barcode';
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
  const [copied, setCopied] = useState(false);
  const barcodeRef = useRef<HTMLDivElement>(null);

  const downloadBarcode = () => {
    if (!barcodeRef.current) return;
    
    try {
      // Get SVG element dari react-barcode
      const svg = barcodeRef.current.querySelector('svg');
      if (!svg) return;

      // Convert SVG to canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const svgData = new XMLSerializer().serializeToString(svg);
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        // Download
        const link = document.createElement('a');
        link.download = `barcode-${variant.barcode}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      };
      
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    } catch (error) {
      console.error('Failed to download barcode:', error);
    }
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
          disabled={!variant.barcode}
        >
          <QrCode className="h-4 w-4 mr-2" />
          Barcode
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Barcode Produk</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Product Info */}
          <div className="text-sm space-y-1">
            <p><strong>Produk:</strong> {variant.product.name}</p>
            <p><strong>SKU:</strong> {variant.product.sku}</p>
            <p><strong>Variant:</strong> {variant.size.name} - {variant.color.name}</p>
            <p><strong>Stok:</strong> {variant.stock} pcs</p>
          </div>

          {/* Barcode Text */}
          <div className="space-y-2">
            <Label>Kode Barcode</Label>
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

          {/* Barcode 1D Display */}
          <div className="space-y-2">
            <Label>Barcode (Code 128)</Label>
            <div className="flex flex-col items-center space-y-3 p-4 bg-white border rounded">
              <div ref={barcodeRef}>
                <Barcode 
                  value={variant.barcode} 
                  format="CODE128"
                  width={2}
                  height={80}
                  displayValue={true}
                  fontSize={14}
                  margin={10}
                  background="#ffffff"
                />
              </div>
              
              <Button onClick={downloadBarcode} size="sm" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Download Barcode
              </Button>
            </div>
          </div>

          {/* Instructions */}
          <div className="text-xs text-muted-foreground bg-blue-50 p-3 rounded">
            <p><strong>Cara menggunakan:</strong></p>
            <ul className="mt-1 space-y-1 list-disc list-inside">
              <li>Scan barcode dengan barcode scanner</li>
              <li>Download barcode untuk label produk</li>
              <li>Copy kode untuk pencarian manual</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
