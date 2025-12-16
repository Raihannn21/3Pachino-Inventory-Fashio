import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity-logger';

// GET - Ambil semua customers
export async function GET() {
  try {
    const customers = await prisma.supplier.findMany({
      where: {
        isActive: true
      },
      include: {
        transactions: {
          where: {
            type: 'SALE'
          },
          select: {
            id: true,
            totalAmount: true,
            transactionDate: true
          }
        }
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
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const { name, contact, phone, address } = body;

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
        address,
        isActive: true
      }
    });

    // Log activity
    if (session?.user) {
      await logActivity({
        userId: session.user.id,
        action: 'CREATE',
        resource: 'customers',
        resourceId: customer.id,
        metadata: { customerName: customer.name }
      }, request);
    }

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
