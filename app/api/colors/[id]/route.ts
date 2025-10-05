import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if color exists
    const existingColor = await prisma.color.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            productVariants: true
          }
        }
      }
    });

    if (!existingColor) {
      return NextResponse.json(
        { error: 'Warna tidak ditemukan' },
        { status: 404 }
      );
    }

    // Check if color is being used by any variants
    if (existingColor._count.productVariants > 0) {
      return NextResponse.json(
        { error: 'Tidak dapat menghapus warna karena sedang digunakan oleh varian produk' },
        { status: 400 }
      );
    }

    // Soft delete by setting isActive to false
    await prisma.color.update({
      where: { id },
      data: { isActive: false }
    });

    return NextResponse.json({ 
      message: 'Warna berhasil dihapus',
      id 
    });
  } catch (error) {
    console.error('Error deleting color:', error);
    return NextResponse.json(
      { error: 'Gagal menghapus warna' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, hexCode } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Nama warna wajib diisi' },
        { status: 400 }
      );
    }

    // Check if color exists
    const existingColor = await prisma.color.findUnique({
      where: { id }
    });

    if (!existingColor) {
      return NextResponse.json(
        { error: 'Warna tidak ditemukan' },
        { status: 404 }
      );
    }

    // Check if another color with the same name exists
    const duplicateColor = await prisma.color.findFirst({
      where: { 
        name: name.trim(),
        isActive: true,
        NOT: { id }
      },
    });

    if (duplicateColor) {
      return NextResponse.json(
        { error: 'Warna dengan nama tersebut sudah ada' },
        { status: 400 }
      );
    }

    const updateData: any = {
      name: name.trim(),
    };

    // Add hex code if provided
    if (hexCode && hexCode.trim() !== '') {
      updateData.hexCode = hexCode.trim();
    } else {
      updateData.hexCode = null;
    }

    const updatedColor = await prisma.color.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedColor);
  } catch (error) {
    console.error('Error updating color:', error);
    return NextResponse.json(
      { error: 'Gagal mengupdate warna' },
      { status: 500 }
    );
  }
}