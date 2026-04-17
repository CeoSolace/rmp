import '../app/globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'RampChat',
  description: 'Basic chat platform built with Next.js, Appwrite and Cloudinary',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-900 text-gray-100">
        {children}
      </body>
    </html>
  );
}