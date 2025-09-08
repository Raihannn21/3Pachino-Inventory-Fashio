"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

interface PermissionContextType {
  hasPermission: (permission: string) => boolean;
  permissions: string[];
  loading: boolean;
}

const PermissionContext = createContext<PermissionContextType>({
  hasPermission: () => false,
  permissions: [],
  loading: true,
});

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserPermissions() {
      if (status === 'loading') return;
      
      if (!session) {
        setPermissions([]);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/user-permissions');
        if (response.ok) {
          const userPermissions = await response.json();
          setPermissions(userPermissions);
        } else {
          console.error('Failed to fetch permissions');
          setPermissions([]);
        }
      } catch (error) {
        console.error('Error fetching permissions:', error);
        setPermissions([]);
      } finally {
        setLoading(false);
      }
    }

    fetchUserPermissions();
  }, [session, status]);

  const hasPermission = (permission: string): boolean => {
    if (!session) return false;
    
    // Super Admin has all permissions
    if (session.user.role === 'SUPER_ADMIN') return true;
    
    return permissions.includes(permission);
  };

  return (
    <PermissionContext.Provider value={{ hasPermission, permissions, loading }}>
      {children}
    </PermissionContext.Provider>
  );
}

export const usePermissions = () => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
};
