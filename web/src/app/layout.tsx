import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

const sansFont = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
});

const monoFont = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'QuotaGrid — sell unused AI quota on Monad',
  description:
    'Decentralized marketplace for trading unused AI API quota with on-chain escrow and settlement on Monad.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sansFont.variable} ${monoFont.variable} dark`}>
      <body className="min-h-screen flex flex-col bg-[#0b0a10] text-[#f4f2fa] font-sans antialiased selection:bg-[#8b5cf6]/30">
        <Providers>
          <Header />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
