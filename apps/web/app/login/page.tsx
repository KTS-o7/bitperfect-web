// apps/web/app/login/page.tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { LoginForm } from '@/components/auth/LoginForm';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-gray-900 p-8 border border-gray-800">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Welcome to Bitperfect</h1>
          <p className="mt-2 text-sm text-gray-400">
            Login to sync your playlists across devices
          </p>
        </div>

        <div className="space-y-4">
          <GoogleButton />
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-gray-900 px-2 text-gray-500">Or</span>
            </div>
          </div>

          <LoginForm />
        </div>

        <div className="text-center text-sm text-gray-500">
          <a href="/" className="hover:text-gray-300">
            Continue as guest →
          </a>
        </div>
      </div>
    </div>
  );
}
