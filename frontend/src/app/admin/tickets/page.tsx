'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { TicketBadge } from '@/components/TicketBadge';
import {
  Inbox,
  Send,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Clock,
  CheckCircle2,
  Lock,
  User,
  BookOpen,
  Filter,
  Search,
  RefreshCw,
  Edit3,
  Copy,
  ChevronRight,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Layers,
  ArrowUpDown,
} from 'lucide-react';

function AdminTicketsContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeIdParam = searchParams.get('id');

  // State
  const [tickets, setTickets] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [activeTicket, setActiveTicket] = useState<any | null>(null);
  const [activeTicketDetails, setActiveTicketDetails] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'urgent' | 'newest' | 'oldest'>('urgent');

  // Response Editor State
  const [responseText, setResponseText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Overrides
  const [overrideCategory, setOverrideCategory] = useState('');
  const [overridePriority, setOverridePriority] = useState('');
  const [overrideAssignee, setOverrideAssignee] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load Admin Stats & Tickets
  const loadData = async () => {
    try {
      setIsLoading(true);
      const [statsRes, ticketsRes] = await Promise.all([
        api.getAdminStats(),
        api.getTickets({
          status: statusFilter || undefined,
          category: categoryFilter || undefined,
          priority: priorityFilter || undefined,
          search: searchQuery || undefined,
          sortBy,
        }),
      ]);

      if (statsRes.success) {
        setStats(statsRes.data);
      }
      if (ticketsRes.success) {
        setTickets(ticketsRes.data || []);

        if (activeIdParam) {
          const found = ticketsRes.data.find((t: any) => t.id === activeIdParam);
          if (found) setActiveTicket(found);
        } else if (ticketsRes.data.length > 0 && !activeTicket) {
          setActiveTicket(ticketsRes.data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load admin queue:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.role !== 'ADMIN') {
      router.push('/author/dashboard');
      return;
    }
    loadData();
  }, [user, statusFilter, categoryFilter, priorityFilter, sortBy]);

  // Load detailed ticket data when selection changes
  useEffect(() => {
    if (!activeTicket) return;

    const fetchDetail = async () => {
      try {
        const res = await api.getTicketById(activeTicket.id);
        if (res.success) {
          setActiveTicketDetails(res.data);
          setOverrideCategory(res.data.category);
          setOverridePriority(res.data.priority);
          setOverrideAssignee(res.data.assignedToId || '');
          if (res.data.aiDraftResponse) {
            setResponseText(res.data.aiDraftResponse);
          }
          scrollToBottom();
        }
      } catch (err) {
        console.error('Failed to load ticket details:', err);
      }
    };

    fetchDetail();

    // Socket.io real-time connection
    const socket = getSocket();
    if (socket) {
      socket.emit('join:ticket', activeTicket.id);

      const handleNewMessage = (payload: { ticketId: string; message: any }) => {
        if (payload.ticketId === activeTicket.id) {
          setActiveTicketDetails((prev: any) => {
            if (!prev) return prev;
            if (prev.messages?.some((m: any) => m.id === payload.message.id)) return prev;
            return {
              ...prev,
              messages: [...(prev.messages || []), payload.message],
            };
          });
          scrollToBottom();
        }
      };

      const handleTicketUpdated = (updatedTicket: any) => {
        if (updatedTicket.id === activeTicket.id) {
          setActiveTicket((prev: any) => ({ ...prev, ...updatedTicket }));
          setActiveTicketDetails((prev: any) => (prev ? { ...prev, ...updatedTicket } : prev));
        }
        setTickets((prevList) =>
          prevList.map((t) => (t.id === updatedTicket.id ? { ...t, ...updatedTicket } : t))
        );
      };

      const handleTicketCreated = (newTicket: any) => {
        setTickets((prevList) => [newTicket, ...prevList]);
      };

      socket.on('message:new', handleNewMessage);
      socket.on('ticket:updated', handleTicketUpdated);
      socket.on('ticket:created', handleTicketCreated);

      return () => {
        socket.emit('leave:ticket', activeTicket.id);
        socket.off('message:new', handleNewMessage);
        socket.off('ticket:updated', handleTicketUpdated);
        socket.off('ticket:created', handleTicketCreated);
      };
    }
  }, [activeTicket]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Send Public Reply or Internal Note
  const handleSendResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!responseText.trim() || !activeTicket) return;

    setIsSending(true);
    try {
      const res = await api.replyTicket(activeTicket.id, {
        message: responseText,
        isInternalNote,
      });

      if (res.success && res.data) {
        setResponseText('');
        setActiveTicketDetails((prev: any) => ({
          ...prev,
          messages: [...(prev.messages || []), res.data],
        }));
        scrollToBottom();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to send response');
    } finally {
      setIsSending(false);
    }
  };

  // Status Changer
  const handleStatusChange = async (newStatus: string) => {
    if (!activeTicket) return;
    try {
      const res = await api.updateTicketStatus(activeTicket.id, newStatus);
      if (res.success) {
        setActiveTicket((prev: any) => ({ ...prev, status: newStatus }));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  // Category Override
  const handleCategoryOverride = async (cat: string) => {
    if (!activeTicket || cat === activeTicket.category) return;
    try {
      const res = await api.updateTicketCategory(activeTicket.id, cat, 'Admin manual override');
      if (res.success) {
        setOverrideCategory(cat);
        setActiveTicket((prev: any) => ({ ...prev, category: cat }));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to override category');
    }
  };

  // Priority Override
  const handlePriorityOverride = async (prio: string) => {
    if (!activeTicket || prio === activeTicket.priority) return;
    try {
      const res = await api.updateTicketPriority(activeTicket.id, prio, 'Admin manual override');
      if (res.success) {
        setOverridePriority(prio);
        setActiveTicket((prev: any) => ({ ...prev, priority: prio }));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to override priority');
    }
  };

  // Assignee Changer
  const handleAssigneeChange = async (adminId: string) => {
    if (!activeTicket) return;
    try {
      const res = await api.assignTicket(activeTicket.id, adminId || null);
      if (res.success) {
        setOverrideAssignee(adminId);
        setActiveTicket((prev: any) => ({ ...prev, assignedToId: adminId || null }));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to assign ticket');
    }
  };

  // Regenerate AI Draft
  const handleRegenerateDraft = async () => {
    if (!activeTicket) return;
    setIsGeneratingDraft(true);
    try {
      const res = await api.generateAiDraft(activeTicket.id);
      if (res.success && res.data) {
        setResponseText(res.data.draftResponse);
        setActiveTicketDetails((prev: any) => ({
          ...prev,
          aiDraftResponse: res.data.draftResponse,
        }));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to generate AI draft');
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  if (!user || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500 font-medium">Loading Operations Queue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Executive KPI Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Queue Total</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{stats?.overview?.totalTickets || 0}</div>
          <span className="text-[10px] text-slate-400">All submitted queries</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Unresolved Tickets</span>
          <div className="text-2xl font-extrabold text-blue-700 mt-1">{stats?.overview?.unresolvedCount || 0}</div>
          <span className="text-[10px] text-slate-400">
            {stats?.overview?.openTickets || 0} Open • {stats?.overview?.inProgressTickets || 0} In Progress
          </span>
        </div>

        <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">Critical Priority</span>
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
          </div>
          <div className="text-2xl font-extrabold text-rose-700 mt-1">{stats?.overview?.criticalTickets || 0}</div>
          <span className="text-[10px] text-rose-600 font-semibold">Immediate attention needed</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">High Priority</span>
          <div className="text-2xl font-extrabold text-amber-700 mt-1">{stats?.overview?.highPriorityTickets || 0}</div>
          <span className="text-[10px] text-slate-400">ISBN & Defective copy tickets</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Resolved / Closed</span>
          <div className="text-2xl font-extrabold text-emerald-700 mt-1">{stats?.overview?.resolvedTickets || 0}</div>
          <span className="text-[10px] text-slate-400">Within standard SLA</span>
        </div>
      </div>

      {/* Main 3-Column Operations Layout */}
      <div className="grid lg:grid-cols-12 gap-6 min-h-[750px]">
        {/* ========================================================
            COLUMN 1: TICKET QUEUE (Filterable, Sortable, Urgent Spot)
           ======================================================== */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          {/* Search & Sort Bar */}
          <div className="p-4 border-b border-slate-100 space-y-3 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Inbox className="w-4 h-4 text-indigo-600" />
                <span>Ticket Queue</span>
                <span className="text-xs text-slate-400 font-normal">({tickets.length})</span>
              </h2>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSortBy(sortBy === 'urgent' ? 'newest' : 'urgent')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 border transition-colors ${
                    sortBy === 'urgent'
                      ? 'bg-rose-50 text-rose-700 border-rose-200 font-bold'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                  title="Spot urgent and oldest unresolved tickets first"
                >
                  <ArrowUpDown className="w-3 h-3" />
                  {sortBy === 'urgent' ? 'Urgent & Oldest' : 'Newest First'}
                </button>
              </div>
            </div>

            {/* Keyword Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search ticket #, author, or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadData()}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>

            {/* Dropdown Filters */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-700"
              >
                <option value="">Status: All</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-2 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-700"
              >
                <option value="">Priority: All</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-2 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-700"
              >
                <option value="">Category: All</option>
                <option value="ROYALTY_PAYMENTS">Royalties</option>
                <option value="ISBN_METADATA">ISBN</option>
                <option value="PRINTING_QUALITY">Printing</option>
                <option value="DISTRIBUTION_AVAILABILITY">Distribution</option>
                <option value="PRODUCTION_UPDATES">Production</option>
                <option value="GENERAL_INQUIRY">General</option>
              </select>
            </div>
          </div>

          {/* Ticket Items List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {tickets.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No tickets match current filters</p>
              </div>
            ) : (
              tickets.map((t) => {
                const isSelected = activeTicket?.id === t.id;
                const isCritical = t.priority === 'CRITICAL';
                const isOldUnresolved = t.status === 'OPEN';

                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTicket(t)}
                    className={`w-full text-left p-3.5 transition-all flex flex-col gap-1.5 relative ${
                      isSelected
                        ? 'bg-indigo-50/70 border-l-4 border-indigo-600'
                        : isCritical
                        ? 'bg-rose-50/30 hover:bg-rose-50/50'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-slate-900">{t.ticketNumber}</span>
                        {isCritical && (
                          <span className="text-[10px] font-extrabold text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded border border-rose-300">
                            URGENT
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <TicketBadge type="priority" value={t.priority} />
                        <TicketBadge type="status" value={t.status} />
                      </div>
                    </div>

                    <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{t.subject}</h4>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {t.description}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                      <span className="font-semibold text-slate-600">{t.author?.name}</span>
                      <span className="font-mono">{new Date(t.createdAt).toLocaleDateString()}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ========================================================
            COLUMN 2: TICKET CONVERSATION & AI DRAFT WORKSPACE
           ======================================================== */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          {activeTicket ? (
            <>
              {/* Ticket Top Bar */}
              <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      {activeTicket.ticketNumber}
                    </span>
                    <TicketBadge type="status" value={activeTicket.status} />
                    <TicketBadge type="priority" value={activeTicket.priority} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-1 line-clamp-1">{activeTicket.subject}</h3>
                </div>

                {/* Status Changer Dropdown */}
                <select
                  value={activeTicket.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500/50"
                >
                  <option value="OPEN">Mark: Open</option>
                  <option value="IN_PROGRESS">Mark: In Progress</option>
                  <option value="RESOLVED">Mark: Resolved</option>
                  <option value="CLOSED">Mark: Closed</option>
                </select>
              </div>

              {/* Message & Audit History */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/20 text-xs">
                {activeTicketDetails?.messages?.map((m: any) => {
                  const isAuthor = m.senderRole === 'AUTHOR';
                  const isInternal = m.isInternalNote;

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isAuthor ? 'items-start' : 'items-end'}`}
                    >
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-0.5 px-1">
                        {isInternal ? (
                          <span className="font-bold text-amber-700 flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Internal Ops Note ({m.sender?.name})
                          </span>
                        ) : isAuthor ? (
                          <span className="font-semibold text-slate-700">Author: {m.sender?.name}</span>
                        ) : (
                          <span className="font-semibold text-indigo-700">Ops: {m.sender?.name}</span>
                        )}
                        <span>•</span>
                        <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      <div
                        className={`max-w-lg p-3 rounded-2xl whitespace-pre-line leading-relaxed shadow-sm ${
                          isInternal
                            ? 'bg-amber-50 text-amber-950 border border-amber-300 font-mono text-[11px]'
                            : isAuthor
                            ? 'bg-white text-slate-800 border border-slate-200'
                            : 'bg-indigo-600 text-white font-medium'
                        }`}
                      >
                        {m.message}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* AI Draft Review Card */}
              {activeTicketDetails?.aiDraftResponse && (
                <div className="p-3 bg-indigo-50/60 border-t border-b border-indigo-100 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-indigo-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      AI-Drafted Response (BookLeaf Knowledge Base Grounded)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={handleRegenerateDraft}
                        disabled={isGeneratingDraft}
                        className="text-[10px] font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-indigo-200"
                        title="Regenerate draft using latest context"
                      >
                        <RefreshCw className={`w-3 h-3 ${isGeneratingDraft ? 'animate-spin' : ''}`} />
                        Regenerate
                      </button>
                      <button
                        onClick={() => setResponseText(activeTicketDetails.aiDraftResponse)}
                        className="text-[10px] font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-indigo-200"
                        title="Copy AI draft to reply textarea"
                      >
                        <Copy className="w-3 h-3" />
                        Insert into Editor
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-indigo-950/80 font-mono line-clamp-3 bg-white/70 p-2 rounded-xl border border-indigo-100">
                    {activeTicketDetails.aiDraftResponse}
                  </p>
                </div>
              )}

              {/* Reply / Internal Note Editor */}
              <div className="p-4 bg-white border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsInternalNote(false)}
                      className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                        !isInternalNote
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Public Response to Author
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsInternalNote(true)}
                      className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1 transition-colors ${
                        isInternalNote
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Lock className="w-3 h-3" />
                      Internal Note (Admins Only)
                    </button>
                  </div>

                  <span className="text-[10px] text-slate-400">
                    {isInternalNote ? '🔒 Invisible to author' : '✉️ Sends email & real-time notification'}
                  </span>
                </div>

                <form onSubmit={handleSendResponse} className="space-y-2.5">
                  <textarea
                    rows={4}
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder={
                      isInternalNote
                        ? 'Add private operations note (e.g. escalated to Repro India batch #982)...'
                        : 'Review, edit, or customize your response to the author...'
                    }
                    className={`w-full p-3 rounded-2xl border text-xs focus:outline-none focus:ring-2 resize-none leading-relaxed ${
                      isInternalNote
                        ? 'border-amber-300 bg-amber-50/40 focus:ring-amber-500/50 text-amber-950 font-mono'
                        : 'border-slate-200 focus:ring-indigo-500/50 text-slate-800'
                    }`}
                  />

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="submit"
                      disabled={isSending || !responseText.trim()}
                      className={`px-5 py-2.5 rounded-xl font-bold text-xs text-white shadow flex items-center gap-1.5 transition-all disabled:opacity-50 ${
                        isInternalNote
                          ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/25'
                          : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/25'
                      }`}
                    >
                      {isSending ? (
                        <span>Processing...</span>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>{isInternalNote ? 'Save Internal Note' : 'Send Author Response'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <Inbox className="w-12 h-12 mb-2 text-slate-300" />
              <h3 className="font-bold text-slate-700">Select a Ticket</h3>
              <p className="text-xs text-slate-400 mt-1">Select an author query to review context and AI draft</p>
            </div>
          )}
        </div>

        {/* ========================================================
            COLUMN 3: AUTHOR CONTEXT & AI TRIAGE OVERRIDES
           ======================================================== */}
        <div className="lg:col-span-3 space-y-4">
          {activeTicketDetails ? (
            <>
              {/* Author Profile Capsule */}
              <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Author Profile
                  </span>
                  <span className="text-[10px] font-mono font-bold text-indigo-600">Verified Partner</span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-900">{activeTicketDetails.author?.name}</h4>
                  <p className="text-xs text-slate-500 font-mono">{activeTicketDetails.author?.email}</p>
                  <p className="text-xs text-slate-500">{activeTicketDetails.author?.phone || 'No phone'}</p>
                </div>

                {/* Bank Account Verification Status */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Bank Linked:</span>
                    {activeTicketDetails.author?.bankAccountLinked ? (
                      <span className="font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Yes
                      </span>
                    ) : (
                      <span className="font-bold text-rose-700 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> NO (Unlinked)
                      </span>
                    )}
                  </div>
                  {activeTicketDetails.author?.bankAccountDetails && (
                    <div className="text-[10px] text-slate-500 font-mono mt-1">
                      {activeTicketDetails.author.bankAccountDetails.bankName} ••••{' '}
                      {activeTicketDetails.author.bankAccountDetails.accountNumberLast4}
                    </div>
                  )}
                </div>
              </div>

              {/* Linked Book Context (if query was regarding a book) */}
              {activeTicketDetails.book && (
                <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-2.5 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Book Context
                    </span>
                    <TicketBadge type="stage" value={activeTicketDetails.book.status} />
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900">{activeTicketDetails.book.title}</h4>
                    <p className="text-[11px] text-slate-500 font-mono">
                      ISBN: {activeTicketDetails.book.isbn || 'Pending'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-400 block">Copies Sold</span>
                      <span className="font-bold text-slate-800">{activeTicketDetails.book.totalCopiesSold}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-400 block">Pending Royalty</span>
                      <span className="font-bold text-amber-600">₹{activeTicketDetails.book.royaltyPending}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Auto-Classification & Override Studio */}
              <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-[11px] font-bold text-indigo-900 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    AI Triage & Overrides
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {Math.round((activeTicketDetails.aiConfidence || 0.95) * 100)}% Conf.
                  </span>
                </div>

                {/* AI Reasoning Pills */}
                {activeTicketDetails.aiClassificationReason && (
                  <div className="p-2 rounded-xl bg-indigo-50/60 border border-indigo-100 text-[11px] text-indigo-950">
                    <span className="font-bold block">AI Reason:</span>
                    {activeTicketDetails.aiClassificationReason}
                  </div>
                )}

                {/* Category Override */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Category Override
                  </label>
                  <select
                    value={overrideCategory}
                    onChange={(e) => handleCategoryOverride(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700"
                  >
                    <option value="ROYALTY_PAYMENTS">Royalty & Payments</option>
                    <option value="ISBN_METADATA">ISBN & Metadata</option>
                    <option value="PRINTING_QUALITY">Printing & Quality</option>
                    <option value="DISTRIBUTION_AVAILABILITY">Distribution & Retail</option>
                    <option value="PRODUCTION_UPDATES">Production Updates</option>
                    <option value="GENERAL_INQUIRY">General Inquiry</option>
                  </select>
                </div>

                {/* Priority Override */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Priority Score Override
                  </label>
                  <select
                    value={overridePriority}
                    onChange={(e) => handlePriorityOverride(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700"
                  >
                    <option value="CRITICAL">Critical (Launch / Missing Royalties)</option>
                    <option value="HIGH">High (ISBN error / Defective copies)</option>
                    <option value="MEDIUM">Medium (Production timeline query)</option>
                    <option value="LOW">Low (General inquiry / Bio update)</option>
                  </select>
                </div>

                {/* Assign Ops Member */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Assignee (Ops Team)
                  </label>
                  <select
                    value={overrideAssignee}
                    onChange={(e) => handleAssigneeChange(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700"
                  >
                    <option value="">Unassigned</option>
                    {stats?.admins?.map((adm: any) => (
                      <option key={adm.id} value={adm.id}>
                        {adm.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 text-center text-slate-400 text-xs">
              Select a ticket to inspect author metadata and configure overrides.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminTicketsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <AdminTicketsContent />
    </Suspense>
  );
}
