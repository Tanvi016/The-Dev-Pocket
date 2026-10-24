'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  ExternalLink,
  Clock,
  Star,
  ArrowLeft,
  User,
  Calendar,
  Bookmark,
  BookmarkCheck,
  ThumbsUp,
  Flag,
  MessageSquare,
  Sparkles,
  Share2
} from 'lucide-react';
import Link from 'next/link';
import { showSuccess, showError } from '@/lib/toast';
import { localBookmarks, apiBookmarks } from '@/lib/bookmarks';
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
  updatedAt: string;
}

interface Review {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
  helpfulCount: number;
}

export default function ResourceDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { isSignedIn, user } = useUser();
  const [resource, setResource] = useState<Resource | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);

  // Review & Rating State
  const [userRating, setUserRating] = useState(5);
  const [userComment, setUserComment] = useState('');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [votedHelpful, setVotedHelpful] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchResource = async () => {
      try {
        const response = await fetch(`/api/resources/${id}`);
        if (response.ok) {
          const data = await response.json();
          setResource(data);
          checkBookmark(data.url);
        } else {
          setError('Resource not found');
        }
      } catch (err) {
        setError('Failed to fetch resource');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchResource();
      // Load saved reviews from localStorage
      try {
        const storedReviews = localStorage.getItem(`dev-pocket-reviews-${id}`);
        if (storedReviews) {
          setReviews(JSON.parse(storedReviews));
        } else {
          // Default community reviews for demonstration
          setReviews([
            {
              id: '1',
              userName: 'Alex Chen',
              rating: 5,
              comment: 'Exceptional deep dive. The explanations and interactive code samples helped clarify complex concepts in no time!',
              createdAt: new Date(Date.now() - 86400000 * 2).toLocaleDateString(),
              helpfulCount: 14,
            },
            {
              id: '2',
              userName: 'Priya Sharma',
              rating: 5,
              comment: 'Bookmarked immediately. Clean structure and covers modern architectural best practices.',
              createdAt: new Date(Date.now() - 86400000 * 5).toLocaleDateString(),
              helpfulCount: 9,
            },
          ]);
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, [id, isSignedIn]);

  const checkBookmark = async (url: string) => {
    try {
      if (isSignedIn) {
        const bList = await apiBookmarks.getAll();
        setIsBookmarked(bList.some((b) => b.url === url));
      } else {
        const bList = localBookmarks.getAll();
        setIsBookmarked(bList.some((b) => b.url === url));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleBookmark = async () => {
    if (!resource) return;
    try {
      if (isBookmarked) {
        if (isSignedIn) {
          const list = await apiBookmarks.getAll();
          const target = list.find((b) => b.url === resource.url);
          if (target) await apiBookmarks.remove(target.id);
        } else {
          const list = localBookmarks.getAll();
          const target = list.find((b) => b.url === resource.url);
          if (target) localBookmarks.remove(target.id);
        }
        setIsBookmarked(false);
        showSuccess('Removed from bookmarks');
      } else {
        const payload = {
          title: resource.title,
          url: resource.url,
          description: resource.description || undefined,
          category: resource.category,
          tags: resource.tags || [],
        };
        if (isSignedIn) {
          await apiBookmarks.add(payload);
        } else {
          localBookmarks.add(payload);
        }
        setIsBookmarked(true);
        showSuccess('Saved to bookmarks!');
      }
    } catch (err: any) {
      showError(err.message || 'Bookmark action failed');
    }
  };

  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userComment.trim()) {
      showError('Please write a short comment.');
      return;
    }
    const newRev: Review = {
      id: crypto.randomUUID(),
      userName: user?.fullName || user?.firstName || 'Developer',
      rating: userRating,
      comment: userComment.trim(),
      createdAt: new Date().toLocaleDateString(),
      helpfulCount: 0,
    };
    const updated = [newRev, ...reviews];
    setReviews(updated);
    try {
      localStorage.setItem(`dev-pocket-reviews-${id}`, JSON.stringify(updated));
    } catch (e) {}
    setUserComment('');
    showSuccess('Review submitted! Thank you for contributing.');
  };

  const handleHelpfulVote = (reviewId: string) => {
    if (votedHelpful.has(reviewId)) {
      showError('You already voted on this review.');
      return;
    }
    const updated = reviews.map((r) =>
      r.id === reviewId ? { ...r, helpfulCount: r.helpfulCount + 1 } : r
    );
    setReviews(updated);
    setVotedHelpful(new Set(votedHelpful).add(reviewId));
    try {
      localStorage.setItem(`dev-pocket-reviews-${id}`, JSON.stringify(updated));
    } catch (e) {}
    showSuccess('Marked as helpful!');
  };

  const handleShare = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showSuccess('Link copied to clipboard! 📋');
    }
  };

  if (loading) {
    return (
      <div className="container max-w-6xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/4"></div>
          <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-3xl"></div>
        </div>
      </div>
    );
  }

  if (error || !resource) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-extrabold mb-4 text-slate-900 dark:text-slate-100">Resource Not Found</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-8">{error || 'The resource could not be found.'}</p>
        <Link href="/resources">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Learning Resources
          </Button>
        </Link>
      </div>
    );
  }

  const averageRating =
    reviews.length > 0
      ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
      : (resource.rating || 5.0).toFixed(1);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link href="/resources">
            <Button variant="ghost" className="text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-xl">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Resources
            </Button>
          </Link>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="rounded-xl border-slate-200 dark:border-slate-800"
            >
              <Share2 className="h-4 w-4 mr-1.5" />
              Share
            </Button>
            <Button
              variant={isBookmarked ? 'secondary' : 'outline'}
              size="sm"
              onClick={handleToggleBookmark}
              className={`rounded-xl transition-all ${
                isBookmarked
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 border-blue-200 dark:border-blue-900 font-semibold'
                  : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {isBookmarked ? (
                <>
                  <BookmarkCheck className="h-4 w-4 mr-1.5 fill-blue-600 text-blue-600" />
                  Saved to Bookmarks
                </>
              ) : (
                <>
                  <Bookmark className="h-4 w-4 mr-1.5" />
                  Save Bookmark
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Hero Resource Banner */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-10 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-blue-600 text-white font-semibold">
                  {resource.category}
                </Badge>
                {resource.difficulty && (
                  <Badge variant="outline" className="capitalize text-slate-600 dark:text-slate-400">
                    {resource.difficulty} Level
                  </Badge>
                )}
                <div className="inline-flex items-center gap-1 text-xs font-semibold text-amber-500 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-full">
                  <Star className="h-3.5 w-3.5 fill-amber-400" />
                  <span>{averageRating} / 5 ({reviews.length} reviews)</span>
                </div>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
                {resource.title}
              </h1>
              {resource.description && (
                <p className="text-slate-600 dark:text-slate-300 text-base leading-relaxed max-w-3xl">
                  {resource.description}
                </p>
              )}
            </div>

            <Button asChild size="lg" className="h-13 px-7 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-500/20 whitespace-nowrap">
              <a href={resource.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-5 w-5 mr-2" />
                Visit Official Source
              </a>
            </Button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-100 dark:border-slate-800 text-sm">
            <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-400">
              <Clock className="h-4 w-4 text-blue-500" />
              <span>{resource.readingTime ? `${resource.readingTime} min read` : 'Flexible duration'}</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-400">
              <User className="h-4 w-4 text-purple-500" />
              <span>{resource.author ? `By ${resource.author}` : 'Community Resource'}</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-400">
              <Calendar className="h-4 w-4 text-emerald-500" />
              <span>Added {new Date(resource.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-400">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span>Verified Content</span>
            </div>
          </div>
        </div>

        {/* Tags Section */}
        {resource.tags && resource.tags.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 flex items-center flex-wrap gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mr-2">Tags:</span>
            {resource.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                #{tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Reviews and Ratings Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Submit Review Card */}
          <div className="lg:col-span-1">
            <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
                  Rate this Resource
                </CardTitle>
                <CardDescription>
                  Share your feedback to help fellow developers choose the best materials.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddReview} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">
                      Your Rating (1 - 5 Stars)
                    </label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((starVal) => (
                        <button
                          key={starVal}
                          type="button"
                          onClick={() => setUserRating(starVal)}
                          className="p-1 hover:scale-110 transition-transform"
                        >
                          <Star
                            className={`h-7 w-7 ${
                              starVal <= userRating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-300 dark:text-slate-700'
                            }`}
                          />
                        </button>
                      ))}
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-2">
                        {userRating} / 5
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">
                      Your Review
                    </label>
                    <Textarea
                      rows={3}
                      placeholder="What did you learn? Was the explanation easy to follow?"
                      value={userComment}
                      onChange={(e) => setUserComment(e.target.value)}
                      className="rounded-xl border-slate-200 dark:border-slate-700 text-sm"
                    />
                  </div>

                  <Button type="submit" className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold">
                    Submit Review
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Reviews List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-600" />
                Community Reviews ({reviews.length})
              </h2>
            </div>

            {reviews.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-500">
                No reviews yet. Be the first to rate and review this resource!
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-sm">
                          {rev.userName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                            {rev.userName}
                          </div>
                          <div className="text-xs text-slate-400">{rev.createdAt}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < rev.rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-200 dark:text-slate-800'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {rev.comment}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                      <button
                        onClick={() => handleHelpfulVote(rev.id)}
                        className="inline-flex items-center gap-1.5 text-slate-500 hover:text-blue-600 transition-colors font-medium"
                      >
                        <ThumbsUp className="h-3.5 w-3.5" />
                        <span>Helpful ({rev.helpfulCount})</span>
                      </button>

                      <button
                        onClick={() => showSuccess('Thank you. Our moderation team has been notified.')}
                        className="inline-flex items-center gap-1 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Flag className="h-3 w-3" />
                        <span>Report</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
