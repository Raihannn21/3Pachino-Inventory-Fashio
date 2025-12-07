/**
 * USB Printer Utility untuk Blueprint Liteseries 80mm
 * Menggunakan Web USB API dan ESC/POS commands
 * (sama seperti Bluetooth version, tapi via USB)
 */

import EscPosEncoder from 'esc-pos-encoder';

// Type definitions untuk Web USB API
interface USBDevice {
  productName?: string;
  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(configurationValue: number): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
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

interface Navigator {
  usb?: {
    requestDevice(options: USBDeviceRequestOptions): Promise<USBDevice>;
  };
}

interface USBDeviceRequestOptions {
  filters: USBDeviceFilter[];
}

interface USBDeviceFilter {
  vendorId?: number;
  productId?: number;
}

interface USBPrinterDevice {
  device: USBDevice;
  endpoint: USBEndpoint | null;
}

interface ReceiptItem {
  name: string;
  variant?: string;
  quantity: number;
  price: number;
  subtotal: number;
}

interface ReceiptData {
  invoiceNumber: string;
  date: string;
  items: ReceiptItem[];
  totalAmount: number;
  notes?: string;
  customerName?: string;
}

class USBThermalPrinter {
  private printer: USBPrinterDevice | null = null;
  private readonly PRINTER_WIDTH = 42; // Character width untuk 80mm paper
  private readonly LEFT_MARGIN = '  '; // 2 spasi untuk centering

  /**
   * Check if Web USB API is supported
   */
  isUSBSupported(): boolean {
    return typeof navigator !== 'undefined' && 'usb' in navigator;
  }

  /**
   * Connect to USB thermal printer
   */
  async connect(): Promise<boolean> {
    if (!this.isUSBSupported()) {
      throw new Error('Web USB API tidak didukung di browser ini. Gunakan Chrome atau Edge.');
    }

    try {
      // Request USB device
      const device = await (navigator as any).usb.requestDevice({
        filters: [
          // Blueprint Liteseries USB
          { vendorId: 0x0483 }, // STMicroelectronics (common for thermal printers)
          { vendorId: 0x04b8 }, // Epson
          { vendorId: 0x0416 }, // Generic thermal printer
        ]
      });

      await device.open();
      
      // Select configuration
      if (device.configuration === null) {
        await device.selectConfiguration(1);
      }

      // Claim interface
      await device.claimInterface(0);

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

      console.log('✅ Printer USB terhubung:', device.productName);
      return true;

    } catch (error: any) {
      console.error('❌ Gagal connect USB printer:', error);
      if (error.name === 'NotFoundError') {
        throw new Error('Tidak ada printer yang dipilih');
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
        console.log('✅ Printer USB disconnected');
      } catch (error) {
        console.error('❌ Error disconnecting:', error);
      }
    }
  }

  /**
   * Send data to printer via USB
   */
  private async sendData(data: Uint8Array): Promise<void> {
    if (!this.printer?.device || !this.printer.endpoint) {
      throw new Error('Printer tidak terhubung');
    }

    try {
      // Send all data at once via USB (tidak perlu chunk seperti Bluetooth)
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
   * Helper untuk membuat row dengan alignment left-right
   */
  private createRow(left: string, right: string): string {
    const rightLen = right.length;
    const leftMaxLen = this.PRINTER_WIDTH - rightLen;
    const leftTrimmed = left.length > leftMaxLen ? left.substring(0, leftMaxLen) : left;
    const padding = ' '.repeat(this.PRINTER_WIDTH - leftTrimmed.length - rightLen);
    return this.LEFT_MARGIN + leftTrimmed + padding + right;
  }

  /**
   * Print receipt
   */
  async printReceipt(data: ReceiptData): Promise<void> {
    if (!this.printer) {
      throw new Error('Printer tidak terhubung. Hubungkan printer terlebih dahulu.');
    }

    try {
      const { invoiceNumber, date, items, totalAmount, notes, customerName } = data;
      
      const encoder = new EscPosEncoder();
      
      // Header dengan font besar
      encoder
        .initialize()
        .align('center')
        .size('normal')
        .line('3PACHINO')
        .line('Sistem kasir 3PACHINO')
        .line('================================')
        .newline();

      // Info invoice
      encoder
        .align('left')
        .size('normal');

      encoder.line(this.LEFT_MARGIN + `No. Invoice: ${invoiceNumber}`);
      encoder.line(this.LEFT_MARGIN + `Tanggal    : ${date}`);
      
      if (customerName) {
        encoder.line(this.LEFT_MARGIN + `Customer   : ${customerName}`);
      }
      
      encoder
        .newline()
        .line(this.LEFT_MARGIN + '----------------------------------------')
        .line(this.LEFT_MARGIN + '           ITEM PEMBELIAN')
        .line(this.LEFT_MARGIN + '----------------------------------------')
        .newline();

      // Items
      items.forEach(item => {
        const variantText = item.variant || '';
        const itemName = `${item.name} ${variantText}`.trim();
        
        // Nama item (bisa multi-line jika panjang)
        if (itemName.length > this.PRINTER_WIDTH) {
          const words = itemName.split(' ');
          let currentLine = '';
          words.forEach(word => {
            if ((currentLine + word).length > this.PRINTER_WIDTH) {
              encoder.line(this.LEFT_MARGIN + currentLine.trim());
              currentLine = word + ' ';
            } else {
              currentLine += word + ' ';
            }
          });
          if (currentLine.trim()) {
            encoder.line(this.LEFT_MARGIN + currentLine.trim());
          }
        } else {
          encoder.line(this.LEFT_MARGIN + itemName);
        }
        
        // Detail (qty, harga, subtotal)
        const qtyText = `  ${item.quantity}x`;
        const priceText = `@${item.price.toLocaleString('id-ID')}`;
        const subtotalText = item.subtotal.toLocaleString('id-ID');
        
        const detailLine = this.createRow(
          `${qtyText} ${priceText}`,
          subtotalText
        );
        encoder.line(detailLine);
        encoder.newline();
      });

      // Separator
      encoder.line(this.LEFT_MARGIN + '----------------------------------------');

      // Jumlah barang
      const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
      const jumlahBarangLine = this.createRow('Jumlah Barang:', `${totalItems} pcs`);
      encoder.line(jumlahBarangLine);

      // Total dengan font besar
      encoder
        .newline()
        .size('large');
      
      const totalLine = this.createRow('TOTAL:', `${totalAmount.toLocaleString('id-ID')}`);
      encoder.line(totalLine.substring(2)); // Remove LEFT_MARGIN karena font besar
      
      encoder.size('normal'); // Reset size

      // Notes (jika ada)
      if (notes) {
        encoder
          .newline()
          .line(this.LEFT_MARGIN + 'Catatan:')
          .line(this.LEFT_MARGIN + notes);
      }

      // Footer
      encoder
        .newline()
        .line(this.LEFT_MARGIN + '========================================')
        .align('center')
        .line('Terima kasih atas pembelian Anda!')
        .line('*** Barang yang sudah dibeli')
        .line('tidak dapat ditukar ***')
        .newline()
        .newline()
        .newline()
        .cut('partial');

      const result = encoder.encode();
      await this.sendData(result);
      
      console.log('✅ Print via USB berhasil');

    } catch (error) {
      console.error('❌ Print error:', error);
      throw error;
    }
  }
}

// Singleton instance
const usbPrinter = new USBThermalPrinter();

export default usbPrinter;

/**
 * Check if USB printing is supported
 */
export function isUSBPrintSupported(): boolean {
  return usbPrinter.isUSBSupported();
}
