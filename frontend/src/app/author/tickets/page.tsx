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
  MessageSquare,
  Clock,
  CheckCircle,
  Paperclip,
  User,
  ShieldCheck,
  ChevronRight,
  BookOpen,
  Sparkles,
} from 'lucide-react';

function AuthorTicketsContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTicketIdParam = searchParams.get('id');

  const [tickets, setTickets] = useState<any[]>([]);
  const [activeTicket, setActiveTicket] = useState<any | null>(null);
  const [activeTicketDetails, setActiveTicketDetails] = useState<any | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch all author tickets
  const fetchTickets = async () => {
    try {
      const res = await api.getTickets();
      if (res.success) {
        setTickets(res.data || []);
        // If query param id is specified or tickets exist, select active
        if (activeTicketIdParam) {
          const match = res.data.find((t: any) => t.id === activeTicketIdParam);
          if (match) setActiveTicket(match);
        } else if (res.data.length > 0 && !activeTicket) {
          setActiveTicket(res.data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load tickets:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchTickets();
  }, [user, activeTicketIdParam]);

  // Fetch detailed conversation thread when active ticket changes
  useEffect(() => {
    if (!activeTicket) return;

    const fetchTicketDetails = async () => {
      try {
        const res = await api.getTicketById(activeTicket.id);
        if (res.success) {
          setActiveTicketDetails(res.data);
          scrollToBottom();
        }
      } catch (err) {
        console.error('Failed to load ticket details:', err);
      }
    };

    fetchTicketDetails();

    // Socket.io real-time join & listener setup
    const socket = getSocket();
    if (socket) {
      socket.emit('join:ticket', activeTicket.id);

      const handleNewMessage = (payload: { ticketId: string; message: any }) => {
        if (payload.ticketId === activeTicket.id) {
          setActiveTicketDetails((prev: any) => {
            if (!prev) return prev;
            // Prevent duplicate messages if already present
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
        // Update ticket in sidebar list
        setTickets((prevList) =>
          prevList.map((t) => (t.id === updatedTicket.id ? { ...t, ...updatedTicket } : t))
        );
      };

      socket.on('message:new', handleNewMessage);
      socket.on('ticket:updated', handleTicketUpdated);

      return () => {
        socket.emit('leave:ticket', activeTicket.id);
        socket.off('message:new', handleNewMessage);
        socket.off('ticket:updated', handleTicketUpdated);
      };
    }
  }, [activeTicket]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || !activeTicket) return;

    setIsSendingReply(true);
    try {
      const res = await api.replyTicket(activeTicket.id, {
        message: replyMessage,
        isInternalNote: false,
      });

      if (res.success && res.data) {
        setReplyMessage('');
        // Real-time socket will deliver the message or we append optimistically
        setActiveTicketDetails((prev: any) => ({
          ...prev,
          messages: [...(prev.messages || []), res.data],
        }));
        scrollToBottom();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to send reply');
    } finally {
      setIsSendingReply(false);
    }
  };

  const filteredTickets = tickets.filter((t) => {
    if (statusFilter === 'ALL') return true;
    return t.status === statusFilter;
  });

  if (!user || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500 font-medium">Loading Support Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Support Tickets & Messages</h1>
            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Sync Active
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time correspondence with BookLeaf Publishing’s operational specialists.
          </p>
        </div>

        <button
          onClick={() => router.push('/author/submit-ticket')}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm flex items-center gap-2 transition-all shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          Submit New Query
        </button>
      </div>

      {/* Main Split Layout: Ticket List & Conversation Thread */}
      <div className="grid lg:grid-cols-12 gap-6 min-h-[650px]">
        {/* Left Column: Tickets Queue */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          {/* Status Filter Tabs */}
          <div className="p-3 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto text-xs">
            {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all shrink-0 ${
                  statusFilter === st
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {st.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          {/* Ticket Items */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredTickets.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-medium">No tickets match this filter</p>
              </div>
            ) : (
              filteredTickets.map((t) => {
                const isSelected = activeTicket?.id === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTicket(t)}
                    className={`w-full text-left p-4 transition-all flex flex-col gap-2 ${
                      isSelected
                        ? 'bg-indigo-50/70 border-l-4 border-indigo-600'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-indigo-700">{t.ticketNumber}</span>
                      <TicketBadge type="status" value={t.status} />
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{t.subject}</h4>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {t.description}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                      <TicketBadge type="category" value={t.category} />
                      <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Ticket Conversation & Response Studio */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          {activeTicket ? (
            <>
              {/* Ticket Detail Header */}
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      {activeTicket.ticketNumber}
                    </span>
                    <TicketBadge type="status" value={activeTicket.status} />
                    <TicketBadge type="priority" value={activeTicket.priority} />
                    <TicketBadge type="category" value={activeTicket.category} />
                  </div>
                  <h2 className="text-base font-bold text-slate-900 mt-2">{activeTicket.subject}</h2>
                  {activeTicketDetails?.book && (
                    <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Book: {activeTicketDetails.book.title} (ISBN: {activeTicketDetails.book.isbn || 'Pending'})</span>
                    </div>
                  )}
                </div>

                <div className="text-[11px] text-slate-400 shrink-0">
                  Opened: {new Date(activeTicket.createdAt).toLocaleString()}
                </div>
              </div>

              {/* Message Thread */}
              <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/30">
                {activeTicketDetails?.messages?.map((msg: any) => {
                  const isAdmin = msg.senderRole === 'ADMIN';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isAdmin ? 'items-start' : 'items-end'}`}
                    >
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1 px-1">
                        {isAdmin ? (
                          <>
                            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                            <span className="font-semibold text-slate-700">{msg.sender?.name || 'BookLeaf Operations Team'}</span>
                          </>
                        ) : (
                          <>
                            <span className="font-semibold text-slate-700">You ({user.name})</span>
                            <User className="w-3.5 h-3.5 text-slate-500" />
                          </>
                        )}
                        <span>•</span>
                        <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      <div
                        className={`max-w-xl rounded-2xl p-4 text-xs sm:text-sm leading-relaxed whitespace-pre-line shadow-sm ${
                          isAdmin
                            ? 'bg-white text-slate-800 border border-slate-200'
                            : 'bg-indigo-600 text-white font-medium'
                        }`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Box */}
              <div className="p-4 border-t border-slate-100 bg-white">
                <form onSubmit={handleSendReply} className="space-y-3">
                  <div className="relative">
                    <textarea
                      rows={3}
                      placeholder="Type your response to the BookLeaf operations team..."
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      ⚡ Replies sync directly to our active operations queue.
                    </span>
                    <button
                      type="submit"
                      disabled={isSendingReply || !replyMessage.trim()}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow flex items-center gap-1.5 transition-all disabled:opacity-50"
                    >
                      {isSendingReply ? (
                        <span>Sending...</span>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Send Reply</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <MessageSquare className="w-12 h-12 mb-2 text-slate-300" />
              <h3 className="font-bold text-slate-700">No Ticket Selected</h3>
              <p className="text-xs text-slate-400 mt-1">Select a ticket from the left queue to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AuthorTicketsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <AuthorTicketsContent />
    </Suspense>
  );
}
