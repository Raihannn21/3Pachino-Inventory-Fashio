import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Get supplier by ID
export async function GET(request: NextRequest, context: { params: any }) {
  const { params } = context;
  try {
    const supplier = await prisma.supplier.findUnique({
      where: {
        id: params.id,
        isActive: true
      },
      include: {
        transactions: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!supplier) {
      return NextResponse.json(
        { error: 'Supplier tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({ supplier });
  } catch (error) {
    console.error('Error fetching supplier:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data supplier' },
      { status: 500 }
    );
  }
}

// PUT - Update supplier
export async function PUT(request: NextRequest, context: { params: any }) {
  const { params } = context;
  try {
    const body = await request.json();
    const { name, contact, phone, email, address } = body;

    // Validasi input
    if (!name) {
      return NextResponse.json(
        { error: 'Nama supplier wajib diisi' },
        { status: 400 }
      );
    }

    // Cek apakah supplier ada
    const existingSupplier = await prisma.supplier.findUnique({
      where: { id: params.id }
    });

    if (!existingSupplier) {
      return NextResponse.json(
        { error: 'Supplier tidak ditemukan' },
        { status: 404 }
      );
    }

    // Update supplier
    const supplier = await prisma.supplier.update({
      where: { id: params.id },
      data: {
        name,
        contact,
        phone,
        email,
        address
      }
    });

    return NextResponse.json({
      message: 'Supplier berhasil diperbarui',
      supplier
    });
  } catch (error) {
    console.error('Error updating supplier:', error);
    return NextResponse.json(
      { error: 'Gagal memperbarui supplier' },
      { status: 500 }
    );
  }
}

// DELETE - Delete supplier (soft delete)
export async function DELETE(request: NextRequest, context: { params: any }) {
  const { params } = context;
  try {
    // Cek apakah supplier ada
    const supplier = await prisma.supplier.findUnique({
      where: { id: params.id },
      include: {
        transactions: true
      }
    });

    if (!supplier) {
      return NextResponse.json(
        { error: 'Supplier tidak ditemukan' },
        { status: 404 }
      );
    }

    // Cek apakah supplier memiliki transactions
    if (supplier.transactions && supplier.transactions.length > 0) {
      return NextResponse.json(
        { 
          error: 'Tidak dapat menghapus supplier yang memiliki riwayat transaksi',
          hasTransactions: true
        },
        { status: 400 }
      );
    }

    // Soft delete supplier
    await prisma.supplier.update({
      where: { id: params.id },
      data: { isActive: false }
    });

    return NextResponse.json({
      message: 'Supplier berhasil dihapus'
    });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    return NextResponse.json(
      { error: 'Gagal menghapus supplier' },
      { status: 500 }
    );
  }
}
