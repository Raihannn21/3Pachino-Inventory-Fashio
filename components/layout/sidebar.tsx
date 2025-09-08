'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/ui/logo';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Settings,
  Store,
  CreditCard,
  Truck,
  Building2,
  Menu
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'POS', href: '/pos', icon: CreditCard },
  { name: 'Penjualan', href: '/sales', icon: ShoppingCart },
  { name: 'Produk', href: '/products', icon: Package },
  { name: 'Inventory', href: '/inventory', icon: Store },
  { name: 'Produksi', href: '/purchases', icon: Truck },
  { name: 'Customers', href: '/suppliers', icon: Building2 },
  { name: 'Pengaturan', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Close mobile menu when route changes
  useEffect(() => {
    if (isMobileMenuOpen) {
      handleCloseMobileMenu();
    }
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

  const handleCloseMobileMenu = () => {
    setIsAnimating(false);
    // Unmount after animation completes
    setTimeout(() => {
      setIsMobileMenuOpen(false);
    }, 300);
  };

  const NavigationItems = ({ onItemClick }: { onItemClick?: () => void }) => (
    <nav className="flex-1 px-2 space-y-1">
      {navigation.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={onItemClick}
            className={cn(
              'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors',
              isActive
                ? 'bg-blue-100 text-blue-900'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )}
          >
            <item.icon
              className={cn(
                'mr-3 h-5 w-5 flex-shrink-0',
                isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'
              )}
            />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b px-4 py-3 flex items-center justify-between">
        <Logo size="sidebar" showText={true} linkable={true} usePng={true} />
        <Button
          variant="ghost"
          size="sm"
          onClick={isMobileMenuOpen ? handleCloseMobileMenu : handleOpenMobileMenu}
          className="p-2"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex flex-col flex-grow pt-5 bg-white overflow-y-auto border-r">
          <div className="flex items-center flex-shrink-0 px-4 mb-6">
            <Logo size="sidebar" showText={true} linkable={true} usePng={true} />
          </div>
          <div className="mt-8 flex-grow flex flex-col">
            <NavigationItems />
          </div>
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
          </div>
        </div>
      )}
    </>
  );
}
