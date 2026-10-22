import React from 'react';
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  DollarSign,
  Barcode,
  Printer,
  Globe,
  BookOpen,
  HelpCircle,
} from 'lucide-react';

interface BadgeProps {
  type: 'category' | 'priority' | 'status' | 'stage';
  value: string;
  size?: 'sm' | 'md';
}

export const TicketBadge: React.FC<BadgeProps> = ({ type, value, size = 'sm' }) => {
  const pad = size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  if (type === 'priority') {
    switch (value) {
      case 'CRITICAL':
        return (
          <span
            className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950 dark:text-rose-200 ${pad}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping"></span>
            Critical
          </span>
        );
      case 'HIGH':
        return (
          <span
            className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950 dark:text-amber-200 ${pad}`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            High
          </span>
        );
      case 'MEDIUM':
        return (
          <span
            className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-sky-100 text-sky-800 border border-sky-300 dark:bg-sky-950 dark:text-sky-200 ${pad}`}
          >
            Medium
          </span>
        );
      default:
        return (
          <span
            className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 ${pad}`}
          >
            Low
          </span>
        );
    }
  }

  if (type === 'status') {
    switch (value) {
      case 'OPEN':
        return (
          <span
            className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-950 dark:text-blue-200 ${pad}`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            Open
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span
            className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-purple-100 text-purple-800 border border-purple-300 dark:bg-purple-950 dark:text-purple-200 ${pad}`}
          >
            <Clock className="w-3.5 h-3.5 text-purple-600" />
            In Progress
          </span>
        );
      case 'RESOLVED':
        return (
          <span
            className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 ${pad}`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Resolved
          </span>
        );
      case 'CLOSED':
        return (
          <span
            className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 ${pad}`}
          >
            <XCircle className="w-3.5 h-3.5 text-slate-500" />
            Closed
          </span>
        );
      default:
        return <span>{value}</span>;
    }
  }

  if (type === 'category') {
    switch (value) {
      case 'ROYALTY_PAYMENTS':
        return (
          <span className={`inline-flex items-center gap-1.5 font-medium rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 ${pad}`}>
            <DollarSign className="w-3.5 h-3.5" />
            Royalty & Payments
          </span>
        );
      case 'ISBN_METADATA':
        return (
          <span className={`inline-flex items-center gap-1.5 font-medium rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 ${pad}`}>
            <Barcode className="w-3.5 h-3.5" />
            ISBN & Metadata
          </span>
        );
      case 'PRINTING_QUALITY':
        return (
          <span className={`inline-flex items-center gap-1.5 font-medium rounded-md bg-rose-50 text-rose-700 border border-rose-200 ${pad}`}>
            <Printer className="w-3.5 h-3.5" />
            Printing & Quality
          </span>
        );
      case 'DISTRIBUTION_AVAILABILITY':
        return (
          <span className={`inline-flex items-center gap-1.5 font-medium rounded-md bg-cyan-50 text-cyan-700 border border-cyan-200 ${pad}`}>
            <Globe className="w-3.5 h-3.5" />
            Distribution & Retail
          </span>
        );
      case 'PRODUCTION_UPDATES':
        return (
          <span className={`inline-flex items-center gap-1.5 font-medium rounded-md bg-purple-50 text-purple-700 border border-purple-200 ${pad}`}>
            <BookOpen className="w-3.5 h-3.5" />
            Book Status & Production
          </span>
        );
      default:
        return (
          <span className={`inline-flex items-center gap-1.5 font-medium rounded-md bg-slate-100 text-slate-700 border border-slate-200 ${pad}`}>
            <HelpCircle className="w-3.5 h-3.5" />
            General Inquiry
          </span>
        );
    }
  }

  if (type === 'stage') {
    const isLive = value === 'PUBLISHED_LIVE';
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-medium rounded-full ${
          isLive
            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
            : 'bg-amber-100 text-amber-800 border border-amber-300'
        } ${pad}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-600' : 'bg-amber-600'}`}></span>
        {value.replace(/_/g, ' ')}
      </span>
    );
  }

  return <span>{value}</span>;
};
