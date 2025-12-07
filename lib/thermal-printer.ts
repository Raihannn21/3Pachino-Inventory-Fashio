/**
 * Thermal Printer Utility untuk Blueprint Liteseries 80mm
 * Menggunakan Web Bluetooth API dan ESC/POS commands
 */

import EscPosEncoder from 'esc-pos-encoder';

interface PrinterDevice {
  device: BluetoothDevice;
  characteristic: BluetoothRemoteGATTCharacteristic | null;
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

class ThermalPrinter {
  private printer: PrinterDevice | null = null;
  private readonly PRINTER_SERVICE_UUID = '000018f0-0000-1000-8000-00805f9b34fb';
  private readonly PRINTER_CHARACTERISTIC_UUID = '00002af1-0000-1000-8000-00805f9b34fb';

  /**
   * Check if Web Bluetooth API is supported
   */
  isBluetoothSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  /**
   * Connect to Bluetooth thermal printer
   */
  async connect(): Promise<boolean> {
    if (!this.isBluetoothSupported()) {
      throw new Error('Web Bluetooth API tidak didukung di browser ini. Gunakan Chrome atau Edge.');
    }

    try {
      // Request Bluetooth device - acceptAllDevices untuk kompatibilitas maksimal
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          this.PRINTER_SERVICE_UUID,
          '000018f0-0000-1000-8000-00805f9b34fb', // Standard printer service
          '49535343-fe7d-4ae5-8fa9-9fafd205e455', // Serial port service
          '0000fff0-0000-1000-8000-00805f9b34fb', // Custom service 1
          '0000ffe0-0000-1000-8000-00805f9b34fb', // Custom service 2
        ]
      });

      if (!device.gatt) {
        throw new Error('GATT tidak tersedia pada device');
      }

      // Connect to GATT server
      const server = await device.gatt.connect();
      
      // Get available services
      const services = await server.getPrimaryServices();
      
      let characteristic: BluetoothRemoteGATTCharacteristic | null = null;
      
      // Try to find a writable characteristic from available services
      for (const service of services) {
        try {
          const characteristics = await service.getCharacteristics();
          for (const char of characteristics) {
            // Check if characteristic is writable
            if (char.properties.write || char.properties.writeWithoutResponse) {
              characteristic = char;
              break;
            }
          }
          if (characteristic) break;
        } catch (err) {
          // Skip service if error
          continue;
        }
      }
      
      if (!characteristic) {
        throw new Error('Tidak dapat menemukan characteristic untuk menulis ke printer.');
      }

      this.printer = {
        device,
        characteristic
      };

