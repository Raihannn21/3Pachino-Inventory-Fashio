import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    console.log('🌱 Mulai seeding database...');

    // 1. Buat user default
    let defaultUser = await prisma.user.findFirst({
      where: { email: 'admin@kelola-inventory.com' }
    });

    if (!defaultUser) {
      defaultUser = await prisma.user.create({
        data: {
          email: 'admin@kelola-inventory.com',
          name: 'Administrator',
          password: 'admin123', // TODO: Hash this in production
          role: 'OWNER'
        }
      });
      console.log('✅ User default dibuat');
    } else {
      console.log('✅ User default sudah ada');
    }

    // 2. Buat categories jika belum ada
    const categoryCount = await prisma.category.count();
    if (categoryCount === 0) {
      await prisma.category.createMany({
        data: [
          { name: 'Kaos', description: 'Kaos dan T-Shirt' },
          { name: 'Kemeja', description: 'Kemeja formal dan casual' },
          { name: 'Celana', description: 'Celana panjang dan pendek' },
          { name: 'Jaket', description: 'Jaket dan outerwear' },
          { name: 'Dress', description: 'Dress dan gaun' },
          { name: 'Aksesoris', description: 'Aksesoris fashion' }
        ]
      });
      console.log('✅ Categories dibuat');
    } else {
      console.log('✅ Categories sudah ada');
    }

    // 3. Buat brands jika belum ada
    const brandCount = await prisma.brand.count();
    if (brandCount === 0) {
      await prisma.brand.createMany({
        data: [
          { name: 'Nike' },
          { name: 'Adidas' },
          { name: 'Uniqlo' },
          { name: 'H&M' },
          { name: 'Zara' },
          { name: 'Local Brand' }
        ]
      });
      console.log('✅ Brands dibuat');
    } else {
      console.log('✅ Brands sudah ada');
    }

    // 4. Buat sizes jika belum ada
    const sizeCount = await prisma.size.count();
    if (sizeCount === 0) {
      await prisma.size.createMany({
        data: [
          { name: 'XS', sortOrder: 1 },
          { name: 'S', sortOrder: 2 },
          { name: 'M', sortOrder: 3 },
          { name: 'L', sortOrder: 4 },
          { name: 'XL', sortOrder: 5 },
          { name: 'XXL', sortOrder: 6 }
        ]
      });
      console.log('✅ Sizes dibuat');
    } else {
      console.log('✅ Sizes sudah ada');
    }

    // 5. Buat colors jika belum ada
    const colorCount = await prisma.color.count();
    if (colorCount === 0) {
      await prisma.color.createMany({
        data: [
          { name: 'Hitam', hexCode: '#000000' },
          { name: 'Putih', hexCode: '#FFFFFF' },
          { name: 'Merah', hexCode: '#FF0000' },
          { name: 'Biru', hexCode: '#0000FF' },
          { name: 'Hijau', hexCode: '#00FF00' },
          { name: 'Kuning', hexCode: '#FFFF00' },
          { name: 'Abu-abu', hexCode: '#808080' },
          { name: 'Navy', hexCode: '#000080' }
        ]
      });
      console.log('✅ Colors dibuat');
    } else {
      console.log('✅ Colors sudah ada');
    }

    // 6. Buat customer default jika belum ada
    const customerCount = await prisma.supplier.count();
    if (customerCount === 0) {
      await prisma.supplier.createMany({
        data: [
          {
            name: 'Walk-in Customer',
            contact: 'Anonymous',
            phone: '-',
            email: '-',
            address: '-'
          },
          {
            name: 'John Doe',
            contact: 'John Doe',
            phone: '081234567890',
            email: 'john@example.com',
            address: 'Jakarta Selatan'
          },
          {
            name: 'Jane Smith',
            contact: 'Jane Smith',
            phone: '081234567891',
            email: 'jane@example.com',
            address: 'Jakarta Pusat'
          }
        ]
      });
      console.log('✅ Sample customers dibuat');
    } else {
      console.log('✅ Customers sudah ada');
    }

    console.log('🎉 Database seeding completed!');

    return NextResponse.json({
      message: 'Database berhasil di-seed dengan data dasar',
      success: true,
      data: {
        userCreated: !!defaultUser,
        categoriesCount: await prisma.category.count(),
        brandsCount: await prisma.brand.count(),
        sizesCount: await prisma.size.count(),
        colorsCount: await prisma.color.count(),
        customersCount: await prisma.supplier.count()
      }
    });

  } catch (error) {
    console.error('Error seeding database:', error);
    return NextResponse.json(
      { 
        error: 'Gagal seed database', 
        details: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      },
      { status: 500 }
    );
  }
}
