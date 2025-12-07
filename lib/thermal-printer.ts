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
      // Request Bluetooth device
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: [this.PRINTER_SERVICE_UUID] },
          { namePrefix: 'Blueprint' },
          { namePrefix: 'BluePrint' },
          { namePrefix: 'Printer' },
          { namePrefix: 'POS' },
        ],
        optionalServices: [this.PRINTER_SERVICE_UUID]
      });

      if (!device.gatt) {
        throw new Error('GATT tidak tersedia pada device');
      }

      // Connect to GATT server
      const server = await device.gatt.connect();
      
      // Get service
      const service = await server.getPrimaryService(this.PRINTER_SERVICE_UUID);
      
      // Get characteristic
      const characteristic = await service.getCharacteristic(this.PRINTER_CHARACTERISTIC_UUID);

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
   * Format currency for display
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  }

  /**
   * Print receipt to thermal printer
   */
  async printReceipt(receiptData: ReceiptData): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('Printer belum terkoneksi. Silakan connect terlebih dahulu.');
    }

    try {
      const encoder = new EscPosEncoder();

      // Initialize printer
      encoder.initialize();

      // Store header - centered, bold, large
      encoder
        .align('center')
        .bold(true)
        .size('normal')
        .line('3PACHINO INVENTORY')
        .bold(false)
        .size('small')
        .line('Fashion Store')
        .line('Jl. Contoh No. 123')
        .line('Telp: 0812-3456-7890')
        .newline();

      // Separator
      encoder.line('================================');

      // Invoice info - left aligned
      encoder
        .align('left')
        .bold(true)
        .line(`Invoice: ${receiptData.invoiceNumber}`)
        .bold(false)
        .line(`Tanggal: ${receiptData.date}`);

      if (receiptData.customerName) {
        encoder.line(`Customer: ${receiptData.customerName}`);
      }

      encoder.line('================================');

      // Items header
      encoder
        .bold(true)
        .line('Item                  Qty   Total')
        .bold(false)
        .line('--------------------------------');

      // Items
      for (const item of receiptData.items) {
        // Item name (truncate if too long)
        const itemName = item.name.length > 20 
          ? item.name.substring(0, 17) + '...' 
          : item.name;
        
        encoder.line(itemName);

        // Variant info if exists
        if (item.variant) {
          const variantText = `  ${item.variant}`;
          encoder.line(variantText.length > 32 ? variantText.substring(0, 29) + '...' : variantText);
        }

        // Price line: qty x price = subtotal
        const qty = item.quantity.toString();
        const price = this.formatCurrency(item.price);
        const subtotal = this.formatCurrency(item.subtotal);
        
        // Format: "  2 x Rp 50.000     Rp 100.000"
        const priceLine = `  ${qty} x ${price}`;
        const spaces = ' '.repeat(Math.max(1, 32 - priceLine.length - subtotal.length));
        encoder.line(`${priceLine}${spaces}${subtotal}`);
      }

      // Separator
      encoder.line('================================');

      // Total
      encoder
        .align('right')
        .bold(true)
        .size('normal')
        .line(`TOTAL: ${this.formatCurrency(receiptData.totalAmount)}`)
        .bold(false)
        .size('small');

      encoder.line('================================');

      // Notes if exists
      if (receiptData.notes) {
        encoder
          .align('left')
          .line('Catatan:')
          .line(receiptData.notes)
          .line('--------------------------------');
      }

      // Footer
      encoder
        .align('center')
        .newline()
        .line('Terima Kasih')
        .line('Atas Kunjungan Anda')
        .newline()
        .line('www.3pachino.com')
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
