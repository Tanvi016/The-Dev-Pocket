'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Search, ExternalLink, Clock, Star, Bookmark, BookmarkCheck, Plus, Sparkles, Filter, Layers, BookOpen } from 'lucide-react';
import { showSuccess, showError } from '@/lib/toast';
import { localBookmarks, apiBookmarks, migrateLocalBookmarksToAccount } from '@/lib/bookmarks';
import { useUser } from '@clerk/nextjs';

interface Resource {
  id: string;
  title: string;
  description: string | null;
  url: string;
  category: string;
  tags: string[] | null;
  author: string | null;
  difficulty: string | null;
  readingTime: number | null;
  rating: number | null;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function ResourcesPage() {
  const { isLoaded, isSignedIn } = useUser();
  const [resources, setResources] = useState<Resource[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [page, setPage] = useState(1);
  const [bookmarkedUrls, setBookmarkedUrls] = useState<Set<string>>(new Set());

  // Submit Resource Modal State
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    description: '',
    category: 'Tutorial',
    difficulty: 'beginner',
    tags: '',
    author: '',
    readingTime: '',
  });

  const categories = [
    'Tutorial',
    'Article',
    'Video',
    'Course',
    'Documentation',
    'Tool',
    'Book',
  ];

  const difficulties = ['beginner', 'intermediate', 'advanced'];

