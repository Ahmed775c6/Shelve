import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from './components/providers/theme-provider';
import Providers from './components/providers/Providers';

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
    <html lang="en" className="font-sans" suppressHydrationWarning>
      <body className="overflow-x-hidden">
        <Providers>
    <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}