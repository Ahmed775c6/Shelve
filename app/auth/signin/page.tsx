'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
      } else {
        router.push('/');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl: '/' });
  };

  return (
    <div className="bg-[#1a1916] border border-[rgba(255,255,255,0.07)] rounded-xl p-8 max-w-md">
      <div className="text-center mb-8">
        <div className="w-12 h-12 bg-[#c9a96e] rounded-lg flex items-center justify-center text-2xl mx-auto mb-4">
          📚
        </div>
        <h1 className="font-serif text-2xl text-[#f0ede8] mb-1">Welcome back</h1>
        <p className="text-sm text-[#9b9890]">Sign in to your Shelve library</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-[rgba(224,82,82,0.1)] border border-[rgba(224,82,82,0.25)] rounded-lg text-sm text-[#e05252]">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[11px] text-[#5c5a56] uppercase tracking-wider mb-1.5">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5c5a56]" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full bg-[#0f0e0c] border border-[rgba(255,255,255,0.07)] rounded-lg pl-10 pr-3 py-2.5 text-sm text-[#f0ede8] placeholder:text-[#5c5a56] focus:border-[#c9a96e] outline-none transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] text-[#5c5a56] uppercase tracking-wider mb-1.5">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5c5a56]" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className="w-full bg-[#0f0e0c] border border-[rgba(255,255,255,0.07)] rounded-lg pl-10 pr-10 py-2.5 text-sm text-[#f0ede8] placeholder:text-[#5c5a56] focus:border-[#c9a96e] outline-none transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5c5a56] hover:text-[#9b9890] transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-[#c9a96e] text-[#1a1510] rounded-lg text-sm font-medium hover:bg-[#d4b47a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[rgba(255,255,255,0.07)]"></div>
          </div>
          <div className="relative flex justify-center text-xs text-[#5c5a56]">
            <span className="px-2 bg-[#1a1916]">Or continue with</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={handleGoogleSignIn}
            className="flex items-center justify-center gap-2 py-2 bg-[#0f0e0c] border border-[rgba(255,255,255,0.07)] rounded-lg text-sm text-[#9b9890] hover:text-[#f0ede8] hover:border-[rgba(255,255,255,0.12)] transition-colors"
          >
         
            Google
          </button>
          <button
            onClick={() => signIn('github', { callbackUrl: '/' })}
            className="flex items-center justify-center gap-2 py-2 bg-[#0f0e0c] border border-[rgba(255,255,255,0.07)] rounded-lg text-sm text-[#9b9890] hover:text-[#f0ede8] hover:border-[rgba(255,255,255,0.12)] transition-colors"
          >
        
            GitHub
          </button>
        </div>
      </div>

      <div className="mt-6 text-center">
        <p className="text-sm text-[#5c5a56]">
          Don't have an account?{' '}
          <Link href="/auth/signup" className="text-[#c9a96e] hover:text-[#d4b47a] transition-colors">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}