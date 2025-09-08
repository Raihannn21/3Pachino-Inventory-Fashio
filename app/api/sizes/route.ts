import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const sizes = await prisma.size.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(sizes);
  } catch (error) {
    console.error('Error fetching sizes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sizes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Size name is required' },
        { status: 400 }
      );
    }

    // Check if size already exists
    const existingSize = await prisma.size.findFirst({
      where: { 
        name: name.trim(),
        isActive: true 
      },
    });

    if (existingSize) {
      return NextResponse.json(
        { error: 'Size already exists' },
        { status: 400 }
      );
    }

    // Get the highest sort order and add 1
    const lastSize = await prisma.size.findFirst({
      orderBy: { sortOrder: 'desc' },
    });

    const sortOrder = (lastSize?.sortOrder || 0) + 1;

    const size = await prisma.size.create({
      data: {
        name: name.trim(),
        sortOrder,
        isActive: true,
      },
    });

    return NextResponse.json(size, { status: 201 });
  } catch (error) {
    console.error('Error creating size:', error);
    return NextResponse.json(
      { error: 'Failed to create size' },
      { status: 500 }
    );
  }
}
