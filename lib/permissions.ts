import { prisma } from '@/lib/prisma';

export async function checkUserPermission(userRole: string, permissionName: string): Promise<boolean> {
  try {
    // Super Admin always has all permissions
    if (userRole === 'SUPER_ADMIN') {
      return true;
    }

    // Check if permission exists and is granted for the role
    const rolePermission = await prisma.rolePermission.findFirst({
      where: {
        role: userRole as any,
        permission: {
          name: permissionName
        },
        granted: true
      }
    });

    return !!rolePermission;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

export async function getUserPermissions(userRole: string): Promise<string[]> {
  try {
    // Super Admin gets all permissions
    if (userRole === 'SUPER_ADMIN') {
      const allPermissions = await prisma.permission.findMany({
        select: { name: true }
      });
      return allPermissions.map(p => p.name);
    }

    // Get permissions for specific role
    const rolePermissions = await prisma.rolePermission.findMany({
      where: {
        role: userRole as any,
        granted: true
      },
      include: {
        permission: {
          select: { name: true }
        }
      }
    });

    return rolePermissions.map(rp => rp.permission.name);
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return [];
  }
}

// Helper to check route-based permissions
export function getPermissionFromRoute(pathname: string): string | null {
  const routePermissions: Record<string, string> = {
    '/dashboard': 'dashboard.view',
    '/pos': 'pos.view',
    '/sales': 'sales.view',
    '/products': 'products.view',
    '/inventory': 'inventory.view',
    '/purchases': 'purchases.view',
    '/customers': 'customers.view',
    '/customers': 'customers.view',
    '/reports': 'reports.view',
    '/users': 'users.view',
    '/permissions': 'admin.permissions'
  };

  // Check for exact match
  if (routePermissions[pathname]) {
    return routePermissions[pathname];
  }

  // Check for partial matches (e.g., /products/123)
  for (const route in routePermissions) {
    if (pathname.startsWith(route)) {
      return routePermissions[route];
    }
  }

  return null;
}
