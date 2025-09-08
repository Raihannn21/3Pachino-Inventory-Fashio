"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface UsePermissionOptions {
  redirectTo?: string;
  showUnauthorized?: boolean;
}

export function usePermission(requiredPermission: string, options: UsePermissionOptions = {}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkPermission() {
      if (status === 'loading') return;
      
      if (!session) {
        setHasPermission(false);
        setIsLoading(false);
        router.push('/login');
        return;
      }

      try {
        // Super Admin always has permission
        if (session.user.role === 'SUPER_ADMIN') {
          setHasPermission(true);
          setIsLoading(false);
          return;
        }

        // Check user permissions
        const response = await fetch('/api/user/permissions');
        const data = await response.json();

        if (response.ok && data.permissions) {
          const userHasPermission = data.permissions.includes(requiredPermission);
          setHasPermission(userHasPermission);

          if (!userHasPermission) {
            if (options.redirectTo) {
              router.push(options.redirectTo);
            } else if (options.showUnauthorized !== false) {
              router.push('/unauthorized');
            }
          }
        } else {
          setHasPermission(false);
          if (options.showUnauthorized !== false) {
            router.push('/unauthorized');
          }
        }
      } catch (error) {
        console.error('Error checking permission:', error);
        setHasPermission(false);
        if (options.showUnauthorized !== false) {
          router.push('/unauthorized');
        }
      } finally {
        setIsLoading(false);
      }
    }

    checkPermission();
  }, [session, status, requiredPermission, router, options.redirectTo, options.showUnauthorized]);

  return { hasPermission, isLoading };
}

export function useUserPermissions() {
  const { data: session } = useSession();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchPermissions() {
      if (!session) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/user/permissions');
        const data = await response.json();

        if (response.ok && data.permissions) {
          setPermissions(data.permissions);
        }
      } catch (error) {
        console.error('Error fetching permissions:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPermissions();
  }, [session]);

  const hasPermission = (permission: string) => {
    if (session?.user.role === 'SUPER_ADMIN') return true;
    return permissions.includes(permission);
  };

  return { permissions, hasPermission, isLoading };
}
