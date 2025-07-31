"use client";

import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { Network } from "@aptos-labs/ts-sdk";

export function WalletProvider({ children }: { children: React.ReactNode }) {
  return (
    <AptosWalletAdapterProvider
      autoConnect={true}
      dappConfig={{
        network: Network.MAINNET,
        aptosApiKey: "AG-CTJWTKP8GXVSL2QZ4NKH2ZY2JMF41UATX",
      }}
      optInWallets={["Petra"]}
      onError={(error) => {
        console.log("wallet error", error);
      }}
    >
      {children}
    </AptosWalletAdapterProvider>
  );
}
