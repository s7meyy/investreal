import type { Metadata } from 'next';
import { IBM_Plex_Sans_Arabic } from 'next/font/google';
import './globals.css';

const arabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-arabic',
});

export const metadata: Metadata = {
  title: 'دراسة جدوى الفرص الإيجارية طويلة المدى',
  description:
    'احسب العائد الحقيقي لفرصة استئجار طويلة المدى بدفعة مقدّمة، واعرف سقفك التفاوضي قبل أن تفاوض.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={arabic.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
