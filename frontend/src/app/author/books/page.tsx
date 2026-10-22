'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { TicketBadge } from '@/components/TicketBadge';
import {
  BookOpen,
  DollarSign,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  Info,
  Layers,
  ShoppingBag,
  Send,
  Calendar,
  X,
} from 'lucide-react';

export default function AuthorBooksPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [books, setBooks] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBookForBreakdown, setSelectedBookForBreakdown] = useState<any | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    const fetchBooks = async () => {
      try {
        setIsLoading(true);
        const res = await api.getBooks();
        if (res.success) {
          setBooks(res.data.books || []);
          setSummary(res.data.summary);
        }
      } catch (err) {
        console.error('Failed to load books:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBooks();
  }, [user, router]);

  if (!user || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500 font-medium">Loading Published Catalog...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Books & Catalog</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold">
              {books.length} Titles
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Official publication details, ISBN registrations, and itemized platform royalty statements.
          </p>
        </div>

        <button
          onClick={() => router.push('/author/submit-ticket')}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm flex items-center gap-2 transition-all shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          Raise Query Regarding a Book
        </button>
      </div>

      {/* Catalog Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="py-4 px-6">Book Title & Details</th>
                <th className="py-4 px-6">Status & Timeline</th>
                <th className="py-4 px-6 text-right">Pricing (MRP)</th>
                <th className="py-4 px-6 text-right">Copies Sold</th>
                <th className="py-4 px-6 text-right">Total Royalty</th>
                <th className="py-4 px-6 text-right">Disbursed / Pending</th>
                <th className="py-4 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {books.map((book) => {
                const isLive = book.status === 'PUBLISHED_LIVE';
                return (
                  <tr key={book.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Title & ISBN */}
                    <td className="py-4 px-6 max-w-xs">
                      <div className="font-bold text-slate-900 text-sm">{book.title}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">
                        ISBN: {book.isbn ? (
                          <span className="text-slate-700 font-semibold">{book.isbn}</span>
                        ) : (
                          <span className="text-amber-600 italic">Pending Assignment</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">Genre: {book.genre}</div>
                      {book.printPartner && (
                        <div className="text-[10px] text-indigo-600 font-semibold mt-1">
                          Print Partner: {book.printPartner}
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-6">
                      <div className="space-y-1">
                        <TicketBadge type="stage" value={book.status} />
                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {book.publicationDate
                            ? `Published ${new Date(book.publicationDate).toLocaleDateString()}`
                            : 'In Production Pipeline'}
                        </div>
                        {book.lastRoyaltyPayoutDate && (
                          <div className="text-[10px] text-emerald-600 font-medium">
                            Last Payout: {new Date(book.lastRoyaltyPayoutDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* MRP & Royalty Rate */}
                    <td className="py-4 px-6 text-right">
                      <div className="font-bold text-slate-900">₹{book.mrp}</div>
                      {book.authorRoyaltyPerCopy ? (
                        <div className="text-[11px] font-semibold text-emerald-600">
                          ₹{book.authorRoyaltyPerCopy} / copy
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400">Print: ₹{book.printingCost}</div>
                      )}
                    </td>

                    {/* Copies Sold */}
                    <td className="py-4 px-6 text-right">
                      <span className="font-bold text-slate-900">{book.totalCopiesSold}</span>
                      <span className="text-slate-400 text-xs block">copies</span>
                    </td>

                    {/* Total Royalty */}
                    <td className="py-4 px-6 text-right">
                      <span className="font-extrabold text-emerald-700">₹{book.totalRoyaltyEarned?.toLocaleString('en-IN')}</span>
                      <span className="text-[10px] text-slate-400 block">80% Net Share</span>
                    </td>

                    {/* Disbursed / Pending */}
                    <td className="py-4 px-6 text-right">
                      <div className="font-bold text-amber-600">Pending: ₹{book.royaltyPending?.toLocaleString('en-IN')}</div>
                      <div className="text-[11px] text-slate-400">Paid: ₹{book.royaltyPaid?.toLocaleString('en-IN')}</div>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {isLive && (
                          <button
                            onClick={() => setSelectedBookForBreakdown(book)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                            title="View platform sales breakdown & net profit formula"
                          >
                            Breakdown
                          </button>
                        )}
                        <button
                          onClick={() => router.push(`/author/submit-ticket?bookId=${book.id}`)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors"
                          title="Raise support ticket about this book"
                        >
                          Query
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Royalty Breakdown & Calculation Modal */}
      {selectedBookForBreakdown && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                  Transparent Royalty Statement
                </span>
                <h3 className="text-lg font-bold text-slate-900">{selectedBookForBreakdown.title}</h3>
                <p className="text-xs text-slate-500 font-mono">ISBN: {selectedBookForBreakdown.isbn}</p>
              </div>
              <button
                onClick={() => setSelectedBookForBreakdown(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Platform Sales breakdown */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Platform Sales Distribution
              </h4>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <span className="text-xs text-slate-600">Amazon India</span>
                  <span className="text-xs font-bold text-slate-900">
                    {selectedBookForBreakdown.platformSales?.amazonIn || 0} copies
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <span className="text-xs text-slate-600">Flipkart</span>
                  <span className="text-xs font-bold text-slate-900">
                    {selectedBookForBreakdown.platformSales?.flipkart || 0} copies
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <span className="text-xs text-slate-600">Amazon US & UK</span>
                  <span className="text-xs font-bold text-slate-900">
                    {selectedBookForBreakdown.platformSales?.amazonUs || 0} copies
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <span className="text-xs text-slate-600">BookLeaf Direct Store</span>
                  <span className="text-xs font-bold text-slate-900">
                    {selectedBookForBreakdown.platformSales?.bookleafStore || 0} copies
                  </span>
                </div>
              </div>
            </div>

            {/* Policy Math Box */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 text-xs text-slate-700 space-y-2">
              <div className="font-bold text-indigo-900 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-indigo-600" />
                BookLeaf 80/20 Royalty Split Formula
              </div>
              <p>
                <strong>Net Profit per Copy =</strong> MRP (₹{selectedBookForBreakdown.mrp}) - Printing Cost (₹{selectedBookForBreakdown.printingCost}) - Platform Commission & Shipping.
              </p>
              <p>
                <strong>Author Share:</strong> 80% of net profit is credited directly to you. Calculations are performed quarterly and disbursed within 45 days. Minimum payout threshold is ₹1,000 (amounts below roll over).
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedBookForBreakdown(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold text-xs shadow hover:bg-slate-800"
              >
                Close Statement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
