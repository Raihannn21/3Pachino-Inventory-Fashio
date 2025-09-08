import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const permissions = await prisma.permission.findMany({
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    });

    return NextResponse.json(permissions);
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    // Seed default permissions
    const defaultPermissions = [
      // Dashboard
      { name: 'dashboard.view', description: 'Lihat Dashboard', category: 'dashboard' },
      { name: 'dashboard.analytics', description: 'Lihat Analytics', category: 'dashboard' },
      
      // POS
      { name: 'pos.view', description: 'Akses POS', category: 'pos' },
      { name: 'pos.create', description: 'Buat Transaksi', category: 'pos' },
      
      // Sales
      { name: 'sales.view', description: 'Lihat Penjualan', category: 'sales' },
      { name: 'sales.create', description: 'Buat Penjualan', category: 'sales' },
      { name: 'sales.edit', description: 'Edit Penjualan', category: 'sales' },
      { name: 'sales.delete', description: 'Hapus Penjualan', category: 'sales' },
      
      // Products
      { name: 'products.view', description: 'Lihat Produk', category: 'products' },
      { name: 'products.create', description: 'Tambah Produk', category: 'products' },
      { name: 'products.edit', description: 'Edit Produk', category: 'products' },
      { name: 'products.delete', description: 'Hapus Produk', category: 'products' },
      
      // Inventory
      { name: 'inventory.view', description: 'Lihat Inventory', category: 'inventory' },
      { name: 'inventory.adjust', description: 'Adjust Stok', category: 'inventory' },
      { name: 'inventory.approve', description: 'Approve Adjustment', category: 'inventory' },
      
      // Purchases
      { name: 'purchases.view', description: 'Lihat Pembelian', category: 'purchases' },
      { name: 'purchases.create', description: 'Buat Pembelian', category: 'purchases' },
      { name: 'purchases.edit', description: 'Edit Pembelian', category: 'purchases' },
      { name: 'purchases.delete', description: 'Hapus Pembelian', category: 'purchases' },
      
      // Suppliers
      { name: 'suppliers.view', description: 'Lihat Supplier', category: 'suppliers' },
      { name: 'suppliers.create', description: 'Tambah Supplier', category: 'suppliers' },
      { name: 'suppliers.edit', description: 'Edit Supplier', category: 'suppliers' },
      { name: 'suppliers.delete', description: 'Hapus Supplier', category: 'suppliers' },
      
      // Customers
      { name: 'customers.view', description: 'Lihat Pelanggan', category: 'customers' },
      { name: 'customers.create', description: 'Tambah Pelanggan', category: 'customers' },
      { name: 'customers.edit', description: 'Edit Pelanggan', category: 'customers' },
      { name: 'customers.delete', description: 'Hapus Pelanggan', category: 'customers' },
      
      // Reports
      { name: 'reports.view', description: 'Lihat Laporan', category: 'reports' },
      { name: 'reports.export', description: 'Export Laporan', category: 'reports' },
      
      // Users
      { name: 'users.view', description: 'Lihat User', category: 'users' },
      { name: 'users.create', description: 'Tambah User', category: 'users' },
      { name: 'users.edit', description: 'Edit User', category: 'users' },
      { name: 'users.delete', description: 'Hapus User', category: 'users' },
      
      // Admin
      { name: 'admin.permissions', description: 'Kelola Hak Akses', category: 'admin' },
      { name: 'admin.system', description: 'Pengaturan System', category: 'admin' },
    ];

    // Create permissions if they don't exist
    for (const permission of defaultPermissions) {
      await prisma.permission.upsert({
        where: { name: permission.name },
        update: permission,
        create: permission,
      });
    }

    return NextResponse.json({ message: 'Permissions seeded successfully' });
  } catch (error) {
    console.error('Error seeding permissions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
