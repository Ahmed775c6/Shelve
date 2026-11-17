'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import ScheduledReading from '../components/reading/ScheduledReading';

export default function ReadingPlannerWindowPage() {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth/signin');
    }
  }, [router, status]);

  if (status !== 'authenticated') {
    return (
      <main className="page-shell flex min-h-screen items-center justify-center">
        <p className="text-sm text-[#9b9890]" role="status">Opening your reading planner…</p>
      </main>
    );
  }

  return (
    <main className="page-shell min-h-screen">
      <div className="mx-auto max-w-4xl">
        <header className="mb-6">
          <h1 className="font-serif text-2xl text-[#f0ede8]">Reading planner</h1>
          <p className="mt-1 text-sm text-[#9b9890]">Set a time, choose your books, and track your progress.</p>
        </header>
        <ScheduledReading />
      </div>
    </main>
  );
}
