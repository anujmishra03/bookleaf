'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import {
  Send,
  BookOpen,
  Paperclip,
  X,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';

function SubmitTicketContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialBookId = searchParams.get('bookId') || '';

  const [books, setBooks] = useState<any[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string>(initialBookId);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState<Array<{ name: string; size: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    const fetchBooks = async () => {
      try {
        const res = await api.getBooks();
        if (res.success) {
          setBooks(res.data.books || []);
        }
      } catch (err) {
        console.error('Failed to load books:', err);
      }
    };
    fetchBooks();
  }, [user, router]);

  const handleSimulatedFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const newItems = files.map((f) => ({
        name: f.name,
        size: `${(f.size / 1024).toFixed(1)} KB`,
      }));
      setAttachments((prev) => [...prev, ...newItems]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await api.createTicket({
        subject,
        description,
        bookId: selectedBookId || null,
        attachments,
      });

      if (res.success && res.data) {
        router.push(`/author/tickets?id=${res.data.id}&created=true`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit ticket. Please check input.');
      setIsSubmitting(false);
    }
  };

  const quickTopicSuggestions = [
    { title: 'Delayed Royalty Payout', desc: 'Querying quarter payout dates or missing bank transfers' },
    { title: 'ISBN Discrepancy on Amazon', desc: 'Online catalog showing incorrect ISBN or linking wrong edition' },
    { title: 'Print Quality Issue / Author Copies', desc: 'Reporting binding or misprint defects for free reprint' },
    { title: 'Currently Unavailable on Retail', desc: 'Amazon/Flipkart listing shows out of stock or sync delay' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI-Assisted Operations Dispatch</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Submit Support Query</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Your query will be automatically triaged, prioritized, and routed to BookLeaf’s operations team.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Form Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Book Dropdown */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Which Book Is This Query Regarding?
            </label>
            <div className="relative">
              <select
                value={selectedBookId}
                onChange={(e) => setSelectedBookId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none font-medium text-slate-800 cursor-pointer"
              >
                <option value="">General / Account Level Inquiry (No specific book)</option>
                {books.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title} {b.isbn ? `(ISBN: ${b.isbn})` : `(${b.status.replace(/_/g, ' ')})`}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Selecting a book automatically links sales, royalty, and production status for faster resolution.
            </p>
          </div>

          {/* Quick topic suggestion chips */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Common Topics (Click to Autofill Subject)
            </label>
            <div className="grid sm:grid-cols-2 gap-2">
              {quickTopicSuggestions.map((sug) => (
                <button
                  key={sug.title}
                  type="button"
                  onClick={() => setSubject(sug.title)}
                  className="text-left p-2.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 text-xs transition-colors"
                >
                  <div className="font-semibold text-slate-800">{sug.title}</div>
                  <div className="text-[10px] text-slate-500">{sug.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Subject Line */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Subject Line
            </label>
            <input
              type="text"
              required
              minLength={5}
              placeholder="e.g. Haven't received Q1 royalty payout or Book showing as unavailable on Amazon"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          {/* Detailed Description Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Detailed Description
            </label>
            <textarea
              required
              minLength={10}
              rows={5}
              placeholder="Please describe your question or issue in detail with any dates, numbers, retailer links, or observations..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 leading-relaxed"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Minimum 10 characters. Our AI system will examine BookLeaf policies and prepare a customized response for review.
            </p>
          </div>

          {/* File Attachment Support (UI with preview) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Optional Attachments (e.g. photos of defective copies, payment receipts)
            </label>
            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-4 text-center hover:bg-slate-50 transition-colors relative">
              <input
                type="file"
                multiple
                onChange={handleSimulatedFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center gap-1.5 pointer-events-none">
                <Paperclip className="w-5 h-5 text-slate-400" />
                <span className="text-xs font-medium text-slate-600">
                  Click or drag files here to attach
                </span>
                <span className="text-[10px] text-slate-400">PNG, JPG, PDF up to 10MB</span>
              </div>
            </div>

            {attachments.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {attachments.map((file, i) => (
                  <div
                    key={i}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-700"
                  >
                    <FileText className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{file.name}</span>
                    <span className="text-[10px] text-slate-400">({file.size})</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(i)}
                      className="p-0.5 rounded hover:text-rose-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              ⚡ Ticket status and updates sync live in real time.
            </span>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/25 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Triaging & Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Ticket</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SubmitTicketPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <SubmitTicketContent />
    </Suspense>
  );
}
