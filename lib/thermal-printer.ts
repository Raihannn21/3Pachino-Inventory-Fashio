/**
 * Thermal Printer Utility untuk Blueprint Liteseries 80mm
 * Menggunakan Web Bluetooth API dan ESC/POS commands
 */

import EscPosEncoder from 'esc-pos-encoder';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

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

interface DailyReportCustomer {
  name: string;
  transactionCount: number;
  totalAmount: number;
}

interface DailyReportData {
  date: string;
  dateRange?: string; // For range display
  customers: DailyReportCustomer[];
  totalRevenue: number;
  totalTransactions: number;
}

interface StockVariant {
  size: string;
  color: string;
  stock: number;
  minStock: number;
  barcode?: string;
}

interface StockReportData {
  productName: string;
  sku: string;
  brand: string;
  category: string;
  variants: StockVariant[];
  totalStock: number;
  printDate: string;
}

class ThermalPrinter {
  private printer: PrinterDevice | null = null;
  private readonly PRINTER_SERVICE_UUID = '000018f0-0000-1000-8000-00805f9b34fb';
  private readonly PRINTER_CHARACTERISTIC_UUID = '00002af1-0000-1000-8000-00805f9b34fb';
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 3;
  private isReconnecting = false;
  private savedDevice: BluetoothDevice | null = null;

  constructor() {
    // Don't auto-reconnect in constructor (causes issues)
    // Will reconnect on first interaction or explicit call
  }

  /**
   * Initialize and auto-reconnect if previously connected
   * Call this manually from component
   */
  async initializeConnection(): Promise<boolean> {
    if (this.isConnected()) {
      return true; // Already connected
    }

    try {
      const wasConnected = localStorage.getItem('thermal_printer_connected');
      
      if (wasConnected === 'true' && this.savedDevice) {
        console.log('Auto-reconnecting to saved printer...');
        const success = await this.reconnectToDevice(this.savedDevice);
        if (success) {
          console.log('Auto-reconnect successful');
          return true;
        }
      }
    } catch (error) {
      console.log('Auto-reconnect failed:', error);
    }
    
    return false;
  }

  /**
   * Reconnect to a specific device
   */
  private async reconnectToDevice(device: BluetoothDevice): Promise<boolean> {
    try {
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

      // Setup disconnect listener for auto-reconnect
      device.addEventListener('gattserverdisconnected', this.onDisconnected.bind(this));

      // Save to localStorage and memory
      this.savedDevice = device;
      localStorage.setItem('thermal_printer_connected', 'true');
      localStorage.setItem('thermal_printer_device_id', device.id);
      localStorage.setItem('thermal_printer_device_name', device.name || 'Unknown');
      
      console.log('Printer reconnected successfully');
      return true;
    } catch (error) {
      console.error('Error reconnecting to printer:', error);
      return false;
    }
  }

  /**
   * Handle disconnection event - attempt auto-reconnect
   */
  private async onDisconnected(): Promise<void> {
    console.log('Printer disconnected');
    
    // Don't auto-reconnect if user manually disconnected
    const wasConnected = localStorage.getItem('thermal_printer_connected');
    if (wasConnected !== 'true' || this.isReconnecting || !this.savedDevice) {
      return;
    }

    // Try to reconnect
    if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
      this.isReconnecting = true;
      this.reconnectAttempts++;
      
      console.log(`Auto-reconnect attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS}...`);
      
      // Wait before reconnecting
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const success = await this.reconnectToDevice(this.savedDevice);
      
      if (success) {
        this.reconnectAttempts = 0; // Reset on success
        console.log('Auto-reconnect successful');
      } else if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
        console.log('Auto-reconnect failed after max attempts');
        localStorage.removeItem('thermal_printer_connected');
      }
      
