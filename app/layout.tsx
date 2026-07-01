import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';
import Providers from './components/providers/Providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Shelve — Your Personal Library',
  description: 'A personal library management system with AI recommendations',
    icons: {
    icon: '/favicon.ico',
    apple: '/apple-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-[#0f0e0c] text-[#f0ede8] overflow-x-hidden`}>
        <Providers>
          <div className="flex min-h-screen flex-col lg:flex-row">
            <Sidebar />
            <main className="flex-1 pb-20 lg:ml-60 lg:pb-0">
              <Topbar />
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}