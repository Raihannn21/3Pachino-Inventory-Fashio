/**
 * Barcode Printer menggunakan Thermal Printer Bluetooth
 * Menggunakan Web Bluetooth API dan ESC/POS commands
 */

import EscPosEncoder from 'esc-pos-encoder';

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
   * Initialize and check if thermal printer is already connected
   */
  async initializeConnection(): Promise<boolean> {
    if (this.isConnected()) {
      return true;
    }

    try {
      const wasConnected = localStorage.getItem('thermal_printer_connected');
      if (wasConnected === 'true') {
        const deviceId = localStorage.getItem('thermal_printer_device_id');
        if (deviceId) {
          // Reuse existing thermal printer connection
          const devices = await navigator.bluetooth.getDevices();
          const device = devices.find(d => d.id === deviceId);
          if (device) {
            return await this.reconnectToDevice(device);
          }
        }
      }
    } catch (error) {
      console.log('No existing printer connection:', error);
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
        throw new Error('GATT tidak tersedia pada device');
      }

      const server = await device.gatt.connect();
      const services = await server.getPrimaryServices();
      
      let characteristic: BluetoothRemoteGATTCharacteristic | null = null;
      
      for (const service of services) {
        try {
          const characteristics = await service.getCharacteristics();
          for (const char of characteristics) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              characteristic = char;
              break;
            }
          }
          if (characteristic) break;
        } catch (err) {
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

      this.savedDevice = device;
      
      return true;
    } catch (error) {
      console.error('Error reconnecting to printer:', error);
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
    return this.printer?.device?.gatt?.connected ?? false;
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
   * Print barcode using raw ESC/POS commands
   * Optimized for 33x25mm label size
   */
  private createBarcodeCommand(barcode: string): Uint8Array {
    const barcodeBytes = new TextEncoder().encode(barcode);
    const length = barcodeBytes.length;
    
    // ESC/POS barcode command for CODE128
    // Adjusted for 33x25mm label
    const commandHeader = new Uint8Array([
      0x1D, 0x68, 0x50,        // Set barcode height to 80 dots (good for 25mm height)
      0x1D, 0x77, 0x02,        // Set barcode width (2 = medium)
      0x1D, 0x48, 0x00,        // NO HRI characters (no text below barcode)
      0x1D, 0x6B, 0x49,        // Start CODE128 barcode
      length,                   // Length of barcode data
    ]);
    
    // Combine header with barcode data
    const command = new Uint8Array(commandHeader.length + barcodeBytes.length);
    command.set(commandHeader, 0);
    command.set(barcodeBytes, commandHeader.length);
    
    return command;
  }

  /**
   * Print barcode label
   * Optimized for Xprinter 40x20mm label using TSPL commands
   * TSPL (TSC Printer Language) for label printers
   */
  async printBarcodeLabel(variant: ProductVariant, quantity: number = 1): Promise<void> {
    if (!variant.barcode) {
      throw new Error('Variant tidak memiliki barcode');
    }

    // Try to connect if not connected
    if (!this.isConnected()) {
      const connected = await this.initializeConnection();
      if (!connected) {
        throw new Error('Printer belum terkoneksi. Silakan hubungkan printer terlebih dahulu dari halaman POS.');
      }
    }

    try {
      const textEncoder = new TextEncoder();
      
      for (let i = 0; i < quantity; i++) {
        // Prepare label data
        const productName = this.truncateText(variant.product.name, 24);
        const sizeColor = `${variant.size.name} | ${variant.color.name}`;
        
        // TSPL Commands for Xprinter label (40x20mm)
        let tspl = '';
        tspl += 'SIZE 40 mm, 20 mm\r\n';      // Set label size 40x20mm
        tspl += 'GAP 2 mm, 0 mm\r\n';         // Gap between labels
        tspl += 'DIRECTION 0\r\n';            // Print direction
        tspl += 'CLS\r\n';                    // Clear buffer
        
        // Barcode at top (CODE128, height=50, human readable below)
        tspl += `BARCODE 40,10,"128",50,1,0,2,2,"${variant.barcode}"\r\n`;
        
        // Product name below barcode
        tspl += `TEXT 10,70,"3",0,1,1,"${productName}"\r\n`;
        
        // Size | Color at bottom
        tspl += `TEXT 10,100,"2",0,1,1,"${sizeColor}"\r\n`;
        
        tspl += 'PRINT 1\r\n';                // Print 1 label
        
        // Convert to bytes and send
        const bytes = textEncoder.encode(tspl);
        await this.sendData(bytes);
        
        console.log(`✅ TSPL Label sent: "${productName}"`);
        
        // Delay between labels
        if (i < quantity - 1) {
          await new Promise(resolve => setTimeout(resolve, 800));
        }
      }
      
      console.log(`✅ Printed ${quantity} label(s) with TSPL`);
      
    } catch (error) {
      console.error('Error printing label:', error);
      throw error;
    }
  }

  /**
   * Truncate text to specified length
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - 3) + '...';
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