  const fetchResources = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12',
        sortBy,
      });
      if (search) params.append('search', search);
      if (category && category !== 'all') params.append('category', category);
      if (difficulty && difficulty !== 'all') params.append('difficulty', difficulty);

      const response = await fetch(`/api/resources?${params}`);
      const data = await response.json();
      setResources(data.resources || []);
      setPagination(data.pagination || null);
    } catch (error) {
      console.error('Error fetching resources:', error);
      showError('Failed to load resources');
    } finally {
      setLoading(false);
    }
  };

  const loadBookmarks = async () => {
    try {
      let urls: string[] = [];
      if (isSignedIn) {
        const bookmarks = await migrateLocalBookmarksToAccount();
        urls = bookmarks.map((b) => b.url);
      } else {
        const bookmarks = localBookmarks.getAll();
        urls = bookmarks.map((b) => b.url);
      }
      setBookmarkedUrls(new Set(urls));
    } catch (e) {
      console.error('Error loading bookmarks', e);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [category, difficulty, sortBy, page]);

  useEffect(() => {
    if (isLoaded) void loadBookmarks();
  }, [isLoaded, isSignedIn]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchResources();
  };

  const handleToggleBookmark = async (resource: Resource) => {
    if (!isLoaded) return;

    const isBookmarked = bookmarkedUrls.has(resource.url);
    try {
      if (isBookmarked) {
        // Find bookmark id to remove
        if (isSignedIn) {
          const list = await apiBookmarks.getAll();
          const target = list.find((b) => b.url === resource.url);
          if (target) {
            await apiBookmarks.remove(target.id);
          }
        } else {
          const list = localBookmarks.getAll();
          const target = list.find((b) => b.url === resource.url);
          if (target) {
            localBookmarks.remove(target.id);
          }
        }
        setBookmarkedUrls((prev) => {
          const next = new Set(prev);
          next.delete(resource.url);
          return next;
        });
        showSuccess('Bookmark removed');
      } else {
        const newBookmarkPayload = {
          title: resource.title,
          url: resource.url,
          description: resource.description || undefined,
          category: resource.category || 'General',
          tags: resource.tags || [],
        };
        if (isSignedIn) {
          await apiBookmarks.add(newBookmarkPayload);
        } else {
          localBookmarks.add(newBookmarkPayload);
        }
        setBookmarkedUrls((prev) => new Set(prev).add(resource.url));
        showSuccess('Resource saved to bookmarks!');
      }
    } catch (err: any) {
      showError(err.message || 'Bookmark action failed');
    }
  };

  const handleSubmitResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.url || !formData.category) {
      showError('Please fill in title, URL, and category.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: formData.title,
        url: formData.url,
        description: formData.description || null,
        category: formData.category,
        difficulty: formData.difficulty || null,
        author: formData.author || null,
        readingTime: formData.readingTime ? parseInt(formData.readingTime) : null,
        tags: formData.tags ? formData.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        rating: 5.0,
      };

      const res = await fetch('/api/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showSuccess('Resource submitted successfully!');
        setIsSubmitOpen(false);
        setFormData({
          title: '',
          url: '',
          description: '',
          category: 'Tutorial',
          difficulty: 'beginner',
          tags: '',
          author: '',
          readingTime: '',
        });
        fetchResources();
      } else {
        const errorData = await res.json();
        showError(errorData.error || 'Failed to submit resource');
      }
    } catch (err) {
      console.error(err);
      showError('Error submitting resource');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-28 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Navigation Breadcrumb / Dashboard Link */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors py-1.5 px-3 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 backdrop-blur-sm shadow-sm hover:shadow"
          >
            <span>← Back to Dashboard</span>
          </Link>
          <Link
            href="/dashboard/resources"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors py-1.5 px-3 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 backdrop-blur-sm shadow-sm hover:shadow"
          >
            <BookOpen className="w-4 h-4 text-blue-500" />
            <span>Manage Resources (Admin)</span>
          </Link>
        </div>

        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-8 sm:p-12 text-white shadow-xl">
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-sm font-medium mb-4">
              <Sparkles className="h-4 w-4 text-yellow-300" />
              <span>Curated Developer Learning Library</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4">
              Explore Top Developer Resources
            </h1>
            <p className="text-blue-100 text-lg leading-relaxed mb-6">
              Discover, bookmark, and master handpicked tutorials, comprehensive articles, video series, and tools curated for modern engineers.
            </p>
            <div className="flex flex-wrap gap-3">
              <Dialog open={isSubmitOpen} onOpenChange={setIsSubmitOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-white text-blue-700 hover:bg-blue-50 font-semibold shadow-lg">
                    <Plus className="h-4 w-4 mr-2" />
                    Submit Resource
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">Submit a Learning Resource</DialogTitle>
                    <DialogDescription className="text-slate-500 dark:text-slate-400">
                      Share high quality tutorials, documentation, or tools with the Dev Pocket community.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmitResource} className="space-y-4 mt-2">
                    <div>
                      <label className="block text-sm font-medium mb-1">Title *</label>
                      <Input
                        required
                        placeholder="e.g. Next.js 15 Full Tutorial"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">URL *</label>
                      <Input
                        required
                        type="url"
                        placeholder="https://example.com/guide"
                        value={formData.url}
                        onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">Category *</label>
                        <Select
                          value={formData.category}
                          onValueChange={(val) => setFormData({ ...formData, category: val })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((c) => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Difficulty</label>
                        <Select
                          value={formData.difficulty}
                          onValueChange={(val) => setFormData({ ...formData, difficulty: val })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Difficulty" />
                          </SelectTrigger>
                          <SelectContent>
                            {difficulties.map((d) => (
                              <SelectItem key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">Author</label>
                        <Input
                          placeholder="e.g. Lee Robinson"
                          value={formData.author}
                          onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Est. Minutes</label>
                        <Input
                          type="number"
                          placeholder="15"
                          value={formData.readingTime}
                          onChange={(e) => setFormData({ ...formData, readingTime: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Tags (comma-separated)</label>
                      <Input
                        placeholder="react, typescript, nextjs"
                        value={formData.tags}
                        onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Description</label>
                      <Textarea
                        rows={3}
                        placeholder="Provide a brief overview of why this resource is useful..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsSubmitOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white">
                        {submitting ? 'Submitting...' : 'Submit Resource'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>

              <Link href="/dashboard/bookmarks">
                <Button variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/20">
                  <Bookmark className="h-4 w-4 mr-2" />
                  My Bookmarks
                </Button>
              </Link>
            </div>
          </div>
          {/* Decorative Background Blob */}
          <div className="absolute right-0 top-0 -mt-12 -mr-12 w-96 h-96 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <form onSubmit={handleSearchSubmit} className="flex-1 relative">
              <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
              <Input
                type="text"
                placeholder="Search tutorials, articles, authors, concepts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-11 h-12 text-base rounded-xl border-slate-200 dark:border-slate-800"
              />
            </form>

            <div className="flex flex-wrap sm:flex-nowrap gap-3">
              <Select value={category} onValueChange={(val) => { setCategory(val); setPage(1); }}>
                <SelectTrigger className="w-full sm:w-44 h-12 rounded-xl">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={difficulty} onValueChange={(val) => { setDifficulty(val); setPage(1); }}>
                <SelectTrigger className="w-full sm:w-40 h-12 rounded-xl">
                  <SelectValue placeholder="Difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  {difficulties.map((d) => (
                    <SelectItem key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(val) => { setSortBy(val); setPage(1); }}>
                <SelectTrigger className="w-full sm:w-40 h-12 rounded-xl">
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">Newest First</SelectItem>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                  <SelectItem value="readingTime">Quickest Reads</SelectItem>
                  <SelectItem value="title">Alphabetical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Resources Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 animate-pulse space-y-4">
                <div className="flex justify-between items-center">
                  <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded-full" />
                  <div className="h-8 w-8 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                </div>
                <div className="h-6 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-md" />
                <div className="space-y-2">
                  <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="h-4 w-4/5 bg-slate-200 dark:bg-slate-800 rounded" />
                </div>
                <div className="pt-4 flex justify-between items-center">
                  <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="h-8 w-20 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : resources.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BookOpen className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              No learning resources found
            </h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
              We couldn't find any resources matching your current search or filters. Try adjusting them or submit one yourself!
            </p>
            <Button
              onClick={() => {
                setSearch('');
                setCategory('all');
                setDifficulty('all');
                setSortBy('createdAt');
                setPage(1);
              }}
              variant="outline"
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resources.map((resource) => {
              const isBookmarked = bookmarkedUrls.has(resource.url);
              return (
                <Card
                  key={resource.id}
                  className="flex flex-col justify-between bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
                >
                  <CardHeader className="space-y-3 pb-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex flex-wrap gap-2">
                        <Badge
                          variant="secondary"
                          className="bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 font-semibold"
                        >
                          {resource.category}
                        </Badge>
                        {resource.difficulty && (
                          <Badge
                            variant="outline"
                            className="capitalize text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                          >
                            {resource.difficulty}
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleBookmark(resource)}
                        title={isBookmarked ? 'Remove Bookmark' : 'Save to Bookmarks'}
                        className={`rounded-full h-8 w-8 transition-colors ${
                          isBookmarked
                            ? 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100'
                            : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {isBookmarked ? (
                          <BookmarkCheck className="h-4 w-4 fill-blue-600" />
                        ) : (
                          <Bookmark className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    <Link href={`/resources/${resource.id}`}>
                      <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                        {resource.title}
                      </CardTitle>
                    </Link>

                    {resource.description && (
                      <CardDescription className="text-slate-600 dark:text-slate-400 line-clamp-2 text-sm leading-relaxed">
                        {resource.description}
                      </CardDescription>
                    )}
                  </CardHeader>

                  <CardContent className="space-y-4 pt-0">
                    {/* Meta info */}
                    <div className="flex items-center gap-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                      {resource.readingTime && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          <span>{resource.readingTime} min</span>
                        </div>
                      )}
                      {resource.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          <span className="text-slate-700 dark:text-slate-300 font-semibold">
                            {resource.rating.toFixed(1)}
                          </span>
                        </div>
                      )}
                      {resource.author && (
                        <span className="truncate max-w-[120px]">By {resource.author}</span>
                      )}
                    </div>

                    {/* Tags */}
                    {resource.tags && resource.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {resource.tags.slice(0, 3).map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-xs bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-none font-normal"
                          >
                            #{tag}
                          </Badge>
                        ))}
                        {resource.tags.length > 3 && (
                          <Badge
                            variant="outline"
                            className="text-xs bg-slate-50 dark:bg-slate-800/50 text-slate-400 border-none"
                          >
                            +{resource.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <Link
                        href={`/resources/${resource.id}`}
                        className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Details & Reviews →
                      </Link>
                      <Button asChild size="sm" className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                        <a href={resource.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                          Open
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {pagination && pagination.pages > 1 && (
          <div className="flex justify-center items-center gap-3 pt-6">
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-xl"
            >
              Previous
            </Button>
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400 px-3">
              Page {page} of {pagination.pages}
            </span>
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              disabled={page === pagination.pages}
              className="rounded-xl"
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
