import { Logo } from '@/components/ui/logo';

interface ReceiptHeaderProps {
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  receiptNumber?: string;
  date?: string;
}

export function ReceiptHeader({
  storeName = "3PACHINO STORE",
  storeAddress = "Jl. Fashion Street No. 123, Jakarta",
  storePhone = "+62 21 1234 5678",
  receiptNumber,
  date
}: ReceiptHeaderProps) {
  return (
    <div className="text-center border-b pb-4 mb-4">
      {/* Logo */}
      <div className="flex justify-center mb-3">
        <Logo size="lg" showText={true} linkable={false} />
      </div>
      
      {/* Store Info */}
      <div className="space-y-1 text-sm text-slate-600">
        <p className="font-semibold text-slate-800">{storeName}</p>
        <p>{storeAddress}</p>
        <p>{storePhone}</p>
      </div>
      
      {/* Receipt Info */}
      {(receiptNumber || date) && (
        <div className="mt-3 pt-3 border-t space-y-1 text-xs text-slate-500">
          {receiptNumber && <p>No. Nota: {receiptNumber}</p>}
          {date && <p>Tanggal: {date}</p>}
        </div>
      )}
    </div>
  );
}

interface ReceiptFooterProps {
  thankYouMessage?: string;
  returnPolicy?: string;
  socialMedia?: {
    instagram?: string;
    whatsapp?: string;
  };
}

export function ReceiptFooter({
  thankYouMessage = "Terima kasih atas kunjungan Anda!",
  returnPolicy = "Barang yang sudah dibeli tidak dapat dikembalikan",
  socialMedia
}: ReceiptFooterProps) {
  return (
    <div className="border-t pt-4 mt-4 text-center space-y-2">
      <p className="text-sm font-medium text-slate-700">{thankYouMessage}</p>
      
      {returnPolicy && (
        <p className="text-xs text-slate-500">{returnPolicy}</p>
      )}
      
      {socialMedia && (
        <div className="space-y-1 text-xs text-slate-600">
          {socialMedia.instagram && (
            <p>Instagram: @{socialMedia.instagram}</p>
          )}
          {socialMedia.whatsapp && (
            <p>WhatsApp: {socialMedia.whatsapp}</p>
          )}
        </div>
      )}
      
      {/* Logo kecil di footer */}
      <div className="flex justify-center pt-2">
        <Logo size="sm" showText={false} linkable={false} />
      </div>
    </div>
  );
}
