"use client";

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import {
  Search,
  Filter,
  ExternalLink,
  Trash2,
  Plus,
  Tag,
  Download,
  FolderPlus,
  Folder,
  Layers,
  Sparkles
} from 'lucide-react';
import { localBookmarks, apiBookmarks, categories, migrateLocalBookmarksToAccount, type Bookmark } from '@/lib/bookmarks';
import { showSuccess, showError } from '@/lib/toast';

export default function BookmarksPage() {
  const { isLoaded, isSignedIn } = useUser();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [filteredBookmarks, setFilteredBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [showNewCollectionModal, setShowNewCollectionModal] = useState(false);
  const [customCollections, setCustomCollections] = useState<string[]>([]);

  useEffect(() => {
    // Load custom collections from localStorage
    try {
      const stored = localStorage.getItem('dev-pocket-bookmark-collections');
      if (stored) {
        setCustomCollections(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    if (isLoaded) void loadBookmarks();
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    filterBookmarks();
  }, [bookmarks, searchQuery, selectedCategory]);

  const loadBookmarks = async () => {
    try {
      setLoading(true);
      let data: Bookmark[];

      if (isSignedIn) {
        data = await migrateLocalBookmarksToAccount();
      } else {
        data = localBookmarks.getAll();
      }

      setBookmarks(data);
    } catch (error) {
      showError('Failed to load bookmarks');
    } finally {
      setLoading(false);
    }
  };

  const filterBookmarks = () => {
    let filtered = bookmarks;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(b => b.category.toLowerCase() === selectedCategory.toLowerCase());
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(b =>
        b.title.toLowerCase().includes(query) ||
        b.description?.toLowerCase().includes(query) ||
        (Array.isArray(b.tags) && b.tags.some(tag => tag.toLowerCase().includes(query)))
      );
    }

    setFilteredBookmarks(filtered);
  };

  const handleDelete = async (id: string) => {
    try {
      if (isSignedIn) {
        await apiBookmarks.remove(id);
      } else {
        localBookmarks.remove(id);
      }

      setBookmarks(prev => prev.filter(b => b.id !== id));
      showSuccess('Bookmark deleted');
    } catch (error) {
      showError('Failed to delete bookmark');
    }
  };

  const handleAdd = async (formData: FormData) => {
    try {
      const tagsRaw = formData.get('tags') as string;
      const tags = tagsRaw
        ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean)
        : [];

      const bookmarkData = {
        title: formData.get('title') as string,
        url: formData.get('url') as string,
        description: (formData.get('description') as string) || undefined,
        category: (formData.get('category') as string) || 'General',
        tags,
      };

      let newBookmark: Bookmark;

      if (isSignedIn) {
        newBookmark = await apiBookmarks.add(bookmarkData);
      } else {
        newBookmark = localBookmarks.add(bookmarkData);
      }

      setBookmarks(prev => [newBookmark, ...prev]);
      setShowAddForm(false);
      showSuccess('Bookmark added successfully! ⭐');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add bookmark';
      showError(message);
    }
  };

  // Export Bookmarks to JSON
  const handleExport = () => {
    try {
      if (bookmarks.length === 0) {
        showError('No bookmarks to export');
        return;
      }
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(bookmarks, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `dev-pocket-bookmarks-${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showSuccess('Bookmarks exported successfully! 📁');
    } catch (err) {
      showError('Failed to export bookmarks');
    }
  };

  // Create custom collection/folder
  const handleCreateCollection = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCollectionName.trim();
    if (!trimmed) return;
    if (customCollections.includes(trimmed) || categories.includes(trimmed as any)) {
      showError('Collection or category already exists');
      return;
    }
    const updated = [...customCollections, trimmed];
    setCustomCollections(updated);
    try {
      localStorage.setItem('dev-pocket-bookmark-collections', JSON.stringify(updated));
    } catch (e) {}
    setNewCollectionName('');
    setShowNewCollectionModal(false);
    showSuccess(`Collection "${trimmed}" created!`);
  };

  const allAvailableCollections = Array.from(new Set([...categories, ...customCollections]));

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto py-8">
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse w-1/3"></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-44 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-8 rounded-3xl text-white shadow-lg">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            <span>Saved Learning & Tools</span>
          </div>
          <h1 className="text-3xl font-extrabold">My Bookmarks & Collections</h1>
          <p className="text-blue-100 mt-1">
            Organize, categorize, and export your favorite articles, tutorials, and repositories.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => setShowNewCollectionModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-sm font-medium transition-all"
          >
            <FolderPlus className="w-4 h-4" />
            New Collection
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-sm font-medium transition-all"
          >
            <Download className="w-4 h-4" />
            Export JSON
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-blue-700 hover:bg-blue-50 rounded-xl text-sm font-bold shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Bookmark
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search bookmarks by title, URL or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="pl-10 pr-8 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none cursor-pointer"
          >
            <option value="all">All Collections & Categories</option>
            {allAvailableCollections.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Collections Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
            selectedCategory === 'all'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          All ({bookmarks.length})
        </button>
        {allAvailableCollections.map((col) => {
          const count = bookmarks.filter(b => b.category.toLowerCase() === col.toLowerCase()).length;
          return (
            <button
              key={col}
              onClick={() => setSelectedCategory(col)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory.toLowerCase() === col.toLowerCase()
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              <Folder className="w-3.5 h-3.5" />
              {col} ({count})
            </button>
          );
        })}
      </div>

      {/* Bookmarks Grid */}
      {filteredBookmarks.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Tag className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            {bookmarks.length === 0 ? 'No bookmarks saved yet' : 'No matching bookmarks found'}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6 text-sm">
            {bookmarks.length === 0
              ? 'Click "Add Bookmark" above or tap the bookmark button on any resource in the Library to save it.'
              : 'Try clearing your search query or selecting a different collection.'}
          </p>
          {bookmarks.length === 0 ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              Add First Bookmark
            </button>
          ) : (
            <button
              onClick={() => { setSelectedCategory('all'); setSearchQuery(''); }}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredBookmarks.map((bookmark) => (
            <div
              key={bookmark.id}
              className="flex flex-col justify-between bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-blue-600 transition-colors text-base">
                      {bookmark.title}
                    </h3>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {(() => {
                        try {
                          return new URL(bookmark.url).hostname;
                        } catch {
                          return bookmark.url;
                        }
                      })()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <a
                      href={bookmark.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
                      title="Open link"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => handleDelete(bookmark.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-slate-800 transition-colors"
                      title="Delete bookmark"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {bookmark.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 line-clamp-2 leading-relaxed">
                    {bookmark.description}
                  </p>
                )}

                {bookmark.tags && bookmark.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {bookmark.tags.map((t) => (
                      <span
                        key={t}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                  <Folder className="w-3 h-3" />
                  {bookmark.category}
                </span>
                <span className="text-[11px] text-slate-400">
                  {new Date(bookmark.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Bookmark Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 text-slate-900 dark:text-slate-100">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAdd(new FormData(e.currentTarget));
              }}
              className="space-y-4"
            >
              <h2 className="text-xl font-bold">Add New Bookmark</h2>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Title *
                </label>
                <input
                  name="title"
                  type="text"
                  required
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. Modern CSS Tricks"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  URL *
                </label>
                <input
                  name="url"
                  type="url"
                  required
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="https://example.com/guide"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Collection / Category
                </label>
                <select
                  name="category"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                >
                  {allAvailableCollections.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  name="tags"
                  type="text"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="css, webdev, styling"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  rows={2}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Brief summary..."
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Save Bookmark
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Collection Modal */}
      {showNewCollectionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-slate-900 dark:text-slate-100">
            <form onSubmit={handleCreateCollection} className="space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-blue-600" />
                Create Collection
              </h2>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Collection Name
                </label>
                <input
                  type="text"
                  required
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="e.g. Next.js Architecture"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewCollectionModal(false)}
                  className="flex-1 py-2 text-sm font-medium bg-slate-100 dark:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}