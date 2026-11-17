'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';

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
    <div className="auth-window-layout min-h-screen bg-[#0f0e0c] w-full flex h-screen">
  
        {children}
     
    </div>
  );
}