import './globals.css';
import { Analytics } from '@vercel/analytics/next';

export const metadata = {
  title: 'Talent Connect — Join Our Global Consulting Network',
  description:
    'Upload your resume and let AI build your profile. Join our network of part-time consultants working across UK, Europe, USA, and Middle East.',
  openGraph: {
    title: 'Talent Connect',
    description: 'Join our global part-time consulting network — powered by AI.',
    type: 'website',
  },
  icons: {
    icon: [
      { url: '/favicon.ico',  sizes: 'any' },
      { url: '/favicon.svg',  type: 'image/svg+xml' },
      { url: '/favicon.png',  type: 'image/png', sizes: '32x32' },
    ],
    shortcut: '/favicon.ico',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
