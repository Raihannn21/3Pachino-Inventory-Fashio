/**
 * Xprinter Label Printer Utility
 * Khusus untuk label 40mm x 20mm (2 line format)
 * Menggunakan Web USB API dan ESC/POS commands
 * 
 * Format Label:
 * Line 1: Product Name + Variant (Bold)
 * Line 2: Barcode + SKU + Price
 */

import EscPosEncoder from 'esc-pos-encoder';

interface USBDevice {
  vendorId?: number;
  productId?: number;
  productName?: string;
  manufacturerName?: string;
  serialNumber?: string;
  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(configurationValue: number): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
  releaseInterface(interfaceNumber: number): Promise<void>;
  transferOut(endpointNumber: number, data: BufferSource): Promise<USBOutTransferResult>;
  configuration: USBConfiguration | null;
}

interface USBConfiguration {
  interfaces: USBInterface[];
}

interface USBInterface {
  alternates: USBAlternateInterface[];
}

interface USBAlternateInterface {
  endpoints: USBEndpoint[];
}

interface USBEndpoint {
  endpointNumber: number;
  direction: 'in' | 'out';
}

interface USBOutTransferResult {
  bytesWritten: number;
  status: 'ok' | 'stall' | 'babble';
}

interface USBPrinterDevice {
  device: USBDevice;
  endpoint: USBEndpoint | null;
}

interface LabelData {
  productName: string;
  variant?: string; // Size + Color
  sku: string;
  barcode?: string;
  price: number;
}

class XPrinterLabel {
  private printer: USBPrinterDevice | null = null;
  private readonly LABEL_WIDTH_MM = 40;
  private readonly LABEL_HEIGHT_MM = 20;
  private readonly CHAR_WIDTH = 32; // Character width untuk 40mm label

  /**
   * Check if Web USB API is supported
   */
  isUSBSupported(): boolean {
    return typeof navigator !== 'undefined' && 'usb' in navigator;
  }

