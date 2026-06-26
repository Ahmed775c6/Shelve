'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Providers from '../components/providers/Providers';
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();

  // If user is already authenticated, redirect to home
  if (status === 'authenticated') {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-[#0f0e0c] w-full flex items-center justify-center p-4">
      <div className="w-full ">
        {children}
      </div>
    </div>
  );
}