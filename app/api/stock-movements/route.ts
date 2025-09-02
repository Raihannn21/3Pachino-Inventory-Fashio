import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Ambil stock movements history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const variantId = searchParams.get('variantId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    
    const skip = (page - 1) * limit;
    
    let whereClause: any = {};
    if (variantId) {
      whereClause.variantId = variantId;
    }

    // Ambil stock movements dengan detail variant dan product
    const movements = await prisma.stockMovement.findMany({
      where: whereClause,
      include: {
        variant: {
          include: {
            product: {
              include: {
                category: true,
                brand: true
              }
            },
            size: true,
            color: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: skip
    });

    // Hitung total records untuk pagination
    const totalRecords = await prisma.stockMovement.count({
      where: whereClause
    });

    const totalPages = Math.ceil(totalRecords / limit);

    // Format data untuk response
    const formattedMovements = movements.map(movement => ({
      id: movement.id,
      type: movement.type,
      quantity: movement.quantity,
      reason: movement.reason,
      reference: movement.reference,
      createdAt: movement.createdAt,
      createdBy: movement.createdBy,
      variant: {
        id: movement.variant.id,
        product: movement.variant.product,
        size: movement.variant.size,
        color: movement.variant.color,
        currentStock: movement.variant.stock
      }
    }));

    return NextResponse.json({
      movements: formattedMovements,
      pagination: {
        currentPage: page,
        totalPages,
        totalRecords,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching stock movements:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data stock movements' },
      { status: 500 }
    );
  }
}
