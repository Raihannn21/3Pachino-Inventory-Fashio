'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react';

interface DaysRemainingProps {
  variantId: string;
  currentStock: number;
  className?: string;
}

interface InventoryStatus {
  status: 'critical' | 'warning' | 'normal' | 'safe' | 'unknown';
  color: string;
  message: string;
  priority: number;
}

export default function DaysRemaining({ variantId, currentStock, className }: DaysRemainingProps) {
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [status, setStatus] = useState<InventoryStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDaysRemaining();
  }, [variantId]);

  const fetchDaysRemaining = async () => {
    if (currentStock === 0) {
      setDaysRemaining(0);
      setStatus({
        status: 'critical',
        color: 'red',
        message: 'Stok habis',
        priority: 3,
      });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/inventory/analytics?variantId=${variantId}`);
      if (response.ok) {
        const data = await response.json();
        setDaysRemaining(data.daysRemaining || 0);
        setStatus(data.status || {
          status: 'unknown',
          color: 'gray',
          message: 'Tidak dapat menghitung',
          priority: 0,
        });
      } else {
        throw new Error('Failed to fetch');
      }
    } catch (error) {
      console.error('Error fetching days remaining:', error);
      setDaysRemaining(null);
      setStatus({
        status: 'unknown',
        color: 'gray',
        message: 'Tidak dapat menghitung',
        priority: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const getIcon = () => {
    if (!status) return <Clock className="h-3 w-3" />;
    
    switch (status.status) {
      case 'critical':
        return <AlertTriangle className="h-3 w-3" />;
      case 'warning':
        return <Clock className="h-3 w-3" />;
      case 'normal':
      case 'safe':
        return <CheckCircle className="h-3 w-3" />;
      default:
        return <HelpCircle className="h-3 w-3" />;
    }
  };

  const getBadgeVariant = () => {
    if (!status) return 'secondary';
    
    switch (status.status) {
      case 'critical':
        return 'destructive';
      case 'warning':
        return 'secondary'; // You might want to create a warning variant
      case 'normal':
        return 'default';
      case 'safe':
        return 'default'; // You might want to create a success variant
      default:
        return 'secondary';
    }
  };

  const getDisplayText = () => {
    if (loading) return 'Loading...';
    if (currentStock === 0) return 'Habis';
    if (daysRemaining === null) return 'N/A';
    if (daysRemaining === 0) return 'Habis';
    if (daysRemaining < 1) return '< 1 hari';
    if (daysRemaining === 1) return '1 hari';
    return `${daysRemaining} hari`;
  };

  if (loading) {
    return (
      <Badge variant="secondary" className={className}>
        <Clock className="h-3 w-3 mr-1 animate-spin" />
        Loading...
      </Badge>
    );
  }

  return (
    <Badge 
      variant={getBadgeVariant()} 
      className={`${className} text-xs`}
      title={status?.message}
    >
      {getIcon()}
      <span className="ml-1">{getDisplayText()}</span>
    </Badge>
  );
}
