/**
 * Barcode Printer menggunakan Xprinter Label Printer (40x20mm)
 * Menggunakan Web Bluetooth API dan TSPL (TSC Printer Language)
 */

interface ProductVariant {
  id: string;
  barcode?: string;
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

interface PrinterDevice {
  device: BluetoothDevice;
  characteristic: BluetoothRemoteGATTCharacteristic | null;
}

class BarcodePrinter {
  private printer: PrinterDevice | null = null;
  private savedDevice: BluetoothDevice | null = null;

  constructor() {
    // Try to get saved device from thermal printer
    this.initializeConnection();
  }

  /**
   * Initialize and check if barcode printer is already connected
   */
  async initializeConnection(): Promise<boolean> {
    if (this.isConnected()) {
      return true;
    }

    try {
      const wasConnected = localStorage.getItem('barcode_printer_connected');
      if (wasConnected === 'true') {
        const deviceId = localStorage.getItem('barcode_printer_device_id');
        if (deviceId) {
          // Reuse existing barcode printer connection
          const devices = await navigator.bluetooth.getDevices();
          const device = devices.find(d => d.id === deviceId);
          if (device) {
            return await this.reconnectToDevice(device);
          }
        }
      }
    } catch (error) {
      console.log('No existing barcode printer connection:', error);
    }
    
    return false;
  }

  /**
   * Check if Web Bluetooth API is supported
   */
  isBluetoothSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  /**
   * Reconnect to a specific device
   */
  private async reconnectToDevice(device: BluetoothDevice): Promise<boolean> {
    try {
      if (!device.gatt) {
        console.error('GATT not available on device');
        throw new Error('GATT tidak tersedia pada device');
      }

      console.log('Attempting to connect to barcode printer GATT...');
      const server = await device.gatt.connect();
      console.log('GATT connected, getting services...');
      const services = await server.getPrimaryServices();
      console.log(`Found ${services.length} services`);
      
      let characteristic: BluetoothRemoteGATTCharacteristic | null = null;
      
      for (const service of services) {
        try {
          const characteristics = await service.getCharacteristics();
          for (const char of characteristics) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              characteristic = char;
              console.log('Found writable characteristic:', char.uuid);
              break;
            }
          }
          if (characteristic) break;
        } catch (err) {
          console.log('Error reading service characteristics:', err);
          continue;
        }
      }
      
      if (!characteristic) {
        console.error('No writable characteristic found');
        throw new Error('Tidak dapat menemukan characteristic untuk menulis ke printer.');
      }

      this.printer = {
        device,
        characteristic
      };

      this.savedDevice = device;
      
      // Save connection state and device ID to localStorage
      localStorage.setItem('barcode_printer_connected', 'true');
      localStorage.setItem('barcode_printer_device_id', device.id);
      
      // Add disconnect listener to clean up
      device.addEventListener('gattserverdisconnected', () => {
        console.log('Barcode printer disconnected');
        this.printer = null;
        localStorage.removeItem('barcode_printer_connected');
        localStorage.removeItem('barcode_printer_device_id');
      });
      
