// apps/web/components/auth/LoginForm.tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login, signup } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { error: authError } = isSignUp
        ? await signup(email, password, name || undefined)
        : await login(email, password);

      if (authError) {
        setError(authError.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {isSignUp && (
        <div className="space-y-2">
          <label htmlFor="name" className="block text-[10px] font-mono uppercase tracking-[0.2em] text-foreground/60">
            Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 bg-transparent border border-foreground/20 text-foreground placeholder-foreground/30 focus:border-foreground/50 focus:outline-none transition-colors text-sm"
            placeholder="Your name"
          />
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="email" className="block text-[10px] font-mono uppercase tracking-[0.2em] text-foreground/60">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-3 bg-transparent border border-foreground/20 text-foreground placeholder-foreground/30 focus:border-foreground/50 focus:outline-none transition-colors text-sm"
          placeholder="you@example.com"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="block text-[10px] font-mono uppercase tracking-[0.2em] text-foreground/60">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-4 py-3 bg-transparent border border-foreground/20 text-foreground placeholder-foreground/30 focus:border-foreground/50 focus:outline-none transition-colors text-sm"
          placeholder="••••••••"
        />
      </div>

      {error && (
        <div className="text-red-500/80 text-[10px] font-mono uppercase tracking-wider">{error}</div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full px-4 py-3 bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50 transition-colors text-[10px] font-mono uppercase tracking-[0.2em]"
      >
        {isLoading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Login'}
      </button>

      <button
        type="button"
        onClick={() => setIsSignUp(!isSignUp)}
        className="w-full text-[10px] font-mono uppercase tracking-[0.2em] text-foreground/40 hover:text-foreground/70 transition-colors"
      >
        {isSignUp ? '← Already have an account' : "Don't have an account? Sign up →"}
      </button>
    </form>
  );
}
