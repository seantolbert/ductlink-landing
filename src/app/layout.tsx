import type { Metadata, Viewport } from 'next';
import { Inter, Manrope } from 'next/font/google';
import './globals.css';

const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', weight: ['600', '700', '800'] });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ductlink.com'),
  title: { default: 'DuctLink: duct orders your shop can actually build', template: '%s · DuctLink' },
  description:
    'Give your HVAC customers an order link. Techs build elbows, transitions, and boxes on their phone with every dimension filled in, and your shop works the orders from one inbox.',
  icons: { icon: [{ url: '/favicon.ico', sizes: '48x48' }, { url: '/favicon.svg', type: 'image/svg+xml' }], apple: '/apple-touch-icon.png' },
};

export const viewport: Viewport = { themeColor: '#1b2430' };

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${manrope.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
