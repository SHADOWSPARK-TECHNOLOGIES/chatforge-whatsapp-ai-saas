import type { Metadata } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'CHATFORGE — WhatsApp AI sales agent for Nigerian SMEs',
  description: 'A 24/7 WhatsApp AI sales rep that talks English + Pidgin, qualifies leads, quotes, takes Paystack payment and escalates to a human.',
  metadataBase: new URL('https://chatforge.shadowspark.tech'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
