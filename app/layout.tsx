import type { Metadata } from 'next';
import './globals.css';
import NavBar from '@/components/NavBar';

export const metadata: Metadata = {
  title: 'Game Hub — Wheel Picker & Nexora',
  description: 'Two games in one place: a spin-the-wheel prize picker and the Nexora endless runner.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <NavBar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</div>
      </body>
    </html>
  );
}
