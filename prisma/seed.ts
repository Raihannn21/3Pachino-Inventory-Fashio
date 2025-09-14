import { PrismaClient, Season, Gender } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // Create Categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { name: "Tops" },
      update: {},
      create: {
        name: "Tops",
        description: "T-shirts, blouses, sweaters, etc.",
      },
    }),
    prisma.category.upsert({
      where: { name: "Bottoms" },
      update: {},
      create: {
        name: "Bottoms",
        description: "Pants, jeans, skirts, shorts, etc.",
      },
    }),
    prisma.category.upsert({
      where: { name: "Dresses" },
      update: {},
      create: {
        name: "Dresses",
        description: "Casual, formal, and party dresses",
      },
    }),
    prisma.category.upsert({
      where: { name: "Accessories" },
      update: {},
      create: {
        name: "Accessories",
        description: "Bags, belts, jewelry, etc.",
      },
    }),
  ]);

  // Create Brands
  const brands = await Promise.all([
    prisma.brand.upsert({
      where: { name: "Local Brand" },
      update: {},
      create: { name: "Local Brand" },
    }),
    prisma.brand.upsert({
      where: { name: "Zara" },
      update: {},
      create: { name: "Zara" },
    }),
    prisma.brand.upsert({
      where: { name: "H&M" },
      update: {},
      create: { name: "H&M" },
    }),
    prisma.brand.upsert({
      where: { name: "Uniqlo" },
      update: {},
      create: { name: "Uniqlo" },
    }),
  ]);

  // Create Sizes
  const sizes = await Promise.all([
    prisma.size.upsert({
      where: { name: "XS" },
      update: {},
      create: { name: "XS", sortOrder: 1 },
    }),
    prisma.size.upsert({
      where: { name: "S" },
      update: {},
      create: { name: "S", sortOrder: 2 },
    }),
    prisma.size.upsert({
      where: { name: "M" },
      update: {},
      create: { name: "M", sortOrder: 3 },
    }),
    prisma.size.upsert({
      where: { name: "L" },
      update: {},
      create: { name: "L", sortOrder: 4 },
    }),
    prisma.size.upsert({
      where: { name: "XL" },
      update: {},
      create: { name: "XL", sortOrder: 5 },
    }),
  ]);

  // Create Colors
  const colors = await Promise.all([
    prisma.color.upsert({
      where: { name: "Black" },
      update: {},
      create: { name: "Black", hexCode: "#000000" },
    }),
    prisma.color.upsert({
      where: { name: "White" },
      update: {},
      create: { name: "White", hexCode: "#FFFFFF" },
    }),
    prisma.color.upsert({
      where: { name: "Red" },
      update: {},
      create: { name: "Red", hexCode: "#FF0000" },
    }),
    prisma.color.upsert({
      where: { name: "Blue" },
      update: {},
      create: { name: "Blue", hexCode: "#0000FF" },
    }),
    prisma.color.upsert({
      where: { name: "Navy" },
      update: {},
      create: { name: "Navy", hexCode: "#000080" },
    }),
    prisma.color.upsert({
      where: { name: "Gray" },
      update: {},
      create: { name: "Gray", hexCode: "#808080" },
    }),
  ]);

  // Create Sample Products
  const products = [
    {
      name: "Basic Cotton T-Shirt",
      sku: "TSH001",
      description: "Comfortable cotton t-shirt for everyday wear",
      season: Season.ALL_SEASON,
      gender: Gender.UNISEX,
      categoryId: categories[0].id, // Tops
      brandId: brands[0].id, // Local Brand
      costPrice: 50000,
      sellingPrice: 85000,
    },
    {
      name: "Slim Fit Jeans",
      sku: "JNS001",
      description: "Classic blue denim jeans with slim fit",
      season: Season.ALL_SEASON,
      gender: Gender.UNISEX,
      categoryId: categories[1].id, // Bottoms
      brandId: brands[1].id, // Zara
      costPrice: 120000,
      sellingPrice: 199000,
    },
    {
      name: "Summer Floral Dress",
      sku: "DRS001",
      description: "Light and breezy floral dress perfect for summer",
      season: Season.SPRING_SUMMER,
      gender: Gender.FEMALE,
      categoryId: categories[2].id, // Dresses
      brandId: brands[2].id, // H&M
      costPrice: 80000,
      sellingPrice: 149000,
    },
  ];

  for (const productData of products) {
    const product = await prisma.product.create({
      data: productData,
    });

    // Create variants for each product
    const colorSubset = colors.slice(0, 3); // First 3 colors
    const sizeSubset = sizes.slice(1, 4); // S, M, L

    for (const color of colorSubset) {
      for (const size of sizeSubset) {
        await prisma.productVariant.create({
          data: {
            productId: product.id,
            sizeId: size.id,
            colorId: color.id,
            stock: Math.floor(Math.random() * 20) + 5, // Random stock between 5-24
            minStock: 5,
            barcode: `${product.sku}-${size.name}-${color.name}`,
          },
        });
      }
    }
  }

  // Seed Permissions
  console.log("🔐 Seeding permissions...");
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

  const permissions = await Promise.all(
    defaultPermissions.map((permission) =>
      prisma.permission.upsert({
        where: { name: permission.name },
        update: permission,
        create: permission,
      })
    )
  );

  // Seed Default Role Permissions
  console.log("🎭 Seeding role permissions...");

  // Owner permissions (almost all)
  const ownerPermissions = permissions.filter(p => 
    !p.name.includes('admin.') // Owner tidak termasuk admin permissions
  );

  // Manager permissions (operational)
  const managerPermissions = permissions.filter(p => 
    p.name.includes('dashboard.') ||
    p.name.includes('pos.') ||
    p.name.includes('sales.') ||
    p.name.includes('products.view') ||
    p.name.includes('products.edit') ||
    p.name.includes('inventory.view') ||
    p.name.includes('inventory.adjust') ||
    p.name.includes('purchases.') ||
    p.name.includes('suppliers.') ||
    p.name.includes('customers.') ||
    p.name.includes('reports.view')
  );

  // Staff permissions (limited)
  const staffPermissions = permissions.filter(p => 
    p.name.includes('dashboard.view') ||
    p.name.includes('pos.') ||
    p.name.includes('sales.view') ||
    p.name.includes('sales.create') ||
    p.name.includes('products.view') ||
    p.name.includes('inventory.view') ||
    p.name.includes('customers.view') ||
    p.name.includes('customers.create')
  );

  // Create role permissions
  const rolePermissionData = [
    ...ownerPermissions.map(p => ({ role: 'OWNER', permissionId: p.id, granted: true })),
    ...managerPermissions.map(p => ({ role: 'MANAGER', permissionId: p.id, granted: true })),
    ...staffPermissions.map(p => ({ role: 'STAFF', permissionId: p.id, granted: true })),
  ];

  await Promise.all(
    rolePermissionData.map(rp =>
      prisma.rolePermission.upsert({
        where: {
          role_permissionId: {
            role: rp.role as any,
            permissionId: rp.permissionId
          }
        },
        update: { granted: rp.granted },
        create: rp as any,
      })
    )
  );

  console.log("✅ Seed completed successfully!");
  console.log(`📦 Created ${categories.length} categories`);
  console.log(`🏷️ Created ${brands.length} brands`);
  console.log(`📏 Created ${sizes.length} sizes`);
  console.log(`🎨 Created ${colors.length} colors`);
  console.log(`👕 Created ${products.length} products`);
  console.log(`🔐 Created ${permissions.length} permissions`);
  console.log(`🎭 Created role permissions for 3 roles`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
