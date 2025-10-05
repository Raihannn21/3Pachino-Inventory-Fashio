import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if size is being used by any variants
    const existingVariants = await prisma.productVariant.findMany({
      where: { sizeId: id }
    });

    if (existingVariants.length > 0) {
      return NextResponse.json(
        { error: `Ukuran tidak dapat dihapus karena sedang digunakan oleh ${existingVariants.length} varian produk` },
        { status: 400 }
      );
    }

    // Delete the size
    await prisma.size.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Ukuran berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting size:', error);
    return NextResponse.json(
      { error: 'Gagal menghapus ukuran' },
      { status: 500 }
    );
  }
}