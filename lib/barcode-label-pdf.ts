import jsPDF from 'jspdf';
import JsBarcode from 'jsbarcode';

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

/**
 * Generate PDF with barcode labels for all product variants
 * Format: A4 with 2 columns, each label contains barcode + product info
 */
export async function generateBarcodeLabels(
  variants: ProductVariant[],
  productName: string
): Promise<void> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4', // 210mm x 297mm
  });

  // Label dimensions (in mm)
  const pageWidth = 210;
  const pageHeight = 297;
  const labelWidth = 45;
  const labelHeight = 30;
  const marginX = 7;
  const marginY = 10;
  const gapX = 4; // Gap between columns
  const gapY = 4; // Gap between rows

  // Calculate positions
  const cols = 4; // 4 columns
  const rowsPerPage = Math.floor((pageHeight - 2 * marginY) / (labelHeight + gapY));

  let currentPage = 1;
  let currentRow = 0;
  let currentCol = 0;

  for (let i = 0; i < variants.length; i++) {
    const variant = variants[i];

    // Skip if no barcode
    if (!variant.barcode) {
      continue;
    }

    // Check if we need a new page BEFORE calculating position
    if (currentRow >= rowsPerPage) {
      pdf.addPage();
      currentPage++;
      currentRow = 0;
      currentCol = 0;
    }

    // Calculate position
    const x = marginX + currentCol * (labelWidth + gapX);
    const y = marginY + currentRow * (labelHeight + gapY);

    // Draw label border (optional, for cutting guide)
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.1);
    pdf.rect(x, y, labelWidth, labelHeight);

    // Generate barcode as base64 image
    const canvas = document.createElement('canvas');
    try {
      JsBarcode(canvas, variant.barcode, {
        format: 'CODE128',
        width: 1.2,
        height: 30,
        displayValue: false,
        margin: 0,
      });

      const barcodeImage = canvas.toDataURL('image/png');

      // Add barcode image
      const barcodeWidth = 38;
      const barcodeHeight = 13;
      const barcodeX = x + (labelWidth - barcodeWidth) / 2;
      const barcodeY = y + 3;
      pdf.addImage(barcodeImage, 'PNG', barcodeX, barcodeY, barcodeWidth, barcodeHeight);

      // Add product info text
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      
      // Product name (truncate if too long)
      const productNameText = variant.product.name.length > 18 
        ? variant.product.name.substring(0, 15) + '...'
        : variant.product.name;
      pdf.text(productNameText, x + labelWidth / 2, barcodeY + barcodeHeight + 3.5, {
        align: 'center',
      });

      // Variant info
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6);
      pdf.text(`${variant.size.name} | ${variant.color.name}`, x + labelWidth / 2, barcodeY + barcodeHeight + 7, {
        align: 'center',
      });

    } catch (error) {
      console.error('Error generating barcode for variant:', variant.id, error);
      // Draw error message on label
      pdf.setFontSize(8);
      pdf.setTextColor(255, 0, 0);
      pdf.text('Error generating barcode', x + labelWidth / 2, y + labelHeight / 2, {
        align: 'center',
      });
      pdf.setTextColor(0, 0, 0); // Reset color
    }

    // Move to next position
    currentCol++;
    if (currentCol >= cols) {
      currentCol = 0;
      currentRow++;
    }
  }

  // Save PDF
  const fileName = `Barcode_Labels_${productName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().getTime()}.pdf`;
  pdf.save(fileName);
}

/**
 * Generate a single barcode label PDF (for individual download)
 */
export async function generateSingleBarcodeLabel(variant: ProductVariant): Promise<void> {
  await generateBarcodeLabels([variant], variant.product.name);
}
