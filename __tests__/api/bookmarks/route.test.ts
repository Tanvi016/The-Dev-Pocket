import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { POST } from '@/app/api/bookmarks/route';

jest.mock('@clerk/nextjs/server', () => ({ auth: jest.fn() }));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { upsert: jest.fn() },
    bookmark: { create: jest.fn() },
  },
}));

const mockAuth = auth as unknown as jest.Mock;
const mockUserUpsert = prisma.user.upsert as jest.Mock;
const mockBookmarkCreate = prisma.bookmark.create as jest.Mock;

describe('POST /api/bookmarks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user_123' });
    mockUserUpsert.mockResolvedValue({ id: 'user_123' });
    mockBookmarkCreate.mockResolvedValue({ id: 'bookmark_123' });
  });

  it('creates the user row before saving the bookmark', async () => {
    const request = new Request('http://localhost/api/bookmarks', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Docs', url: 'https://example.com' }),
    });

    const response = await POST(request as never);

    expect(mockUserUpsert).toHaveBeenCalledWith({
      where: { id: 'user_123' },
      create: { id: 'user_123', email: null },
      update: {},
    });
    expect(mockBookmarkCreate).toHaveBeenCalledWith({
      data: {
        userId: 'user_123',
        title: 'Docs',
        url: 'https://example.com',
        description: undefined,
        category: 'General',
        tags: [],
      },
    });
    expect(response.status).toBe(201);
  });
});