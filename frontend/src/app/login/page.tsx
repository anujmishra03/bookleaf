'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { BookOpen, Shield, User, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    }
  };

  const quickLogins = [
    {
      role: 'Operations Admin',
      name: 'Aditi Varma (Ops Lead)',
      email: 'admin@bookleafpub.com',
      badge: 'Full ops queue, AI triage & response drafting',
      color: 'border-indigo-300 bg-indigo-50/50 hover:bg-indigo-100/70 text-indigo-950',
    },
    {
      role: 'Author (Published + Pending Royalty)',
      name: 'Priya Sharma (AUTH001)',
      email: 'priya.sharma@email.com',
      badge: 'Whispers of the Ganges (₹3,570 pending payout)',
      color: 'border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100/70 text-emerald-950',
    },
    {
      role: 'Author (Multi-Book Catalog)',
      name: 'Rohit Kapoor (AUTH002)',
      email: 'rohit.kapoor@email.com',
      badge: 'Code & Karma & Startup Sutra (2,079 copies sold)',
      color: 'border-sky-300 bg-sky-50/50 hover:bg-sky-100/70 text-sky-950',
    },
    {
      role: 'Author (In Production - Cover Design)',
      name: 'Sneha Kulkarni (AUTH007)',
      email: 'sneha.kulkarni@email.com',
      badge: 'Midnight in Mysore: In Production (Cover Design)',
      color: 'border-purple-300 bg-purple-50/50 hover:bg-purple-100/70 text-purple-950',
    },
    {
      role: 'Author (Threshold Rollover Policy)',
      name: 'Kavita Deshmukh (AUTH009)',
      email: 'kavita.deshmukh@email.com',
      badge: 'Nagpur Notebooks: ₹850 (< ₹1,000 threshold rollover)',
      color: 'border-amber-300 bg-amber-50/50 hover:bg-amber-100/70 text-amber-950',
    },
    {
      role: 'Author (Unlinked Bank Account)',
      name: 'Arjun Malhotra (AUTH006)',
      email: 'arjun.malhotra@email.com',
      badge: 'Turban Tales: ₹2,464 held due to missing bank info',
      color: 'border-rose-300 bg-rose-50/50 hover:bg-rose-100/70 text-rose-950',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-indigo-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl grid md:grid-cols-12 gap-8 bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden">
        {/* Left Form Column */}
        <div className="md:col-span-7 p-8 sm:p-10 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-700 to-sky-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">BookLeaf Publishing</h1>
                <p className="text-xs text-slate-500 font-medium">Author Support & Operations Communication Portal</p>
              </div>
            </div>

            <h2 className="text-xl font-bold text-slate-800 mb-1">Sign In to Your Portal</h2>
            <p className="text-sm text-slate-500 mb-6">
              Access your published books, royalty statements, and real-time support tickets.
            </p>

            {error && (
              <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
                <span>⚠️ {error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="author@example.com or admin@bookleafpub.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-600 transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-600 transition-all text-sm"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">Default seed password: password123</span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>Enter Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 text-xs text-slate-400 text-center">
            BookLeaf Publishing • 1,200+ Books Monthly • 22,000+ Active Catalog
          </div>
        </div>

        {/* Right Quick Test Selector Column */}
        <div className="md:col-span-5 bg-slate-50 p-6 sm:p-8 border-t md:border-t-0 md:border-l border-slate-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Instant Evaluator Presets
              </h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Click any role to test authentic data & edge cases immediately:
            </p>

            <div className="space-y-2.5">
              {quickLogins.map((item) => (
                <button
                  key={item.email}
                  type="button"
                  onClick={() => {
                    setEmail(item.email);
                    setPassword('password123');
                    login(item.email, 'password123');
                  }}
                  className={`w-full text-left p-3 rounded-xl border transition-all shadow-sm ${item.color} flex flex-col group`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      {item.role.includes('Admin') ? (
                        <Shield className="w-3.5 h-3.5 text-indigo-600" />
                      ) : (
                        <User className="w-3.5 h-3.5 text-slate-600" />
                      )}
                      {item.name}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-slate-400 group-hover:text-indigo-600">
                      Login →
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-600 font-medium mt-1">
                    {item.badge}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {item.email}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 p-3 rounded-xl bg-white border border-slate-200 text-[11px] text-slate-500 space-y-1">
            <div className="font-semibold text-slate-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Seed Dataset Verified
            </div>
            <p>10 Authors, 18 Books, Real-time Socket.IO, and AI auto-classification pre-seeded.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