  /**
   * Connect to Xprinter via USB
   */
  async connect(): Promise<boolean> {
    if (!this.isUSBSupported()) {
      throw new Error('Web USB API tidak didukung di browser ini. Gunakan Chrome atau Edge.');
    }

    try {
      // Try with common printer vendor IDs first
      let device: USBDevice | null = null;
      
      try {
        device = await (navigator as any).usb.requestDevice({
          filters: [
            { vendorId: 0x0483 }, // STMicroelectronics (common for Xprinter)
            { vendorId: 0x1fc9 }, // NXP Semiconductors (Xprinter)
            { vendorId: 0x0416 }, // Generic thermal printer
            { vendorId: 0x04b8 }, // Epson
            { vendorId: 0x154f }, // Xprinter
            { vendorId: 0x0525 }, // Netchip Technology
            { vendorId: 0x067b }, // Prolific Technology
            { vendorId: 0x0fe6 }, // ICS Advent
            { vendorId: 0x1a86 }, // QinHeng Electronics (CH340)
            { vendorId: 0x1fc9 }, // NXP
            { vendorId: 0x2fe3 }, // Holtek
            { vendorId: 0x6868 }, // Zhuhai Poskey
            { vendorId: 0x0519 }, // Xiamen Hanin
          ]
        }) as USBDevice;
      } catch (filterError: any) {
        // If no device found with filters, try without filters (show ALL USB devices)
        console.log('Tidak ada printer ditemukan dengan filter, mencoba tanpa filter...');
        device = await (navigator as any).usb.requestDevice({
          filters: [] // Tampilkan semua USB device
        }) as USBDevice;
      }
      
      if (!device) {
        throw new Error('Tidak ada device yang dipilih');
      }

      console.log('✅ Device dipilih:', device.productName || device.manufacturerName || 'Unknown');
      console.log('Vendor ID:', device.vendorId, 'Product ID:', device.productId);

      // Open device
      try {
        await device.open();
      } catch (openError: any) {
        if (openError.name === 'InvalidStateError') {
          console.log('Device sudah terbuka, mencoba close dulu...');
          try {
            await device.close();
            await new Promise(resolve => setTimeout(resolve, 500));
            await device.open();
          } catch (retryError) {
            throw new Error('Device sedang dipakai aplikasi lain. Tutup aplikasi printer lain dan coba lagi.');
          }
        } else {
          throw new Error(`Gagal membuka device: ${openError.message}. Pastikan printer tidak sedang dipakai aplikasi lain (driver Windows, software printer).`);
        }
      }
      
      // Select configuration
      if (device.configuration === null) {
        await device.selectConfiguration(1);
      }

      // Release interface jika sudah di-claim sebelumnya
      try {
        await device.releaseInterface(0);
      } catch (e) {
        // Ignore if not claimed
      }

      // Claim interface
      try {
        await device.claimInterface(0);
      } catch (claimError: any) {
        throw new Error(`Gagal claim interface: ${claimError.message}. Printer mungkin sedang dipakai aplikasi lain.`);
      }

      // Find OUT endpoint
      const iface = device.configuration?.interfaces[0];
      const alternate = iface?.alternates[0];
      const endpoint = alternate?.endpoints.find((ep: USBEndpoint) => ep.direction === 'out');

      if (!endpoint) {
        throw new Error('OUT endpoint tidak ditemukan pada printer');
      }

      this.printer = {
        device,
        endpoint
      };

      console.log('✅ Xprinter Label terhubung:', device.productName || device.manufacturerName || 'Unknown');
      console.log('📌 Vendor ID: 0x' + device.vendorId?.toString(16), 'Product ID: 0x' + device.productId?.toString(16));
      console.log('📌 Endpoint:', endpoint.endpointNumber);
      return true;

    } catch (error: any) {
      console.error('❌ Gagal connect Xprinter:', error);
      
      // Better error messages
      if (error.name === 'NotFoundError') {
        throw new Error('Tidak ada printer yang dipilih. Pastikan printer sudah terhubung ke USB dan pilih dari dialog.');
      } else if (error.name === 'SecurityError') {
        throw new Error('Akses USB diblokir. Pastikan Anda menggunakan HTTPS atau localhost.');
      } else if (error.message?.includes('No device selected')) {
        throw new Error('Tidak ada printer yang dipilih dari dialog browser.');
      }
      
      throw error;
    }
  }

  /**
   * Disconnect from printer
   */
  async disconnect(): Promise<void> {
    if (this.printer?.device) {
      try {
        await this.printer.device.close();
        this.printer = null;
        console.log('✅ Xprinter Label disconnected');
      } catch (error) {
        console.error('❌ Error disconnecting:', error);
      }
    }
  }

  /**
   * Check if printer is connected
   */
  isConnected(): boolean {
    return this.printer !== null;
  }

  /**
   * Send data to printer via USB
   */
  private async sendData(data: Uint8Array): Promise<void> {
    if (!this.printer?.device || !this.printer.endpoint) {
      throw new Error('Printer tidak terhubung');
    }

    try {
      await this.printer.device.transferOut(
        this.printer.endpoint.endpointNumber,
        data.buffer as ArrayBuffer
      );
    } catch (error) {
      console.error('❌ Error sending data:', error);
      throw new Error('Gagal mengirim data ke printer');
    }
  }

  /**
   * Truncate text to fit label width
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - 2) + '..';
  }

  /**
   * Center text untuk label width
   */
  private centerText(text: string): string {
    const padding = Math.floor((this.CHAR_WIDTH - text.length) / 2);
    return ' '.repeat(Math.max(0, padding)) + text;
  }