      this.isReconnecting = false;
    }
  }

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

      const success = await this.reconnectToDevice(device);
      
      if (success) {
        // Setup disconnect listener for auto-reconnect
        device.addEventListener('gattserverdisconnected', this.onDisconnected.bind(this));
        
        // Save device to memory for future reconnects
        this.savedDevice = device;
        
        // Reset reconnect attempts on successful manual connection
        this.reconnectAttempts = 0;
      }

      return success;
    } catch (error) {
      console.error('Error connecting to printer:', error);
      throw error;
    }
  }

  /**
   * Disconnect from printer
   */
  async disconnect(): Promise<void> {
    // Clear localStorage to prevent auto-reconnect
    localStorage.removeItem('thermal_printer_connected');
    localStorage.removeItem('thermal_printer_device_id');
    localStorage.removeItem('thermal_printer_device_name');
    
    if (this.printer?.device?.gatt?.connected) {
      await this.printer.device.gatt.disconnect();
    }
    
    this.printer = null;
    this.savedDevice = null;
    this.reconnectAttempts = 0;
  }

  /**
   * Check if printer is connected
   */
  isConnected(): boolean {
    return this.printer?.device?.gatt?.connected ?? false;
  }

  /**
   * Check if printer is currently attempting to reconnect
   */
  isReconnectingNow(): boolean {
    return this.isReconnecting;
  }

  /**
   * Get saved printer device ID
   */
  getSavedPrinterDeviceId(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('thermal_printer_device_id');
  }

  /**
   * Send data to printer
   * Optimized for mobile devices with smaller chunks and longer delays
   */
  private async sendData(data: Uint8Array): Promise<void> {
    if (!this.printer?.characteristic) {
      throw new Error('Printer belum terkoneksi');
    }

    // Use smaller chunk size for mobile stability (was 512, now 128)
    // Mobile Bluetooth connections need smaller packets to prevent buffer overflow
    const chunkSize = 128;
    
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, Math.min(i + chunkSize, data.length));
      
      // Use writeWithoutResponse if available (faster for thermal printers)
      if (this.printer.characteristic.properties.writeWithoutResponse) {
        await this.printer.characteristic.writeValueWithoutResponse(chunk);
      } else {
        await this.printer.characteristic.writeValue(chunk);
      }
      
      // Longer delay for mobile devices (was 50ms, now 100ms)
      // This prevents printer buffer overflow on slower mobile connections
      await new Promise(resolve => setTimeout(resolve, 100));
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
    // Try to reconnect if not connected
    if (!this.isConnected()) {
      const wasConnected = localStorage.getItem('thermal_printer_connected');
      if (wasConnected === 'true' && this.savedDevice) {
        console.log('Printer disconnected, attempting to reconnect...');
        const reconnected = await this.reconnectToDevice(this.savedDevice);
        if (!reconnected) {
          throw new Error('Printer terputus dan gagal reconnect. Silakan connect ulang.');
        }
      } else {
        throw new Error('Printer belum terkoneksi. Silakan connect terlebih dahulu.');
      }
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
        .line(LEFT_MARGIN + 'Telp: 0813-9590-7612')
        .line(LEFT_MARGIN + 'Admin: 0813-2159-3295')
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

      // Hitung total jumlah barang (sum dari semua qty)
      const totalQty = receiptData.items.reduce((sum, item) => sum + item.quantity, 0);
      const qtyLine = this.createRow(`Jumlah Barang:`, `${totalQty} barang`, PRINTER_WIDTH);
      
      encoder
        .align('left')
        .line(LEFT_MARGIN + qtyLine)
        .newline();

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
   * Print daily sales report to thermal printer
   * Format: List of customers with their transaction count and revenue
   */
  async printDailyReport(reportData: DailyReportData): Promise<void> {
    // Try to reconnect if not connected
    if (!this.isConnected()) {
      const wasConnected = localStorage.getItem('thermal_printer_connected');
      if (wasConnected === 'true' && this.savedDevice) {
        console.log('Printer disconnected, attempting to reconnect...');
        const reconnected = await this.reconnectToDevice(this.savedDevice);
        if (!reconnected) {
          throw new Error('Printer terputus dan gagal reconnect. Silakan connect ulang.');
        }
      } else {
        throw new Error('Printer belum terkoneksi. Silakan connect terlebih dahulu.');
      }
    }

    try {
      const encoder = new EscPosEncoder();
      const PRINTER_WIDTH = 42; // 42 characters - lebar area cetak efektif
      const LEFT_MARGIN = '  '; // 2 spasi kiri untuk centering

      // Initialize printer
      encoder.initialize();

      // Store header - center aligned
      encoder
        .align('center')
        .bold(true)
        .size('large')
        .line(LEFT_MARGIN + '3PACHINO')
        .size('normal')
        .bold(false)
        .line(LEFT_MARGIN + 'Pasar Andir Basement Blok M 25-26')
        .line(LEFT_MARGIN + 'Telp: 0813-9590-7612')
        .newline();

      // Report title
      encoder
        .align('center')
        .bold(true)
        .size('large')
        .line(LEFT_MARGIN + 'LAPORAN PENDAPATAN')
        .size('normal')
        .bold(false);

      // Date info
      const dateDisplay = reportData.dateRange || reportData.date;
      encoder
        .line(LEFT_MARGIN + dateDisplay)
        .newline();

      // Separator
      const separator = LEFT_MARGIN + '='.repeat(PRINTER_WIDTH);
      encoder
        .align('left')
        .line(separator)
        .newline();

      // Customer list
      encoder
        .align('left')
        .bold(true)
        .line(LEFT_MARGIN + 'DETAIL PER CUSTOMER:')
        .bold(false)
        .newline();

      // Sort customers by total amount descending
      const sortedCustomers = [...reportData.customers].sort((a, b) => b.totalAmount - a.totalAmount);

      for (const customer of sortedCustomers) {
        // Customer name (BOLD)
        const customerName = customer.name.length > PRINTER_WIDTH 
          ? customer.name.substring(0, PRINTER_WIDTH - 3) + '...' 
          : customer.name;
        
        encoder
          .bold(true)
          .line(LEFT_MARGIN + customerName)
          .bold(false);

        // Transaction count and amount
        const transactionInfo = `${customer.transactionCount} transaksi`;
        const amountFormatted = this.formatCurrency(customer.totalAmount);
        const amountText = `Rp ${amountFormatted}`;
        
        const detailLine = this.createRow(transactionInfo, amountText, PRINTER_WIDTH);
        
        encoder
          .line(LEFT_MARGIN + detailLine)
          .newline();
      }

      // Separator
      encoder
        .align('left')
        .line(separator)
        .newline();

      // Summary statistics
      const totalTransactionsLine = this.createRow(
        'Total Transaksi:',
        `${reportData.totalTransactions} transaksi`,
        PRINTER_WIDTH
      );
      
      encoder
        .align('left')
        .line(LEFT_MARGIN + totalTransactionsLine)
        .newline();

      // Total revenue - BOLD dan BESAR
      const totalLabel = 'TOTAL PENDAPATAN:';
      const totalRevenueFormatted = this.formatCurrency(reportData.totalRevenue);
      const totalRightPart = `Rp ${totalRevenueFormatted}`;
      
      const totalLine = this.createRow(totalLabel, totalRightPart, PRINTER_WIDTH);
      
      encoder
        .align('left')
        .bold(true)
        .size('large')
        .line(LEFT_MARGIN + totalLine)
        .size('normal')
        .bold(false)
        .newline();

      encoder
        .line(separator);

      // Footer
      encoder
        .align('center')
        .newline()
        .line(LEFT_MARGIN + 'Dicetak pada:')
        .line(LEFT_MARGIN + format(new Date(), 'dd MMM yyyy HH:mm', { locale: id }))
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
      console.error('Error printing daily report:', error);
      throw error;
    }
  }

  /**
   * Print Stock Report - Laporan Sisa Stok Produk
   * Format thermal printer 80mm dengan layout rapi
   */
  async printStockReport(reportData: StockReportData): Promise<void> {
    // Try to reconnect if not connected
    if (!this.isConnected()) {
      const wasConnected = localStorage.getItem('thermal_printer_connected');
      if (wasConnected === 'true' && this.savedDevice) {
        console.log('Printer disconnected, attempting to reconnect...');
        const reconnected = await this.reconnectToDevice(this.savedDevice);
        if (!reconnected) {
          throw new Error('Printer terputus dan gagal reconnect. Silakan connect ulang.');
        }
      } else {
        throw new Error('Printer belum terkoneksi. Silakan connect terlebih dahulu.');
      }
    }

    try {
      const encoder = new EscPosEncoder();
      const PRINTER_WIDTH = 42; // 42 characters - lebar area cetak efektif
      const LEFT_MARGIN = '  '; // 2 spasi kiri untuk centering

      // Initialize printer
      encoder.initialize();

      // Header - Laporan Stok
      encoder
        .align('center')
        .bold(true)
        .size('large')
        .line(LEFT_MARGIN + '')
        .line(LEFT_MARGIN + '3PACHINO')
        .size('normal')
        .bold(false)
        .line(LEFT_MARGIN + 'LAPORAN SISA STOK')
        .newline();

      // Separator
      const separator = LEFT_MARGIN + '='.repeat(PRINTER_WIDTH);
      encoder
        .align('left')
        .line(separator);

      // Product Info
      encoder
        .align('left')
        .bold(true)
        .line(LEFT_MARGIN + 'INFORMASI PRODUK:')
        .bold(false)
        .newline();

      // Product name only (no SKU, Brand, Category)
      const productName = reportData.productName.length > PRINTER_WIDTH 
        ? reportData.productName.substring(0, PRINTER_WIDTH - 3) + '...' 
        : reportData.productName;
      
      encoder
        .bold(true)
        .size('large')
        .line(LEFT_MARGIN + productName)
        .size('normal')
        .bold(false)
        .newline();

      // Separator
      encoder
        .align('left')
        .line(separator)
        .newline();

      // Stock Details Header - BOLD & LARGE
      encoder
        .align('left')
        .bold(true)
        .size('large')
        .line(LEFT_MARGIN + 'DETAIL STOK:')
        .size('normal')
        .bold(false)
        .newline();

      // Group variants by color
      const variantsByColor = new Map<string, Array<{size: string, stock: number, minStock: number}>>();
      
      for (const variant of reportData.variants) {
        if (!variantsByColor.has(variant.color)) {
          variantsByColor.set(variant.color, []);
        }
        variantsByColor.get(variant.color)!.push({
          size: variant.size,
          stock: variant.stock,
          minStock: variant.minStock
        });
      }

      // Convert to array and prepare for 2-column layout
      const colorGroups = Array.from(variantsByColor.entries());
      const COLUMN_WIDTH = 19; // Width for each column (19 chars each = 38 total + 2 margin = 40)

      // Process in pairs (2 columns side by side)
      for (let i = 0; i < colorGroups.length; i += 2) {
        const leftColor = colorGroups[i];
        const rightColor = colorGroups[i + 1] || null;

        // Color names header (BOLD & LARGE)
        const leftColorName = leftColor[0].length > COLUMN_WIDTH 
          ? leftColor[0].substring(0, COLUMN_WIDTH - 3) + '...' 
          : leftColor[0];
        
        const rightColorName = rightColor 
          ? (rightColor[0].length > COLUMN_WIDTH 
              ? rightColor[0].substring(0, COLUMN_WIDTH - 3) + '...' 
              : rightColor[0])
          : '';

        // Print color names (uppercase for visibility)
        const colorHeader = leftColorName.toUpperCase().padEnd(COLUMN_WIDTH) + '  ' + rightColorName.toUpperCase();
        
        encoder
          .bold(true)
          .size('large')
          .line(LEFT_MARGIN + colorHeader)
          .size('normal')
          .bold(false);

        // Get max rows needed
        const leftVariants = leftColor[1];
        const rightVariants = rightColor ? rightColor[1] : [];
        const maxRows = Math.max(leftVariants.length, rightVariants.length);

        // Print size + stock rows side by side
        for (let row = 0; row < maxRows; row++) {
          const leftVariant = leftVariants[row];
          const rightVariant = rightVariants[row];

          // Left column
          const leftText = leftVariant 
            ? `${leftVariant.size} = ${leftVariant.stock}` 
            : '';
          
          // Right column
          const rightText = rightVariant 
            ? `${rightVariant.size} = ${rightVariant.stock}` 
            : '';

          // Combine both columns
          const rowText = leftText.padEnd(COLUMN_WIDTH) + '  ' + rightText;
          
          encoder
            .bold(true)
            .line(LEFT_MARGIN + rowText)
            .bold(false);
        }

        // Add spacing between color groups
        encoder.newline();
      }

      // Separator
      encoder
        .align('left')
        .line(separator)
        .newline();

      // Summary
      const totalVariants = reportData.variants.length;
      const lowStockCount = reportData.variants.filter(v => v.stock <= v.minStock).length;

      encoder
        .align('left')
        .bold(true)
        .line(LEFT_MARGIN + 'RINGKASAN:')
        .bold(false);

      const variantsLine = this.createRow(
        'Total Varian:',
        `${totalVariants} varian`,
        PRINTER_WIDTH
      );
      
      encoder.line(LEFT_MARGIN + variantsLine);

      if (lowStockCount > 0) {
        const lowStockLine = this.createRow(
          'Stok Rendah:',
          `${lowStockCount} varian`,
          PRINTER_WIDTH
        );
        encoder
          .bold(true)
          .line(LEFT_MARGIN + lowStockLine)
          .bold(false);
      }

      const totalStockLine = this.createRow(
        'Total Stok:',
        `${reportData.totalStock} pcs`,
        PRINTER_WIDTH
      );
      
      encoder
        .newline()
        .bold(true)
        .size('large')
        .line(LEFT_MARGIN + totalStockLine)
        .size('normal')
        .bold(false);

      // Separator
      encoder
        .newline()
        .align('left')
        .line(separator);

      // Footer - print date
      encoder
        .align('center')
        .newline()
        .line(LEFT_MARGIN + 'Dicetak pada:')
        .line(LEFT_MARGIN + reportData.printDate)
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
      console.error('Error printing stock report:', error);
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
export const initializeThermalPrinter = () => thermalPrinter.initializeConnection();
export const printThermalReceipt = (data: ReceiptData) => thermalPrinter.printReceipt(data);
export const printThermalDailyReport = (data: DailyReportData) => thermalPrinter.printDailyReport(data);
export const printThermalStockReport = (data: StockReportData) => thermalPrinter.printStockReport(data);
export const testThermalPrint = () => thermalPrinter.testPrint();
export const isThermalPrinterConnected = () => thermalPrinter.isConnected();
export const isThermalPrinterReconnecting = () => thermalPrinter.isReconnectingNow();
export const getSavedThermalPrinterDeviceId = () => thermalPrinter.getSavedPrinterDeviceId();
export const isBluetoothSupported = () => thermalPrinter.isBluetoothSupported();

export type { ReceiptData, ReceiptItem, DailyReportData, DailyReportCustomer, StockReportData, StockVariant };
