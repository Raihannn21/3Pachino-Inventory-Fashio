'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Receipt from '@/components/receipt/Receipt';
import { toast } from 'sonner';

interface Transaction {
  id: string;
  invoiceNumber: string;
  transactionDate: string;
  totalAmount: number;
  notes?: string;
  supplier?: {
    id: string;
    name: string;
    phone?: string;
  };
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    variant?: {
      size: { name: string };
      color: { name: string };
      product: {
        name: string;
        category: { name: string };
        brand: { name: string };
      };
    };
    product: {
      name: string;
      category: { name: string };
      brand: { name: string };
    };
  }>;
  user: {
    name: string;
    email: string;
  };
}

export default function SaleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTransaction = async () => {
    try {
      const response = await fetch(`/api/sales/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setTransaction(data);
      } else {
        toast.error('Transaksi tidak ditemukan');
        router.push('/sales');
      }
    } catch (error) {
      console.error('Error fetching transaction:', error);
      toast.error('Gagal memuat data transaksi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransaction();
  }, [params.id]);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Transaksi tidak ditemukan</p>
          <Button onClick={() => router.push('/sales')} className="mt-4">
            Kembali ke Penjualan
          </Button>
        </div>
      </div>
    );
  }

  // Get customer name from supplier relation, not from notes
  const customerName = transaction.supplier?.name;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/sales')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Detail Penjualan</h1>
          <p className="text-gray-600">
            {transaction.invoiceNumber} • {new Date(transaction.transactionDate).toLocaleDateString('id-ID')}
          </p>
        </div>
      </div>

      {/* Receipt */}
      <Receipt 
        transaction={{
          id: transaction.id,
          invoiceNumber: transaction.invoiceNumber,
          transactionDate: transaction.transactionDate,
          totalAmount: transaction.totalAmount,
          notes: transaction.notes,
          items: transaction.items.map(item => ({
            id: item.id,
            quantity: item.quantity,
            price: item.unitPrice,
            subtotal: item.totalPrice,
            variant: item.variant,
            product: item.product
          }))
        }}
        customerName={customerName}
      />
    </div>
  );
}
