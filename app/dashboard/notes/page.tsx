"use client";

import { useState, useEffect } from "react";
import { Plus, X, Search, Trash2, Edit3, Eye, Calendar, Sparkles, Tag, Check, Bookmark } from "lucide-react";
import { showError, showSuccess } from "@/lib/toast";

export type Note = {
  id: number;
  title: string;
  content: string;
  date: string;
  category?: string;
  tags?: string[];
  pinned?: boolean;
};

const INITIAL_MOCK_NOTES: Note[] = [
  {
    id: 1,
    title: "Project Ideas & Architecture",
    content: "Research Next.js 16 App Router micro-frontends, edge runtime optimizations, and server actions caching patterns for high-scale developer portals.",
    date: "2025-09-30",
    category: "Architecture",
    tags: ["nextjs", "performance", "fullstack"],
    pinned: true,
  },
  {
    id: 2,
    title: "Personal Learning Roadmap Milestones",
    content: "Review Q4 deliverables: Master System Design primitives, Distributed Caching with Redis, and GraphQL federation best practices.",
    date: "2025-09-29",
    category: "Roadmap",
    tags: ["learning", "career", "system-design"],
    pinned: false,
  },
  {
    id: 3,
    title: "React Hooks Deep Dive",
    content: "Focus on concurrent mode, useTransition, useDeferredValue, and custom hooks composition to prevent unnecessary re-renders in heavy dashboards.",
    date: "2025-09-28",
    category: "Frontend",
    tags: ["react", "hooks", "tutorial"],
    pinned: false,
  }
];

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Filter & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Active note for View / Edit
  const [activeNote, setActiveNote] = useState<Note | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formCategory, setFormCategory] = useState("General");
  const [formTags, setFormTags] = useState("");

  // Load notes from localStorage on mount
  useEffect(() => {
    try {
      const savedNotes = localStorage.getItem("dev-pocket-notes");
      if (savedNotes) {
        const parsed = JSON.parse(savedNotes);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setNotes(parsed);
        } else {
          setNotes(INITIAL_MOCK_NOTES);
        }
      } else {
        setNotes(INITIAL_MOCK_NOTES);
      }
    } catch (error) {
      console.error("Error loading notes from localStorage:", error);
      setNotes(INITIAL_MOCK_NOTES);
    }
    setIsInitialized(true);
  }, []);

  // Save notes to localStorage whenever they change
  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem("dev-pocket-notes", JSON.stringify(notes));
    } catch (error) {
      console.error("Error saving notes to localStorage:", error);
      showError("Failed to save notes. Your storage might be full.");
    }
  }, [notes, isInitialized]);

  const categories = ["All", ...Array.from(new Set(notes.map((n) => n.category || "General")))];

  // Open Create Modal
  const openCreateModal = () => {
    setFormTitle("");
    setFormContent("");
    setFormCategory("General");
    setFormTags("");
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (note: Note) => {
    setActiveNote(note);
    setFormTitle(note.title);
    setFormContent(note.content);
    setFormCategory(note.category || "General");
    setFormTags(note.tags ? note.tags.join(", ") : "");
    setIsEditModalOpen(true);
  };

  // Open View Details Modal
  const openViewModal = (note: Note) => {
    setActiveNote(note);
    setIsViewModalOpen(true);
  };

  // Handle Add Note
  const handleAddNote = () => {
    if (formTitle.trim() === "" && formContent.trim() === "") return;

    const parsedTags = formTags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const newNote: Note = {
      id: Date.now(),
      title: formTitle.trim() || "Untitled Note",
      content: formContent.trim() || "",
      category: formCategory.trim() || "General",
      tags: parsedTags,
      date: new Date().toISOString().split("T")[0],
      pinned: false,
    };

    setNotes((prev) => [newNote, ...prev]);
    setIsCreateModalOpen(false);
    showSuccess("Note created successfully!");
  };

  // Handle Update Note
  const handleUpdateNote = () => {
    if (!activeNote) return;
    if (formTitle.trim() === "" && formContent.trim() === "") return;

    const parsedTags = formTags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const updated: Note = {
      ...activeNote,
      title: formTitle.trim() || "Untitled Note",
      content: formContent.trim() || "",
      category: formCategory.trim() || "General",
      tags: parsedTags,
      date: new Date().toISOString().split("T")[0],
    };

    setNotes((prev) => prev.map((n) => (n.id === activeNote.id ? updated : n)));
    setIsEditModalOpen(false);
    setActiveNote(null);
    showSuccess("Note updated successfully!");
  };

  // Handle Delete Note
  const handleDeleteNote = (id: number) => {
    setNotes((prevNotes) => prevNotes.filter((note) => note.id !== id));
    if (activeNote && activeNote.id === id) {
      setIsViewModalOpen(false);
      setIsEditModalOpen(false);
      setActiveNote(null);
    }
    showSuccess("Note removed");
  };

  // Toggle Pin
  const handleTogglePin = (id: number) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n))
    );
  };

  // Search and Category filtering
  const filteredNotes = notes.filter((note) => {
    const matchesSearch =
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (note.tags && note.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase())));
    const matchesCat =
      selectedCategory === "All" || (note.category || "General") === selectedCategory;
    return matchesSearch && matchesCat;
  });

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              Digital Learning Notes
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Interactive Notes Hub</h1>
            <p className="text-blue-100 text-sm mt-1 max-w-xl">
              Capture your coding epiphanies, organize study milestones, view full details, and edit entries seamlessly.
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 bg-white text-blue-600 hover:bg-blue-50 px-5 py-3 rounded-2xl font-bold shadow-lg shadow-black/10 hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200"
          >
            <Plus className="w-5 h-5" />
            Add New Note
          </button>
        </div>
        {/* Glow decoration */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search notes by title, topic, or tag..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all shadow-xs"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                selectedCategory === cat
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-105"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Notes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredNotes.map((note) => (
          <div
            key={note.id}
            className={`group relative rounded-3xl bg-white dark:bg-slate-800/90 border p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between ${
              note.pinned
                ? "border-blue-300 dark:border-blue-500/50 shadow-md shadow-blue-500/5 ring-1 ring-blue-500/20"
                : "border-slate-200/80 dark:border-slate-700/70"
            }`}
          >
            <div>
              {/* Category & Pin badge */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300">
                  <Tag className="w-3 h-3" />
                  {note.category || "General"}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleTogglePin(note.id)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      note.pinned
                        ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30"
                        : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                    }`}
                    title={note.pinned ? "Unpin note" : "Pin note"}
                  >
                    <Bookmark className="w-3.5 h-3.5 fill-current" />
                  </button>
                  <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {note.date}
                  </span>
                </div>
              </div>

              {/* Title */}
              <h3 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {note.title}
              </h3>

              {/* Content snippet */}
              <p className="text-slate-600 dark:text-slate-300 text-sm mt-2 line-clamp-3 leading-relaxed">
                {note.content}
              </p>

              {/* Tags */}
              {note.tags && note.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {note.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Actions footer */}
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-slate-700/50">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleDeleteNote(note.id)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-all"
                  title="Delete note"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => openEditModal(note)}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-all"
                  title="Edit note"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => openViewModal(note)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 px-3 py-1.5 rounded-xl transition-all"
              >
                <Eye className="w-3.5 h-3.5" />
                View Details
              </button>
            </div>
          </div>
        ))}

        {/* Empty State */}
        {filteredNotes.length === 0 && (
          <div className="col-span-full rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-12 text-center bg-white/50 dark:bg-slate-800/40 backdrop-blur-sm">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Sparkles className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              {searchTerm ? "No notes matched your search" : "No notes in this category"}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
              {searchTerm
                ? "Try adjusting keywords or selecting 'All' categories."
                : "Create a note to start jotting down concepts, algorithms, and reminders."}
            </p>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-md shadow-blue-500/20"
            >
              <Plus className="w-4 h-4" />
              Create Note
            </button>
          </div>
        )}
      </div>

      {/* VIEW DETAILS MODAL */}
      {isViewModalOpen && activeNote && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="relative p-6 bg-linear-to-r from-blue-600 to-indigo-600 text-white flex justify-between items-start">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/20 text-xs font-semibold backdrop-blur-md mb-2">
                  <Tag className="w-3 h-3" />
                  {activeNote.category || "General"}
                </div>
                <h2 className="text-2xl font-black">{activeNote.title}</h2>
                <div className="flex items-center gap-2 text-xs text-blue-100 mt-2">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Created: {activeNote.date}</span>
                  {activeNote.pinned && <span className="bg-white/20 px-2 py-0.5 rounded-md font-bold">Pinned</span>}
                </div>
              </div>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                  Note Content
                </h4>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed text-sm">
                  {activeNote.content}
                </div>
              </div>

              {activeNote.tags && activeNote.tags.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                    Tags
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {activeNote.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border border-blue-200/50 dark:border-blue-700/50"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200/80 dark:border-slate-700">
              <button
                onClick={() => handleDeleteNote(activeNote.id)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsViewModalOpen(false);
                    openEditModal(activeNote);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit Note
                </button>
                <button
                  onClick={() => setIsViewModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {(isCreateModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 p-5 bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  {isEditModalOpen ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {isEditModalOpen ? "Edit Note" : "Create New Note"}
                </h2>
              </div>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setIsEditModalOpen(false);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                  Title
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Master Binary Search Trees"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                    Category
                  </label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Frontend, Algorithms, General"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    className="w-full rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. dsa, trees, interview"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                  Content
                </label>
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  rows={5}
                  className="w-full rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 p-3.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Write concepts, code notes, roadmap targets, or key references..."
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-5 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setIsEditModalOpen(false);
                }}
                className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={isEditModalOpen ? handleUpdateNote : handleAddNote}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-bold bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg shadow-blue-500/25 transition-all"
              >
                <Check className="w-4 h-4" />
                {isEditModalOpen ? "Save Changes" : "Save Note"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
