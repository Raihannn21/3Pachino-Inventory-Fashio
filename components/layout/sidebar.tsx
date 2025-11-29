'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { usePermissions } from '@/components/providers/permission-provider';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/ui/logo';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Store,
  CreditCard,
  Truck,
  Building2,
  Menu,
  Users,
  Shield,
  LogOut,
  User
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
  { name: 'POS', href: '/pos', icon: CreditCard, permission: 'pos.view' },
  { name: 'Penjualan', href: '/sales', icon: ShoppingCart, permission: 'sales.view' },
  { name: 'Produk', href: '/products', icon: Package, permission: 'products.view' },
  { name: 'Inventory', href: '/inventory', icon: Store, permission: 'inventory.view' },
  { name: 'Produksi', href: '/purchases', icon: Truck, permission: 'purchases.view' },
  { name: 'Customers', href: '/suppliers', icon: Building2, permission: 'suppliers.view' },
  { name: 'Manajemen User', href: '/users', icon: Users, permission: 'users.view' },
  { name: 'Hak Akses', href: '/permissions', icon: Shield, permission: 'admin.permissions' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const { data: session } = useSession();

  const handleCloseMobileMenu = useCallback(() => {
    setIsAnimating(false);
    // Unmount after animation completes
    setTimeout(() => {
      setIsMobileMenuOpen(false);
    }, 300);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    if (isMobileMenuOpen) {
      handleCloseMobileMenu();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  const handleOpenMobileMenu = () => {
    setIsMobileMenuOpen(true);
    // Trigger animation after mount
    setTimeout(() => {
      setIsAnimating(true);
    }, 10);
  };



  const handleLogout = async () => {
    try {
      await signOut({ 
        callbackUrl: '/login',
        redirect: true 
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const UserInfo = ({ onLogout }: { onLogout?: () => void }) => (
    <div className="p-4 border-t bg-gray-50 mt-auto">
      {/* User Info */}
      <div className="flex items-center mb-3">
        <div className="bg-blue-100 rounded-full p-2 mr-3 flex-shrink-0">
          <User className="h-4 w-4 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {session?.user?.name || 'User'}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {session?.user?.email}
          </p>
          <p className="text-xs text-blue-600 font-medium">
            {session?.user?.role}
          </p>
        </div>
      </div>
      
      {/* Logout Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          onLogout?.();
          handleLogout();
        }}
        className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 transition-colors"
      >
        <LogOut className="h-4 w-4 mr-2" />
        Logout
      </Button>
    </div>
  );

  const NavigationItems = ({ onItemClick }: { onItemClick?: () => void }) => {
    const { hasPermission, loading } = usePermissions();

    if (loading) {
      return (
        <div className="px-2 space-y-1">
          <div className="animate-pulse space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 rounded-lg mx-1"></div>
            ))}
          </div>
        </div>
      );
    }

    // Filter navigation items based on permissions
    const filteredNavigation = navigation.filter((item) => {
      if (!item.permission) return true; // No permission required
      return hasPermission(item.permission);
    });

    return (
      <nav className="px-2 space-y-1">
        {filteredNavigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onItemClick}
              className={cn(
                'group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ease-in-out',
                isActive
                  ? 'bg-blue-100 text-blue-900 shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <item.icon
                className={cn(
                  'mr-3 h-5 w-5 flex-shrink-0 transition-colors',
                  isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>
    );
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b px-4 py-3 flex items-center justify-between">
        <Logo size="sidebar" showText={true} linkable={true} usePng={true} />
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (isMobileMenuOpen) {
              handleCloseMobileMenu();
            } else {
              handleOpenMobileMenu();
            }
          }}
          className="p-2"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex flex-col h-full bg-white border-r">
          {/* Header */}
          <div className="p-4 border-b bg-white sticky top-0 z-10">
            <Logo size="sidebar" showText={true} linkable={true} usePng={true} />
          </div>
          
          {/* Navigation Items */}
          <div className="flex-1 overflow-y-auto py-4">
            <NavigationItems />
          </div>
          
          {/* User Info & Logout */}
          <UserInfo />
        </div>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className={cn(
              "fixed inset-0 bg-black transition-opacity duration-300",
              isAnimating ? "bg-opacity-50" : "bg-opacity-0"
            )}
            onClick={handleCloseMobileMenu}
          />
          
          {/* Sidebar */}
          <div className={cn(
            "relative flex flex-col w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out",
            isAnimating ? "translate-x-0" : "-translate-x-full"
          )}>
            {/* Header without Close Button */}
            <div className="p-4 border-b bg-white sticky top-0 z-10">
              <Logo size="sidebar" showText={true} linkable={true} usePng={true} />
            </div>
            
            {/* Navigation Items */}
            <div className="flex-1 overflow-y-auto py-4">
              <NavigationItems onItemClick={handleCloseMobileMenu} />
            </div>
            
            {/* User Info & Logout */}
            <UserInfo onLogout={handleCloseMobileMenu} />
          </div>
        </div>
      )}
    </>
  );
}
