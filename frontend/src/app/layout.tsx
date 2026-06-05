import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import Providers from '@/components/providers/Providers';

export const metadata: Metadata = {
  title: 'Ikonex Academy SMS',
  description: 'Student Management System for Ikonex Academy',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">
        <Providers>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#0f172a',
                color: '#f8fafc',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '500',
              },
              success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
