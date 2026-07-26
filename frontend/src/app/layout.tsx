import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Signal | Simple. Powerful. Secure.',
  description: 'A pixel-perfect Signal Messenger web application featuring real-time WebSockets, group messaging, disappearing messages, and privacy-focused UI.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#121212] text-white antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
