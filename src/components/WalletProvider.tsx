"use client";

import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { Network } from "@aptos-labs/ts-sdk";

// Get network from environment
const getNetwork = (): Network => {
  const network = process.env.NEXT_PUBLIC_NETWORK?.toLowerCase();
  switch (network) {
    case 'testnet':
      return Network.TESTNET;
    case 'devnet':
      return Network.DEVNET;
    case 'mainnet':
    default:
      return Network.MAINNET;
  }
};

export function WalletProvider({ children }: { children: React.ReactNode }) {
  return (
    <AptosWalletAdapterProvider
      autoConnect={true}
      dappConfig={{
        network: getNetwork(),
      }}
      optInWallets={["Petra"]} // Start with Petra, add others as supported
      onError={(error) => {
        console.error("Wallet error:", error);
        // In production, send to monitoring service
        if (process.env.NODE_ENV === 'production') {
          // Send to monitoring service like Sentry
          // Sentry.captureException(error);
        }
      }}
    >
      {children}
    </AptosWalletAdapterProvider>
  );
}
