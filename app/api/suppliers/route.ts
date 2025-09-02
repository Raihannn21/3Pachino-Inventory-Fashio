import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Ambil semua customers
export async function GET() {
  try {
    const customers = await prisma.supplier.findMany({
      where: {
        isActive: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json({
      customers
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data customer' },
      { status: 500 }
    );
  }
}

// POST - Buat customer baru
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, contact, phone, email, address } = body;

    // Validasi input
    if (!name) {
      return NextResponse.json(
        { error: 'Nama customer wajib diisi' },
        { status: 400 }
      );
    }

    const customer = await prisma.supplier.create({
      data: {
        name,
        contact,
        phone,
        email,
        address,
        isActive: true
      }
    });

    return NextResponse.json({
      message: 'Customer berhasil ditambahkan',
      customer
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating customer:', error);
    return NextResponse.json(
      { error: 'Gagal menambahkan customer' },
      { status: 500 }
    );
  }
}
