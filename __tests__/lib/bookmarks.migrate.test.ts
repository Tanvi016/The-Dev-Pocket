import { localBookmarks, migrateLocalBookmarksToAccount } from '@/lib/bookmarks';

describe('migrateLocalBookmarksToAccount', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('copies guest bookmarks to the account and clears browser storage after success', async () => {
    const guestBookmark = {
      id: 'guest-1',
      title: 'Docs',
      url: 'https://example.com/docs',
      description: 'Guide',
      category: 'Learning',
      tags: ['docs'],
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem('dev-pocket-bookmarks', JSON.stringify([guestBookmark]));

    const accountBookmark = { ...guestBookmark, id: 'account-1' };
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ bookmarks: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ bookmark: accountBookmark }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ bookmarks: [accountBookmark] }) }) as jest.Mock;

    await expect(migrateLocalBookmarksToAccount()).resolves.toEqual([accountBookmark]);
    expect(global.fetch).toHaveBeenNthCalledWith(2, '/api/bookmarks', expect.objectContaining({ method: 'POST' }));
    expect(localBookmarks.getAll()).toEqual([]);
  });

  it('keeps local bookmarks if migration fails', async () => {
    const guestBookmark = {
      id: 'guest-1',
      title: 'Docs',
      url: 'https://example.com/docs',
      category: 'Learning',
      tags: [],
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem('dev-pocket-bookmarks', JSON.stringify([guestBookmark]));
    global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Unauthorized' }) });

    await expect(migrateLocalBookmarksToAccount()).rejects.toThrow('Failed to fetch bookmarks');
    expect(localBookmarks.getAll()).toEqual([guestBookmark]);
  });
});