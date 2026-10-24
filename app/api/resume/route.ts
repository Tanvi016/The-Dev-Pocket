import type { Prisma } from '@prisma/client';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resume = await prisma.resume.findUnique({
      where: { userId },
      select: { data: true, updatedAt: true },
    });

    return NextResponse.json({ resume: resume?.data ?? null, updatedAt: resume?.updatedAt ?? null });
  } catch (error) {
    console.error('Error loading resume:', error);
    return NextResponse.json({ error: 'Failed to load resume' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data: unknown = await request.json();
    if (
      !isObject(data) ||
      !isObject(data.personalInfo) ||
      !Array.isArray(data.education) ||
      !Array.isArray(data.experience) ||
      !Array.isArray(data.skills)
    ) {
      return NextResponse.json({ error: 'Invalid resume data' }, { status: 400 });
    }

    const resume = await prisma.resume.upsert({
      where: { userId },
      create: { userId, data: data as Prisma.InputJsonValue },
      update: { data: data as Prisma.InputJsonValue },
      select: { updatedAt: true },
    });

    return NextResponse.json({ success: true, updatedAt: resume.updatedAt });
  } catch (error) {
    console.error('Error saving resume:', error);
    return NextResponse.json({ error: 'Failed to save resume' }, { status: 500 });
  }
}