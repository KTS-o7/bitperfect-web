// apps/web/app/login/page.tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { LoginForm } from '@/components/auth/LoginForm';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function LoginPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-foreground/10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex flex-col gap-[2px]">
              <div className="w-3 h-[2px] bg-[#FF9FCF]" />
              <div className="w-3 h-[2px] bg-[#9AC0FF]" />
              <div className="w-3 h-[2px] bg-[#7FEDD0]" />
            </div>
            <h1 className="text-base font-mono uppercase tracking-widest text-foreground leading-tight">
              BITPERFECT
            </h1>
          </Link>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-73px)] items-center justify-center px-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-mono uppercase tracking-widest text-foreground">
              Login
            </h1>
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-foreground/40">
              Sync your playlists across devices
            </p>
          </div>

          <div className="p-8 border border-foreground/10 bg-foreground/[0.02]">
            <LoginForm />
          </div>

          <div className="text-center">
            <Link 
              href="/" 
              className="text-[10px] font-mono uppercase tracking-[0.2em] text-foreground/40 hover:text-foreground/70 transition-colors"
            >
              ← Continue as guest
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
