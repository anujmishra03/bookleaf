'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  BookOpen,
  Inbox,
  Send,
  Library,
  LogOut,
  ShieldCheck,
  UserCheck,
  Building2,
  ChevronDown,
  Sparkles,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout, login } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showSwitchMenu, setShowSwitchMenu] = useState(false);

  if (!user) return null;

  const isAdmin = user.role === 'ADMIN';

  const testAccounts = [
    { name: 'Aditi Varma (Admin / Ops Lead)', email: 'admin@bookleafpub.com', role: 'ADMIN', desc: 'Full ops queue, AI triage & response drafting' },
    { name: 'Priya Sharma (Author - AUTH001)', email: 'priya.sharma@email.com', role: 'AUTHOR', desc: 'Whispers of the Ganges (₹3,570 pending royalty)' },
    { name: 'Rohit Kapoor (Author - AUTH002)', email: 'rohit.kapoor@email.com', role: 'AUTHOR', desc: 'Startup Sutra & Code & Karma (₹13,024 royalties)' },
    { name: 'Sneha Kulkarni (Author - AUTH007)', email: 'sneha.kulkarni@email.com', role: 'AUTHOR', desc: 'Midnight in Mysore: In Production (Cover Design)' },
    { name: 'Kavita Deshmukh (Author - AUTH009)', email: 'kavita.deshmukh@email.com', role: 'AUTHOR', desc: 'Nagpur Notebooks: ₹850 (< ₹1,000 threshold rollover)' },
    { name: 'Arjun Malhotra (Author - AUTH006)', email: 'arjun.malhotra@email.com', role: 'AUTHOR', desc: 'Turban Tales: ₹2,464 pending (Unlinked Bank Account)' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 dark:bg-slate-900/95 dark:border-slate-800 transition-colors shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => router.push(isAdmin ? '/admin/tickets' : '/author/dashboard')}
            className="flex items-center gap-2.5 text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-700 via-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">
                  BookLeaf
                </span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold dark:bg-indigo-950 dark:text-indigo-300">
                  {isAdmin ? 'Ops Portal' : 'Author Portal'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">Support & Communication Hub</p>
            </div>
          </button>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 ml-4">
            {isAdmin ? (
              <>
                <button
                  onClick={() => router.push('/admin/tickets')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    pathname?.startsWith('/admin/tickets')
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                  }`}
                >
                  <Inbox className="w-4 h-4" />
                  Ticket Queue
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => router.push('/author/dashboard')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    pathname === '/author/dashboard'
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  Overview
                </button>

                <button
                  onClick={() => router.push('/author/books')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    pathname?.startsWith('/author/books')
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                  }`}
                >
                  <Library className="w-4 h-4" />
                  My Books
                </button>

                <button
                  onClick={() => router.push('/author/submit-ticket')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    pathname === '/author/submit-ticket'
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                  }`}
                >
                  <Send className="w-4 h-4" />
                  Submit Query
                </button>

                <button
                  onClick={() => router.push('/author/tickets')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    pathname?.startsWith('/author/tickets')
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                  }`}
                >
                  <Inbox className="w-4 h-4" />
                  My Tickets
                </button>
              </>
            )}
          </nav>
        </div>

        {/* Right Section: Quick Switcher + User Profile */}
        <div className="flex items-center gap-3">
          {/* Quick Demo Persona Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowSwitchMenu(!showSwitchMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors shadow-sm"
              title="Switch demo personas to test all edge cases"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Switch Persona</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>

            {showSwitchMenu && (
              <div
                className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                onMouseLeave={() => setShowSwitchMenu(false)}
              >
                <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-700">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Instant Demo Switcher
                  </p>
                </div>
                {testAccounts.map((acc) => (
                  <button
                    key={acc.email}
                    onClick={async () => {
                      setShowSwitchMenu(false);
                      await login(acc.email, 'password123');
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex flex-col hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${
                      user.email === acc.email ? 'bg-indigo-50/50 dark:bg-indigo-950/30' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-100">
                      <span>{acc.name}</span>
                      {user.email === acc.email && (
                        <span className="text-[10px] text-indigo-600 font-bold">Active</span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {acc.desc}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* User profile capsule */}
          <div className="hidden lg:flex items-center gap-2.5 pl-3 border-l border-slate-200 dark:border-slate-700">
            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-200">
              {user.name.charAt(0)}
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">
                {user.name}
              </p>
              <div className="flex items-center gap-1">
                {isAdmin ? (
                  <span className="flex items-center gap-0.5 text-[10px] font-bold text-indigo-600">
                    <ShieldCheck className="w-3 h-3" /> Ops Admin
                  </span>
                ) : (
                  <span className="flex items-center gap-0.5 text-[10px] font-medium text-emerald-600">
                    <UserCheck className="w-3 h-3" /> Author
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
