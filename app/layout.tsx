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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-[#0f0e0c] text-[#f0ede8]`}>
        <Providers>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 ml-60">
              <Topbar />
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}