  /**
   * Print single label (40mm x 20mm, 2 lines)
   * Line 1: Product Name + Variant
   * Line 2: Barcode + SKU + Price
   */
  async printLabel(data: LabelData): Promise<void> {
    if (!this.printer) {
      throw new Error('Printer tidak terhubung. Hubungkan printer terlebih dahulu.');
    }

    try {
      const { productName, variant, sku, barcode, price } = data;
      
      const encoder = new EscPosEncoder();
      
      // Initialize printer untuk label 40x20mm
      encoder
        .initialize()
        .align('center');

      // LINE 1: Product Name + Variant (Bold, Slightly Larger)
      const line1Text = variant ? `${productName} (${variant})` : productName;
      const line1Truncated = this.truncateText(line1Text, 30); // Max 30 chars for line 1
      
      encoder
        .bold(true)
        .size('small') // Use small size for 40mm label
        .line(line1Truncated)
        .bold(false);

      // LINE 2: Barcode Number + SKU + Price
      // Format: "1234567890 | SKU123 | Rp 50K"
      const priceFormatted = price >= 1000000 
        ? `${Math.floor(price / 1000)}K` 
        : `${Math.floor(price / 1000)}K`;
      
      const line2Parts: string[] = [];
      
      if (barcode) {
        line2Parts.push(barcode.substring(0, 10)); // Max 10 chars for barcode
      }
      
      line2Parts.push(this.truncateText(sku, 8)); // Max 8 chars for SKU
      line2Parts.push(`${priceFormatted}`);
      
      const line2Text = line2Parts.join(' | ');
      const line2Truncated = this.truncateText(line2Text, this.CHAR_WIDTH);
      
      encoder
        .size('normal')
        .line(line2Truncated);

      // Optional: Print actual barcode if available (small size)
      // NOTE: Barcode image printing is not supported by EscPosEncoder here.
      // You can print barcode number only, or implement image printing if needed.
      if (barcode) {
        encoder.newline();
      }

      // Cut label
      encoder
        .newline()
        .cut('full');

      const result = encoder.encode();
      await this.sendData(result);
      
      console.log('✅ Label printed:', line1Text);

    } catch (error) {
      console.error('❌ Print label error:', error);
      throw error;
    }
  }

  /**
   * Print multiple labels in batch
   * Useful for printing labels for multiple products/variants
   */
  async printLabels(labels: LabelData[], copies: number = 1): Promise<void> {
    if (!this.printer) {
      throw new Error('Printer tidak terhubung. Hubungkan printer terlebih dahulu.');
    }

    try {
      for (const label of labels) {
        for (let i = 0; i < copies; i++) {
          await this.printLabel(label);
          // Small delay between prints to prevent buffer overflow
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      console.log(`✅ Printed ${labels.length} labels x ${copies} copies`);

    } catch (error) {
      console.error('❌ Batch print error:', error);
      throw error;
    }
  }

  /**
   * Print test label to check printer connection
   */
  async printTestLabel(): Promise<void> {
    const testData: LabelData = {
      productName: 'TEST PRODUCT',
      variant: 'L/Black',
      sku: 'TEST001',
      barcode: '1234567890123',
      price: 150000
    };

    await this.printLabel(testData);
  }

  /**
   * Feed paper (advance label)
   */
  async feedPaper(lines: number = 3): Promise<void> {
    if (!this.printer) {
      throw new Error('Printer tidak terhubung');
    }

    try {
      const encoder = new EscPosEncoder();
      encoder.initialize();
      
      for (let i = 0; i < lines; i++) {
        encoder.newline();
      }
      
      const result = encoder.encode();
      await this.sendData(result);
      
    } catch (error) {
      console.error('❌ Feed paper error:', error);
      throw error;
    }
  }
}

// Singleton instance
const xprinterLabel = new XPrinterLabel();

export default xprinterLabel;

/**
 * Helper function untuk format data dari product variant
 */
export function formatLabelFromVariant(
  productName: string,
  sizeName: string,
  colorName: string,
  sku: string,
  barcode: string | undefined,
  price: number
): LabelData {
  return {
    productName,
    variant: `${sizeName}/${colorName}`,
    sku,
    barcode,
    price
  };
}

/**
 * Check if USB printing is supported
 */
export function isXPrinterSupported(): boolean {
  return xprinterLabel.isUSBSupported();
}
