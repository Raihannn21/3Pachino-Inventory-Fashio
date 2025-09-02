import QRCode from 'qrcode';

// Generate barcode untuk product variant
export const generateBarcode = (sku: string, sizeCode: string, colorCode: string): string => {
  // Format: 3P + SKU(4) + Size(2) + Color(2) + Random(3)
  const skuPart = sku.replace('3P', '').substring(0, 4).padEnd(4, '0');
  const sizePart = sizeCode.substring(0, 2).padEnd(2, '0').toUpperCase();
  const colorPart = colorCode.substring(0, 2).padEnd(2, '0').toUpperCase();
  const randomPart = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  
  return `3P${skuPart}${sizePart}${colorPart}${randomPart}`;
};

// Generate QR Code sebagai data URL
export const generateQRCode = async (data: string): Promise<string> => {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(data, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    return qrCodeDataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
};

// Generate QR Code untuk variant dengan informasi lengkap
export const generateVariantQRData = (variant: {
  id: string;
  barcode: string;
  product: {
    name: string;
    sku: string;
  };
  size: {
    name: string;
  };
  color: {
    name: string;
  };
  stock: number;
}) => {
  // Data yang akan di-encode dalam QR code
  return JSON.stringify({
    type: 'product_variant',
    id: variant.id,
    barcode: variant.barcode,
    product: variant.product.name,
    sku: variant.product.sku,
    size: variant.size.name,
    color: variant.color.name,
    stock: variant.stock,
    timestamp: new Date().toISOString()
  });
};

// Parse QR Code data
export const parseQRData = (qrData: string) => {
  try {
    return JSON.parse(qrData);
  } catch (error) {
    console.error('Error parsing QR data:', error);
    return null;
  }
};

// Generate barcode untuk EAN-13 format (jika diperlukan)
export const generateEAN13 = (sku: string): string => {
  // Simplified EAN-13 generation
  const prefix = '890'; // Country code for Indonesia
  const company = '1234'; // Company code
  const product = sku.replace(/[^0-9]/g, '').substring(0, 5).padStart(5, '0');
  
  const withoutChecksum = prefix + company + product;
  const checksum = calculateEAN13Checksum(withoutChecksum);
  
  return withoutChecksum + checksum;
};

// Calculate EAN-13 checksum
const calculateEAN13Checksum = (code: string): string => {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(code[i]);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checksum = (10 - (sum % 10)) % 10;
  return checksum.toString();
};
