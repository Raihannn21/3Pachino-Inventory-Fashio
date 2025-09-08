'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Receipt from '@/components/receipt/Receipt';

interface Transaction {
  id: string;
  invoiceNumber: string;
  transactionDate: string;
  totalAmount: number;
  notes?: string;
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

export default function PrintReceiptPage() {
  const params = useParams();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransaction = async () => {
      try {
        const response = await fetch(`/api/sales/${params.id}`);
        if (!response.ok) {
          throw new Error('Transaction not found');
        }
        const data = await response.json();
        setTransaction(data);
      } catch (error) {
        setError('Failed to load transaction');
        console.error('Error fetching transaction:', error);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchTransaction();
    }
  }, [params.id]);

  // Auto print when page loads (useful for sharing)
  useEffect(() => {
    if (transaction && typeof window !== 'undefined' && window.location.search.includes('auto-print=true')) {
      setTimeout(() => {
        window.print();
      }, 1000);
    }
  }, [transaction]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat struk...</p>
        </div>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Struk tidak ditemukan</p>
          <a href="/sales" className="text-blue-600 hover:underline">
            Kembali ke daftar penjualan
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        <Receipt 
          transaction={{
            ...transaction,
            items: transaction.items.map(item => ({
              ...item,
              price: item.unitPrice,
              subtotal: item.totalPrice
            }))
          }}
        />
      </div>
    </div>
  );
}
