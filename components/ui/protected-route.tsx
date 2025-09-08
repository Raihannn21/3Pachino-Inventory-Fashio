"use client";

import { usePermissions } from '@/components/providers/permission-provider';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
  fallback?: React.ReactNode;
}

export function ProtectedRoute({ 
  children, 
  requiredPermission, 
  fallback = <div className="p-4 text-center text-red-600">Anda tidak memiliki akses ke halaman ini</div> 
}: ProtectedRouteProps) {
  const { data: session, status } = useSession();
  const { hasPermission, loading } = usePermissions();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading' || loading) return;
    
    if (!session) {
      router.push('/login');
      return;
    }
  }, [session, status, loading, router]);

  // Show loading while checking session and permissions
  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If no session, don't render anything (will redirect)
  if (!session) {
    return null;
  }

  // If no specific permission required, just check authentication
  if (!requiredPermission) {
    return <>{children}</>;
  }

  // Check permission
  if (!hasPermission(requiredPermission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
