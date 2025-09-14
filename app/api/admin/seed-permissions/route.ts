import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/prisma';

// Default permissions structure
const DEFAULT_PERMISSIONS = [
  // Dashboard permissions
  { name: 'dashboard.view', category: 'dashboard', description: 'View dashboard' },
  
  // POS permissions
  { name: 'pos.view', category: 'pos', description: 'Access POS system' },
  { name: 'pos.create', category: 'pos', description: 'Create POS transactions' },
  { name: 'pos.edit', category: 'pos', description: 'Edit POS transactions' },
  { name: 'pos.delete', category: 'pos', description: 'Delete POS transactions' },
  
  // Product permissions
  { name: 'products.view', category: 'products', description: 'View products' },
  { name: 'products.create', category: 'products', description: 'Create products' },
  { name: 'products.edit', category: 'products', description: 'Edit products' },
  { name: 'products.delete', category: 'products', description: 'Delete products' },
  
  // Inventory permissions
  { name: 'inventory.view', category: 'inventory', description: 'View inventory' },
  { name: 'inventory.adjust', category: 'inventory', description: 'Adjust inventory' },
  
  // Sales permissions
  { name: 'sales.view', category: 'sales', description: 'View sales' },
  { name: 'sales.create', category: 'sales', description: 'Create sales' },
  { name: 'sales.edit', category: 'sales', description: 'Edit sales' },
  { name: 'sales.delete', category: 'sales', description: 'Delete sales' },
  
  // Purchase permissions
  { name: 'purchases.view', category: 'purchases', description: 'View purchases' },
  { name: 'purchases.create', category: 'purchases', description: 'Create purchases' },
  { name: 'purchases.edit', category: 'purchases', description: 'Edit purchases' },
  { name: 'purchases.delete', category: 'purchases', description: 'Delete purchases' },
  
  // Customer permissions
  { name: 'customers.view', category: 'customers', description: 'View customers' },
  { name: 'customers.create', category: 'customers', description: 'Create customers' },
  { name: 'customers.edit', category: 'customers', description: 'Edit customers' },
  { name: 'customers.delete', category: 'customers', description: 'Delete customers' },
  
  // Supplier permissions
  { name: 'suppliers.view', category: 'suppliers', description: 'View suppliers' },
  { name: 'suppliers.create', category: 'suppliers', description: 'Create suppliers' },
  { name: 'suppliers.edit', category: 'suppliers', description: 'Edit suppliers' },
  { name: 'suppliers.delete', category: 'suppliers', description: 'Delete suppliers' },
  
  // Reports permissions
  { name: 'reports.view', category: 'reports', description: 'View reports' },
  { name: 'reports.export', category: 'reports', description: 'Export reports' },
  
  // Users permissions  
  { name: 'users.view', category: 'users', description: 'View users' },
  { name: 'users.create', category: 'users', description: 'Create users' },
  { name: 'users.edit', category: 'users', description: 'Edit users' },
  { name: 'users.delete', category: 'users', description: 'Delete users' },
  
  // Admin permissions
  { name: 'admin.permissions', category: 'admin', description: 'Manage permissions' },
  { name: 'admin.system', category: 'admin', description: 'System settings' },
  { name: 'admin.users', category: 'admin', description: 'Manage users' },
];

// Default role permissions
const DEFAULT_ROLE_PERMISSIONS = {
  OWNER: [
    'dashboard.view', 'pos.view', 'pos.create', 'pos.edit', 'pos.delete',
    'products.view', 'products.create', 'products.edit', 'products.delete',
    'inventory.view', 'inventory.adjust', 'sales.view', 'sales.create', 'sales.edit', 'sales.delete',
    'purchases.view', 'purchases.create', 'purchases.edit', 'purchases.delete',
    'customers.view', 'customers.create', 'customers.edit', 'customers.delete',
    'suppliers.view', 'suppliers.create', 'suppliers.edit', 'suppliers.delete',
    'reports.view', 'reports.export', 'users.view', 'users.create', 'users.edit', 'users.delete',
    'admin.permissions', 'admin.system', 'admin.users'
  ],
  MANAGER: [
    'dashboard.view', 'pos.view', 'pos.create', 'pos.edit',
    'products.view', 'products.create', 'products.edit',
    'inventory.view', 'inventory.adjust', 'sales.view', 'sales.create', 'sales.edit',
    'purchases.view', 'purchases.create', 'purchases.edit',
    'customers.view', 'customers.create', 'customers.edit',
    'suppliers.view', 'suppliers.create', 'suppliers.edit',
    'reports.view', 'users.view'
  ],
  STAFF: [
    'dashboard.view', 'pos.view', 'pos.create',
    'products.view', 'inventory.view',
    'sales.view', 'sales.create', 'purchases.view',
    'customers.view', 'customers.create', 'suppliers.view'
  ]
};

// POST /api/admin/seed-permissions - Auto-generate permissions data
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Check if permissions already exist
    const existingPermissions = await prisma.permission.count();
    
    if (existingPermissions > 0) {
      return NextResponse.json({ 
        message: 'Permissions already exist',
        count: existingPermissions 
      });
    }

    // Create permissions
    const createdPermissions = [];
    for (const permission of DEFAULT_PERMISSIONS) {
      const created = await prisma.permission.create({
        data: permission
      });
      createdPermissions.push(created);
    }

    // Create role permissions
    const rolePermissionsCreated = [];
    for (const [role, permissionNames] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      for (const permissionName of permissionNames) {
        const permission = await prisma.permission.findUnique({
          where: { name: permissionName }
        });
        
        if (permission) {
          const rolePermission = await prisma.rolePermission.create({
            data: {
              role: role as any,
              permissionId: permission.id
            }
          });
          rolePermissionsCreated.push(rolePermission);
        }
      }
    }

    return NextResponse.json({
      message: 'Permissions seeded successfully',
      permissions: createdPermissions.length,
      rolePermissions: rolePermissionsCreated.length
    });

  } catch (error) {
    console.error('Error seeding permissions:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}