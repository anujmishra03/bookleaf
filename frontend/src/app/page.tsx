'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { BookOpen } from 'lucide-react';

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        if (user.role === 'ADMIN') {
          router.push('/admin/tickets');
        } else {
          router.push('/author/dashboard');
        }
      } else {
        router.push('/login');
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-4 text-center max-w-md">
        <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-600/30">
          <BookOpen className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">BookLeaf Publishing Portal</h1>
        <p className="text-xs text-slate-500">
          Redirecting to your authorized workspace...
        </p>
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mt-2"></div>
      </div>
    </div>
  );
}
