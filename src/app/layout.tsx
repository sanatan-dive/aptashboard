
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
      <body className="bg-[#141412]  text-white min-h-screen antialiased"
      style={{
        scrollbarWidth: "none",
      }}>
        <WalletProvider>
          
          <main className="bg-[#141412] " 
          style={{ scrollbarWidth: "none" }}>
            <Navigation />
            {children}
          </main>
        </WalletProvider>
      </body>
    </html>
  );
}