      return true;
    } catch (error) {
      console.error('Error connecting to printer:', error);
      throw error;
    }
  }

  /**
   * Disconnect from printer
   */
  async disconnect(): Promise<void> {
    if (this.printer?.device?.gatt?.connected) {
      await this.printer.device.gatt.disconnect();
    }
    this.printer = null;
  }

  /**
   * Check if printer is connected
   */
  isConnected(): boolean {
    return this.printer?.device?.gatt?.connected ?? false;
  }

  /**
   * Send data to printer
   */
  private async sendData(data: Uint8Array): Promise<void> {
    if (!this.printer?.characteristic) {
      throw new Error('Printer belum terkoneksi');
    }

    // Split data into chunks (max 512 bytes for Bluetooth)
    const chunkSize = 512;
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, Math.min(i + chunkSize, data.length));
      await this.printer.characteristic.writeValue(chunk);
      // Small delay between chunks
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  /**
   * Format currency for display - remove Rp prefix for cleaner look
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  /**
   * Pad string to specific length (for alignment)
   */
  private padRight(str: string, length: number): string {
    return str + ' '.repeat(Math.max(0, length - str.length));
  }

  private padLeft(str: string, length: number): string {
    return ' '.repeat(Math.max(0, length - str.length)) + str;
  }

  /**
   * Helper function: Create row dengan left & right text yang presisi
   * Menghitung spasi dinamis berdasarkan width, mencegah text wrapping
   */
  private createRow(leftText: string, rightText: string, width: number): string {
    const leftLen = leftText.length;
    const rightLen = rightText.length;
    const totalUsed = leftLen + rightLen;
    
    // Jika total melebihi width, truncate left text
    if (totalUsed > width) {
      const availableForLeft = width - rightLen - 3; // -3 untuk "..."
      const truncatedLeft = leftText.substring(0, Math.max(0, availableForLeft)) + '...';
      return truncatedLeft + ' '.repeat(Math.max(0, width - truncatedLeft.length - rightLen)) + rightText;
    }
    
    // Calculate padding
    const padding = width - totalUsed;
    return leftText + ' '.repeat(Math.max(0, padding)) + rightText;
  }

  /**
   * Print receipt to thermal printer
   * Optimized for 80mm - CENTERED dengan margin kiri 2 spasi
   * Layout: 2 spasi margin + 44 char content + 2 spasi sisa = 48 total (centered)
   */
  async printReceipt(receiptData: ReceiptData): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('Printer belum terkoneksi. Silakan connect terlebih dahulu.');
    }

    try {
      const encoder = new EscPosEncoder();
      const PRINTER_WIDTH = 42; // 42 characters - lebar area cetak efektif
      const LEFT_MARGIN = '  '; // 2 spasi kiri untuk centering (2+42+4=48)

      // Initialize printer
      encoder.initialize();

      // Store header - center aligned dengan margin untuk visual balance
      encoder
        .align('center')
        .bold(true)
        .size('large')  // Large size untuk nama toko (BESAR)
        .line(LEFT_MARGIN + '')
        .size('large')  // Tetap large size
        .bold(true)
        .line(LEFT_MARGIN + '3PACHINO')
        .size('normal')  // Normal size untuk alamat dan telp
        .bold(false)
        .line(LEFT_MARGIN + 'Pasar Andir Basement Blok M 25-26')
        .line(LEFT_MARGIN + 'Telp: 0813-9590-4612')
        .newline();

      // Separator - dengan left margin (44 char)
      const separator = LEFT_MARGIN + '='.repeat(PRINTER_WIDTH);
      encoder
        .align('left')
        .line(separator);

      // Invoice info - left aligned dengan margin
      encoder
        .align('left')
        .bold(true)
        .line(LEFT_MARGIN + `Invoice: ${receiptData.invoiceNumber}`)
        .bold(false)
        .line(LEFT_MARGIN + `Tanggal: ${receiptData.date}`);

      if (receiptData.customerName) {
        const customerLine = `Customer: ${receiptData.customerName}`;
        const safeCustomer = customerLine.length > PRINTER_WIDTH 
          ? customerLine.substring(0, PRINTER_WIDTH - 3) + '...' 
          : customerLine;
        encoder.line(LEFT_MARGIN + safeCustomer);
      }

      encoder.line(separator);

      // Items header - format PDF style
      encoder
        .align('left')
        .bold(true)
        .line(LEFT_MARGIN + 'ITEM PEMBELIAN:')
        .bold(false)
        .newline();

      // Items - format seperti PDF
      for (const item of receiptData.items) {
        // Baris 1: Nama Item (BOLD) + margin
        const itemName = item.name.length > PRINTER_WIDTH 
          ? item.name.substring(0, PRINTER_WIDTH - 3) + '...' 
          : item.name;
        
        encoder
          .bold(true)
          .line(LEFT_MARGIN + itemName)
          .bold(false);

        // Variant info if exists (di bawah nama, format: SIZE • COLOR)
        if (item.variant) {
          encoder.line(LEFT_MARGIN + item.variant);
        }

        // Baris qty + harga di kanan (format: 8x Rp 110.000)
        const qty = item.quantity.toString();
        const priceFormatted = this.formatCurrency(item.price);
        const qtyPriceText = `${qty}x Rp ${priceFormatted}`;
        
        encoder
          .align('right')
          .line(qtyPriceText);

        // Subtotal item di kanan (format: Rp 880.000)
        const subtotalFormatted = this.formatCurrency(item.subtotal);
        encoder
          .align('right')
          .bold(true)
          .line(`Rp ${subtotalFormatted}`)
          .bold(false)
          .align('left')
          .newline();
      }

      // Separator + margin
      encoder
        .align('left')
        .line(separator);

      // Total - BOLD dan BESAR seperti PDF
      const totalLabel = 'TOTAL:';
      const totalAmountFormatted = this.formatCurrency(receiptData.totalAmount);
      const totalRightPart = `Rp ${totalAmountFormatted}`;
      
      const totalLine = this.createRow(totalLabel, totalRightPart, PRINTER_WIDTH);
      
      encoder
        .align('left')
        .bold(true)
        .size('large')  // Total BESAR (Large Size)
        .line(LEFT_MARGIN + totalLine)
        .size('normal')  // Kembali normal
        .bold(false)
        .newline();

      encoder
        .line(separator);

      // Notes if exists + margin
      if (receiptData.notes) {
        const safeNotes = receiptData.notes.length > PRINTER_WIDTH 
          ? receiptData.notes.substring(0, PRINTER_WIDTH - 3) + '...' 
          : receiptData.notes;
        encoder
          .align('left')
          .line(LEFT_MARGIN + 'Catatan:')
          .line(LEFT_MARGIN + safeNotes)
          .line(LEFT_MARGIN + '-'.repeat(PRINTER_WIDTH));
      }

      // Footer - center alignment dengan margin
      encoder
        .align('center')
        .newline()
        .line(LEFT_MARGIN + 'Terima kasih telah berbelanja')
        .line(LEFT_MARGIN + 'di 3PACHINO!')
        .newline();

      // Cut paper
      encoder
        .newline()
        .newline()
        .newline()
        .cut('partial');

      // Get encoded data
      const data = encoder.encode();

      // Send to printer
      await this.sendData(data);

    } catch (error) {
      console.error('Error printing receipt:', error);
      throw error;
    }
  }

  /**
   * Test print - simple test receipt
   */
  async testPrint(): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('Printer belum terkoneksi');
    }

    try {
      const encoder = new EscPosEncoder();

      encoder
        .initialize()
        .align('center')
        .bold(true)
        .size('normal')
        .line('TEST PRINT')
        .bold(false)
        .size('small')
        .line('Blueprint Liteseries 80mm')
        .newline()
        .line('Printer berhasil terkoneksi!')
        .newline()
        .newline()
        .cut('partial');

      const data = encoder.encode();
      await this.sendData(data);
    } catch (error) {
      console.error('Error test print:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const thermalPrinter = new ThermalPrinter();

// Export helper functions
export const connectThermalPrinter = () => thermalPrinter.connect();
export const disconnectThermalPrinter = () => thermalPrinter.disconnect();
export const printThermalReceipt = (data: ReceiptData) => thermalPrinter.printReceipt(data);
export const testThermalPrint = () => thermalPrinter.testPrint();
export const isThermalPrinterConnected = () => thermalPrinter.isConnected();
export const isBluetoothSupported = () => thermalPrinter.isBluetoothSupported();

export type { ReceiptData, ReceiptItem };
