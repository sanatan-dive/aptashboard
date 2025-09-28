
import "./globals.css";
import { WalletProvider } from "@/components/WalletProvider";
import Navigation from "@/components/Navigation";
import { Inter } from 'next/font/google';


// If Satoshi is not available via next/font/google, we'll use a web font
const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <title>Aptash - DeFi Platform</title>
        <meta name="description" content="AI-powered DeFi platform on Aptos blockchain" />
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link href="https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,600,700,800,900&display=swap" rel="stylesheet" />
      </head>
      <body 
        className={`bg-[#141412] text-white min-h-screen antialiased ${inter.variable}`}
        style={{
          fontFamily: "'Satoshi', var(--font-inter), system-ui, sans-serif",
        }}
      >
        <WalletProvider>
          <main className="bg-[#141412]" style={{ scrollbarWidth: "none" }}>
            <Navigation />
            {children}
          </main>
        </WalletProvider>
      </body>
    </html>
  );
}