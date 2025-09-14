"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { Shield, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
}

// Route to permission mapping
const ROUTE_PERMISSIONS: Record<string, string> = {
  '/dashboard': 'dashboard.view',
  '/pos': 'pos.view',
  '/sales': 'sales.view',
  '/products': 'products.view',
  '/inventory': 'inventory.view',
  '/purchases': 'purchases.view',
  '/suppliers': 'suppliers.view',
  '/customers': 'customers.view',
  '/reports': 'reports.view',
  '/users': 'users.view',
  '/permissions': 'admin.permissions'
};

export default function ProtectedRoute({ children, requiredPermission }: ProtectedRouteProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const checkPermissions = async () => {
      if (status === 'loading') return;
      
      if (!session) {
        router.push('/login');
        return;
      }

      try {
        const response = await fetch('/api/user/permissions');
        const data = await response.json();

        if (response.ok) {
          const permissions = data.permissions || [];
          setUserPermissions(permissions);

          // Determine required permission
          let permissionToCheck = requiredPermission;
          
          if (!permissionToCheck) {
            // Auto-detect permission based on current route
            permissionToCheck = ROUTE_PERMISSIONS[pathname];
            
            // For nested routes, check parent route
            if (!permissionToCheck) {
              const parentRoute = Object.keys(ROUTE_PERMISSIONS).find(route => 
                pathname.startsWith(route) && route !== '/'
              );
              if (parentRoute) {
                permissionToCheck = ROUTE_PERMISSIONS[parentRoute];
              }
            }
          }

          // Debug logging
          console.log('Debug Permission Check:', {
            userRole: session.user.role,
            pathname,
            permissionToCheck,
            permissions,
            isSuperAdmin: session.user.role === 'SUPER_ADMIN'
          });

          // Super Admin has access to everything
          if (session.user.role === 'SUPER_ADMIN') {
            console.log('SUPER_ADMIN detected, granting access');
            setHasAccess(true);
          } else if (permissionToCheck) {
            // Check if user has required permission
            setHasAccess(permissions.includes(permissionToCheck));
          } else {
            // No specific permission required, allow access
            setHasAccess(true);
          }
        } else {
          console.error('Failed to fetch permissions:', data);
          setHasAccess(false);
        }
      } catch (error) {
        console.error('Error checking permissions:', error);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkPermissions();
  }, [session, status, pathname, requiredPermission, router]);

  // Loading state
  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Memeriksa akses...</p>
        </div>
      </div>
    );
  }

  // No access - show unauthorized page
  if (!hasAccess) {
    const requiredPerm = requiredPermission || ROUTE_PERMISSIONS[pathname];
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-xl font-semibold text-gray-900">
              Akses Ditolak
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Anda tidak memiliki izin untuk mengakses halaman ini.
            </p>
            
            {requiredPerm && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">
                  <strong>Permission diperlukan:</strong> {requiredPerm}
                </p>
              </div>
            )}

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-sm text-orange-800">
                Hubungi administrator untuk mendapatkan akses ke halaman ini.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={() => router.back()}
                variant="outline"
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Kembali
              </Button>
              <Button
                onClick={() => findAccessibleRoute()}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <Home className="h-4 w-4 mr-2" />
                Halaman Utama
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Has access - render children
  return <>{children}</>;

  // Helper function to find accessible route
  function findAccessibleRoute() {
    // Check permissions and redirect to first accessible route
    if (userPermissions.includes('dashboard.view')) {
      router.push('/dashboard');
    } else if (userPermissions.includes('pos.view')) {
      router.push('/pos');
    } else if (userPermissions.includes('sales.view')) {
      router.push('/sales');
    } else if (userPermissions.includes('products.view')) {
      router.push('/products');
    } else {
      // Fallback to login if no permissions
      router.push('/login');
    }
  }
}