      console.log('✅ Barcode printer reconnected successfully');
      return true;
    } catch (error) {
      console.error('Error reconnecting to barcode printer:', error);
      // Clean up localStorage on failed reconnect
      localStorage.removeItem('barcode_printer_connected');
      localStorage.removeItem('barcode_printer_device_id');
      return false;
    }
  }

  /**
   * Connect to Bluetooth thermal printer (same as thermal printer)
   */
  async connect(): Promise<boolean> {
    if (!this.isBluetoothSupported()) {
      throw new Error('Web Bluetooth API tidak didukung di browser ini. Gunakan Chrome atau Edge.');
    }

    try {
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb',
          '49535343-fe7d-4ae5-8fa9-9fafd205e455',
          '0000fff0-0000-1000-8000-00805f9b34fb',
          '0000ffe0-0000-1000-8000-00805f9b34fb',
        ]
      });

      const success = await this.reconnectToDevice(device);
      
      if (success) {
        this.savedDevice = device;
      }

      return success;
    } catch (error) {
      console.error('Error connecting to printer:', error);
      throw error;
    }
  }

  /**
   * Check if printer is connected
   */
  isConnected(): boolean {
    const connected = this.printer?.device?.gatt?.connected ?? false;
    console.log('Barcode printer connection check:', {
      hasPrinter: !!this.printer,
      hasDevice: !!this.printer?.device,
      hasGatt: !!this.printer?.device?.gatt,
      isConnected: connected,
      hasCharacteristic: !!this.printer?.characteristic
    });
    return connected;
  }

  /**
   * Send data to printer
   */
  private async sendData(data: Uint8Array): Promise<void> {
    if (!this.printer?.characteristic) {
      throw new Error('Printer belum terkoneksi. Silakan hubungkan printer terlebih dahulu.');
    }

    const chunkSize = 128;
    
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, Math.min(i + chunkSize, data.length));
      
      if (this.printer.characteristic.properties.writeWithoutResponse) {
        await this.printer.characteristic.writeValueWithoutResponse(chunk);
      } else {
        await this.printer.characteristic.writeValue(chunk);
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Calibrate printer via Bluetooth using TSPL GAPDETECT command
   */
  async calibrateViaBluetooth(): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('Printer belum terkoneksi. Silakan hubungkan printer terlebih dahulu.');
    }

    try {
      const textEncoder = new TextEncoder();
      const calibrateCommand = "GAPDETECT\r\n";
      const bytes = textEncoder.encode(calibrateCommand);
      await this.sendData(bytes);
      console.log('✅ Calibration command sent via Bluetooth');
    } catch (error) {
      console.error('Error calibrating printer:', error);
      throw error;
    }
  }

  /**
   * Helper: Calculate centered X position dynamically
   */
  private getCenteredX(contentWidth: number, areaWidth: number, areaStartX: number): number {
    return Math.round(areaStartX + (areaWidth - contentWidth) / 2);
  }

  /**
   * Helper: Truncate text to specified length
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Print barcode label using TSPL commands
   * Layout: 87mm x 20mm paper with 2 labels (40x20mm each)
   */
  async printBarcodeLabel(variant: ProductVariant, quantity: number = 1): Promise<void> {
    if (!variant.barcode) {
      throw new Error('Variant tidak memiliki barcode');
    }

    // Check if printer is connected first
    if (!this.isConnected()) {
      // Try to initialize/reconnect
      console.log('Barcode printer not connected, attempting to reconnect...');
      const connected = await this.initializeConnection();
      if (!connected) {
        // Still not connected after trying to reconnect
        console.error('Barcode printer connection failed');
        throw new Error('Printer barcode belum terkoneksi. Silakan klik tombol "Connect Printer Barcode" terlebih dahulu untuk menghubungkan printer.');
      }
      console.log('Barcode printer reconnected successfully');
    }

    // Double check connection before proceeding
    if (!this.printer?.characteristic) {
      console.error('Printer object or characteristic is null');
      throw new Error('Printer barcode belum siap. Silakan reconnect printer barcode terlebih dahulu.');
    }

    try {
      const textEncoder = new TextEncoder();

      for (let i = 0; i < quantity; i++) {
        // === KONSTANTA LABEL (dalam DOTS @ 8 dots/mm = 203 DPI) ===
        const PAPER_WIDTH_DOTS = 696; // 87mm * 8 dots/mm
        const PAPER_HEIGHT_DOTS = 160; // 20mm * 8 dots/mm
        const LEFT_MARGIN_DOTS = 16; // 2mm margin kiri
        const LABEL_WIDTH_DOTS = 320; // 40mm per label
        const GAP_BETWEEN_LABELS_DOTS = 32; // 4mm gap between labels
        const RIGHT_LABEL_START_X = LEFT_MARGIN_DOTS + LABEL_WIDTH_DOTS + GAP_BETWEEN_LABELS_DOTS; // 368 dots

        // Offset untuk fine-tuning alignment
        const HORIZONTAL_OFFSET = -40; // Offset untuk centering sempurna
        const VERTICAL_OFFSET = 45; // Geser untuk centering vertikal

        // Parameter Barcode CODE128 - UKURAN LEBIH KECIL
        const BARCODE_HEIGHT_DOTS = 32; // Tinggi barcode lebih kecil lagi
        const BARCODE_READABLE = 0; // 0 = tidak tampilkan teks di bawah barcode
        const BARCODE_ROTATION = 0; // 0 derajat (horizontal)
        const BARCODE_NARROW = 1; // Narrow bar width = 1 (lebih kecil dari 2)
        const BARCODE_WIDE = 1; // Wide bar width = 1 (lebih kecil dari 2)

        // Product info - HANYA NAMA PRODUK, tidak include variant
        const productName = this.truncateText(variant.product.name, 18);
        const sizeColor = `${variant.size.name} | ${variant.color.name}`;

        // Font "2" character dimensions: 12 dots wide × 20 dots high
        const FONT_CHAR_WIDTH = 12;
        const FONT_CHAR_HEIGHT = 20;

        // Dynamic centering untuk text (berdasarkan panjang string)
        const productNameWidth = productName.length * FONT_CHAR_WIDTH;
        const sizeColorWidth = sizeColor.length * FONT_CHAR_WIDTH;

        // Terapkan offset horizontal ke semua perhitungan X
        const adjustedLeftMargin = LEFT_MARGIN_DOTS + HORIZONTAL_OFFSET;
        const adjustedRightLabelStartX = RIGHT_LABEL_START_X + HORIZONTAL_OFFSET;

        // --- Perkiraan Presisi untuk Barcode CODE128 (untuk 6 karakter format baru) ---
        // Estimasi lebar barcode Code 128: panjang data * estimasi lebar per karakter barcode
        // Untuk narrow=1, wide=1: menggunakan 7 dots per char (lebih kecil dari 10)
        const estimatedBarcodeWidth = variant.barcode!.length * 7;
        const leftBarcodeX = this.getCenteredX(
          estimatedBarcodeWidth,
          LABEL_WIDTH_DOTS,
          adjustedLeftMargin
        );
        const rightBarcodeX = this.getCenteredX(
          estimatedBarcodeWidth,
          LABEL_WIDTH_DOTS,
          adjustedRightLabelStartX
        );

        // Center text dynamically within each label area
        const leftProductNameX = this.getCenteredX(productNameWidth, LABEL_WIDTH_DOTS, adjustedLeftMargin);
        const rightProductNameX = this.getCenteredX(productNameWidth, LABEL_WIDTH_DOTS, adjustedRightLabelStartX);
        const leftSizeColorX = this.getCenteredX(sizeColorWidth, LABEL_WIDTH_DOTS, adjustedLeftMargin);
        const rightSizeColorX = this.getCenteredX(sizeColorWidth, LABEL_WIDTH_DOTS, adjustedRightLabelStartX);

        // Y positions (dengan offset vertikal) - PRESISI SPACING
        const qrCodeY = 30 + VERTICAL_OFFSET;       // Barcode posisi optimal
        const productNameY = 70 + VERTICAL_OFFSET;  // Jarak dari barcode
        const sizeColorY = 90 + VERTICAL_OFFSET;    // Jarak dari productName

        let tspl = "";
        // SIZE dan GAP tetap menggunakan MM fisik
        tspl += "SIZE 87 mm, 20 mm\r\n";
        tspl += "GAP 2 mm, 0 mm\r\n";
        // GUNAKAN DIRECTION 1 UNTUK ORIENTASI YANG BENAR SETELAH UKURAN PAS
        tspl += "DIRECTION 1\r\n";
        tspl += "CLS\r\n";

        // === LABEL KIRI ===
        // Barcode CODE128
        tspl += `BARCODE ${leftBarcodeX},${qrCodeY},"128",${BARCODE_HEIGHT_DOTS},${BARCODE_READABLE},${BARCODE_ROTATION},${BARCODE_NARROW},${BARCODE_WIDE},"${variant.barcode}"\r\n`;
        tspl += `TEXT ${leftProductNameX},${productNameY},"2",0,1,1,"${productName}"\r\n`;
        tspl += `TEXT ${leftSizeColorX},${sizeColorY},"2",0,1,1,"${sizeColor}"\r\n`;

        // === LABEL KANAN ===
        // Barcode CODE128
        tspl += `BARCODE ${rightBarcodeX},${qrCodeY},"128",${BARCODE_HEIGHT_DOTS},${BARCODE_READABLE},${BARCODE_ROTATION},${BARCODE_NARROW},${BARCODE_WIDE},"${variant.barcode}"\r\n`;
        tspl += `TEXT ${rightProductNameX},${productNameY},"2",0,1,1,"${productName}"\r\n`;
        tspl += `TEXT ${rightSizeColorX},${sizeColorY},"2",0,1,1,"${sizeColor}"\r\n`;

        tspl += "PRINT 1\r\n";

        // Convert to bytes and send
        const bytes = textEncoder.encode(tspl);
        await this.sendData(bytes);

        console.log(`✅ TSPL Label sent: "${productName}"`);

        // Delay between labels
        if (i < quantity - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
    } catch (error) {
      console.error('Error printing barcode:', error);
      throw error;
    }
  }
}

// Singleton instance
let barcodeprinterInstance: BarcodePrinter | null = null;

export function getBarcodePrinterInstance(): BarcodePrinter {
  if (!barcodeprinterInstance) {
    barcodeprinterInstance = new BarcodePrinter();
  }
  return barcodeprinterInstance;
}

/**
 * Print barcode label directly to thermal printer
 */
export async function printBarcodeLabel(
  variant: ProductVariant,
  quantity: number = 1
): Promise<void> {
  const printer = getBarcodePrinterInstance();
  await printer.printBarcodeLabel(variant, quantity);
}

/**
 * Check if printer is connected
 */
export function isPrinterConnected(): boolean {
  const printer = getBarcodePrinterInstance();
  return printer.isConnected();
}

/**
 * Connect to printer
 */
export async function connectToPrinter(): Promise<boolean> {
  const printer = getBarcodePrinterInstance();
  return await printer.connect();
}
