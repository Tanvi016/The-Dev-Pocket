import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { GET, PUT } from '@/app/api/resume/route';

jest.mock('@clerk/nextjs/server', () => ({ auth: jest.fn() }));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    resume: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

const mockAuth = auth as unknown as jest.Mock;
const mockFindUnique = prisma.resume.findUnique as jest.Mock;
const mockUpsert = prisma.resume.upsert as jest.Mock;

describe('/api/resume', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects unauthenticated reads', async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const response = await GET();

    expect(response.status).toBe(401);
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it('returns only the signed-in user resume', async () => {
    mockAuth.mockResolvedValue({ userId: 'user_123' });
    mockFindUnique.mockResolvedValue({ data: { personalInfo: { fullName: 'A User' } }, updatedAt: new Date() });

    const response = await GET();

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { userId: 'user_123' },
      select: { data: true, updatedAt: true },
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      resume: { personalInfo: { fullName: 'A User' } },
    });
  });

  it('upserts the resume using the Clerk user ID', async () => {
    mockAuth.mockResolvedValue({ userId: 'user_123' });
    mockUpsert.mockResolvedValue({ updatedAt: new Date() });
    const resume = {
      personalInfo: { fullName: 'A User' },
      education: [],
      experience: [],
      skills: [],
    };

    const response = await PUT(new Request('http://localhost/api/resume', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(resume),
    }));

    expect(mockUpsert).toHaveBeenCalledWith({
      where: { userId: 'user_123' },
      create: { userId: 'user_123', data: resume },
      update: { data: resume },
      select: { updatedAt: true },
    });
    expect(response.status).toBe(200);
  });
});