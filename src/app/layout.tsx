
import "./globals.css";
import { WalletProvider } from "@/components/WalletProvider";
import Navigation from "@/components/Navigation";

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
      </head>
      <body className="bg-white text-black min-h-screen antialiased">
        <WalletProvider>
          <Navigation />
          <main className="container mx-auto px-4 py-6 max-w-7xl">
            {children}
          </main>
        </WalletProvider>
      </body>
    </html>
  );
}