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
  Inbox,
  AlertTriangle,
  CreditCard,
  CheckCircle,
  PlusCircle,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react';

export default function AuthorDashboardPage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const [books, setBooks] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankForm, setBankForm] = useState({ bankName: '', accountNumberLast4: '', ifsc: '' });
  const [bankSubmitting, setBankSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.role === 'ADMIN') {
      router.push('/admin/tickets');
      return;
    }

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [booksRes, ticketsRes] = await Promise.all([
          api.getBooks(),
          api.getTickets(),
        ]);

        if (booksRes.success) {
          setBooks(booksRes.data.books || []);
          setSummary(booksRes.data.summary);
        }
        if (ticketsRes.success) {
          setTickets(ticketsRes.data || []);
        }
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, router]);

  const handleBankSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setBankSubmitting(true);
      const res = await api.updateBankDetails(bankForm);
      if (res.success) {
        await refreshUser();
        setShowBankModal(false);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update bank details');
    } finally {
      setBankSubmitting(false);
    }
  };

  if (!user || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500 font-medium">Loading Author Dashboard...</p>
        </div>
      </div>
    );
  }

  const isBankUnlinked = !user.bankAccountLinked;
  const isBelowThreshold = summary && summary.totalRoyaltyEarned > 0 && summary.totalRoyaltyEarned < 1000;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-indigo-200 text-xs font-semibold backdrop-blur-sm mb-3">
              <span>BookLeaf Author Partner Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {user.name}
            </h1>
            <p className="text-indigo-200 text-sm mt-1 max-w-xl">
              Track your book catalog, quarterly royalty disbursements, and communicate directly with your dedicated publishing and production operations team.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => router.push('/author/submit-ticket')}
              className="px-4 py-2.5 rounded-xl bg-white text-indigo-900 font-semibold text-sm shadow hover:bg-indigo-50 transition-all flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4 text-indigo-600" />
              Raise Support Query
            </button>
            <button
              onClick={() => router.push('/author/books')}
              className="px-4 py-2.5 rounded-xl bg-indigo-700/60 hover:bg-indigo-700 text-white font-semibold text-sm border border-indigo-500/30 transition-all flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              View My Books
            </button>
          </div>
        </div>
      </div>

      {/* Critical Alerts: Bank Account Unlinked or Threshold Rollover */}
      {isBankUnlinked && (
        <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold">Bank Account Not Linked for Royalty Disbursements</h4>
              <p className="text-xs text-rose-700 mt-0.5">
                You have pending royalties! BookLeaf disburses payments via bank transfer within 45 days of quarter close. Please link your account details to release disbursements.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowBankModal(true)}
            className="px-4 py-2 rounded-xl bg-rose-600 text-white font-semibold text-xs shadow hover:bg-rose-700 transition-colors shrink-0"
          >
            Link Bank Account Now
          </button>
        </div>
      )}

      {isBelowThreshold && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 shadow-sm">
          <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold">Quarterly Minimum Threshold Policy: </span>
            Your accumulated royalty (₹{summary?.totalRoyaltyEarned}) is currently below BookLeaf’s ₹1,000 disbursement threshold. In accordance with policy, this amount will automatically roll over to next quarter without any deduction!
          </div>
        </div>
      )}

      {/* Key Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Catalog Titles</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-slate-900">{summary?.totalBooks || 0}</span>
            <span className="text-xs text-slate-500 block mt-1">
              {summary?.publishedLiveCount || 0} live • {summary?.inProductionCount || 0} in production
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Copies Sold</span>
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-slate-900">{summary?.totalCopiesSold || 0}</span>
            <span className="text-xs text-slate-500 block mt-1">Amazon, Flipkart & Store</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Royalty Earned</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-emerald-700">₹{summary?.totalRoyaltyEarned?.toLocaleString('en-IN') || 0}</span>
            <span className="text-xs text-slate-500 block mt-1">80% Net profit share</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Payout</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-amber-700">₹{summary?.royaltyPending?.toLocaleString('en-IN') || 0}</span>
            <span className="text-xs text-slate-500 block mt-1">
              ₹{summary?.royaltyPaid?.toLocaleString('en-IN') || 0} previously disbursed
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: My Books & Support Tickets */}
      <div className="grid lg:grid-cols-12 gap-8">
        {/* Left Column: Published Books */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">My Books</h2>
              <p className="text-xs text-slate-500">Your published titles and production status</p>
            </div>
            <button
              onClick={() => router.push('/author/books')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              Full Details <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {books.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-300">
                <BookOpen className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-600">No books found in catalog</p>
              </div>
            ) : (
              books.slice(0, 3).map((book) => (
                <div
                  key={book.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900 text-sm sm:text-base">{book.title}</h3>
                      <TicketBadge type="stage" value={book.status} />
                    </div>
                    <p className="text-xs text-slate-500 font-mono">
                      ISBN: {book.isbn || 'Pending Assignment'} • Genre: {book.genre}
                    </p>
                    <div className="flex items-center gap-4 text-xs pt-1">
                      <span className="text-slate-600">MRP: <strong>₹{book.mrp}</strong></span>
                      <span className="text-slate-600">Sold: <strong>{book.totalCopiesSold}</strong> copies</span>
                      <span className="text-emerald-700 font-semibold">Royalty: ₹{book.totalRoyaltyEarned}</span>
                    </div>
                  </div>

                  <div className="text-right sm:border-l sm:pl-4 border-slate-100 shrink-0">
                    <span className="text-[11px] text-slate-400 uppercase font-semibold block">Pending Payout</span>
                    <span className="text-base font-extrabold text-amber-600">₹{book.royaltyPending}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Active Support Tickets */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Recent Support Queries</h2>
              <p className="text-xs text-slate-500">Live communication with BookLeaf operations</p>
            </div>
            <button
              onClick={() => router.push('/author/tickets')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              All Tickets <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {tickets.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-300">
                <Inbox className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-600">No support tickets submitted</p>
                <button
                  onClick={() => router.push('/author/submit-ticket')}
                  className="mt-3 text-xs font-bold text-indigo-600 hover:underline"
                >
                  Submit your first query →
                </button>
              </div>
            ) : (
              tickets.slice(0, 3).map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => router.push(`/author/tickets?id=${ticket.id}`)}
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 cursor-pointer transition-all space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-indigo-600">{ticket.ticketNumber}</span>
                    <div className="flex items-center gap-1.5">
                      <TicketBadge type="status" value={ticket.status} />
                    </div>
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                    {ticket.subject}
                  </h4>
                  <p className="text-[11px] text-slate-500 line-clamp-2">
                    {ticket.description}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                    <TicketBadge type="category" value={ticket.category} />
                    <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Link Bank Account Modal */}
      {showBankModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Link Bank Account for Royalties</h3>
            <p className="text-xs text-slate-500 mb-4">
              Payouts are transferred directly to your bank account within 45 days of each quarterly period.
            </p>

            <form onSubmit={handleBankSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Bank Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HDFC Bank, SBI, ICICI"
                  value={bankForm.bankName}
                  onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Last 4 Digits of Account Number</label>
                <input
                  type="text"
                  maxLength={4}
                  required
                  placeholder="e.g. 4821"
                  value={bankForm.accountNumberLast4}
                  onChange={(e) => setBankForm({ ...bankForm, accountNumberLast4: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">IFSC Code / Wire Routing</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HDFC0001234"
                  value={bankForm.ifsc}
                  onChange={(e) => setBankForm({ ...bankForm, ifsc: e.target.value.toUpperCase() })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500/50 uppercase"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBankModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bankSubmitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow disabled:opacity-50"
                >
                  {bankSubmitting ? 'Saving...' : 'Save & Link Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
