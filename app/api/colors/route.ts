import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const colors = await prisma.color.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(colors);
  } catch (error) {
    console.error('Error fetching colors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch colors' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, hexCode } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Color name is required' },
        { status: 400 }
      );
    }

    // Check if color already exists
    const existingColor = await prisma.color.findFirst({
      where: { 
        name: name.trim(),
        isActive: true 
      },
    });

    if (existingColor) {
      return NextResponse.json(
        { error: 'Color already exists' },
        { status: 400 }
      );
    }

    const colorData: any = {
      name: name.trim(),
      isActive: true,
    };

    // Add hex code if provided
    if (hexCode && hexCode.trim() !== '') {
      colorData.hexCode = hexCode.trim();
    }

    const color = await prisma.color.create({
      data: colorData,
    });

    return NextResponse.json(color, { status: 201 });
  } catch (error) {
    console.error('Error creating color:', error);
    return NextResponse.json(
      { error: 'Failed to create color' },
      { status: 500 }
    );
  }
}
