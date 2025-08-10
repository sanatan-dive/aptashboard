"use client";
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react/jsx-no-comment-textnodes */

import React, { useState } from "react";
import GlowButton from "./ui/glow-button";

function Hero() {
  const [selectedChain, setSelectedChain] = useState(null);

  const handleChainClick = (chain) => {
    setSelectedChain(chain);
  };

  const getChainClasses = (chain) => (
    selectedChain === chain
      ? "bg-white text-black py-10 px-20 rounded-xl text-2xl flex items-center gap-4 shadow-2xl scale-110 transform transition-transform hover:-translate-y-1 hover:shadow-[0_10px_20px_rgba(0,0,0,0.5)]"
      : "bg-gradient-to-r from-stone-500/30 to-stone-900/30 backdrop-blur-md py-10 px-20 rounded-xl text-2xl flex items-center gap-4 shadow-2xl opacity-80 transform transition-transform hover:-translate-y-1 hover:shadow-[0_10px_20px_rgba(0,0,0,0.5)]"
  );

  return (
    <div className="min-h-screen  w-full relative text-white overflow-hidden">
      {/* Top Left Blurred Circle */}
      <div
        className="absolute top-0 -left-20 z-50 w-90 h-90 rounded-full bg-white opacity-10 blur-[100px] pointer-events-none"
      />

      {/* Bottom Right Blurred Circle */}
      <div
        className="absolute bottom-40 -right-30 w-90 h-90 rounded-full bg-white opacity-10 blur-[100px] pointer-events-none"
      />

      {/* Top Grid Background */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, #1A1A18 1px, transparent 1px),
            linear-gradient(to bottom, #1A1A18 1px, transparent 1px)
          `,
          backgroundSize: "120px 120px",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 70% at 50% 50%, #000 60%, transparent 100%)",
          maskImage:
            "radial-gradient(ellipse 70% 70% at 50% 50%, #000 60%, transparent 100%)",
        }}
      />
      
      {/* Bottom Glow with Stars */}
      <div className="absolute -bottom-80 left-1/2 -translate-x-1/2 min-w-screen h-[800px] pointer-events-none">
        <div
          className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-[73%] min-w-[3000px] h-[3000px] rounded-full opacity-60"
          style={{
            backgroundColor: 'black',
            boxShadow: 'inset 0 0 100px 20px rgba(255, 255, 255, 0.1), inset 0 0 200px 50px rgba(255, 255, 255, 0.2)',
            backgroundImage:
              "radial-gradient(white 1px, transparent 1px), radial-gradient(white 1px, transparent 1px)",
            backgroundSize: "100px 100px, 100px 100px",
            backgroundPosition: "0 0, 25px 25px",
          }}
        />
      </div>
      
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center pt-32 px-6">
        <GlowButton className="mb-8">Trusted Platform</GlowButton>
        
        <h1 className="text-4xl md:text-6xl font-medium leading-snug">
          Revolutionize Your Transactions
        </h1>
        <h1 className="text-4xl md:text-6xl font-medium">
          With Secure Blockchain Solutions
        </h1>
        
        <p className="text-lg font-medium text-stone-400 max-w-3xl mt-8">
          Experience the future of finance with our AI-powered DeFi platform on
          the Aptos blockchain. Seamlessly connect your wallet and explore a
          world of decentralized finance.
        </p>
        
        <button className="mt-8 bg-white text-black text-lg font-bold px-12 py-4 rounded-full hover:bg-gray-200 transition">
          Get Started
        </button>
        
        <div className="mt-40 flex flex-col items-center gap-4">
          <GlowButton className="rounded-full">
            <h1 className="bg-gradient-to-r bg-clip-text text-transparent text-lg from-stone-400 via-stone-100 to-stone-400">
              Our Partners
            </h1>
          </GlowButton>
          <h1 className="text-2xl md:text-4xl font-medium text-center">
            Leading the Way in Crypto Trust with Aptash
          </h1>
          
          <div className="flex items-center gap-6 mt-8">
            <div
              className={`${getChainClasses("Aptos")} font-mono text-4xl cursor-pointer w-64 h-32 flex items-center justify-center gap-4`}
              onClick={() => handleChainClick("Aptos")}
            >
              <span>Apt</span>
              <img src="apt-aptos-logo.svg" alt="Aptos Logo" className="w-10 h-10" />
              <span>s</span>
            </div>
            <div
              className={`${getChainClasses("Sui")} cursor-pointer w-64 h-32 flex items-center justify-center gap-4`}
              onClick={() => handleChainClick("Sui")}
            >
              <img src="https://assets.crypto.ro/logos/sui-sui-logo.png" alt="Sui Logo" className="w-10 h-10" />
              <span>Sui</span>
            </div>
            <div
              className={`${getChainClasses("Tron")} font-mono cursor-pointer w-64 h-32 flex items-center justify-center gap-4`}
              onClick={() => handleChainClick("Tron")}
            >
              <img src="tron-trx-seeklogo.svg" alt="Tron Logo" className="w-10 h-10" />
              <span>Tron</span>
            </div>
            <div
              className={`${getChainClasses("Solana")} font-serif cursor-pointer w-64 h-32 flex items-center justify-center gap-4`}
              onClick={() => handleChainClick("Solana")}
            >
              <img src="solana-sol-seeklogo.svg" alt="Solana Logo" className="w-10 h-10" />
              <span>Solana</span>
            </div>
            <div
              className={`${getChainClasses("Ethereum")} font-sans cursor-pointer w-64 h-32 flex items-center justify-center gap-4`}
              onClick={() => handleChainClick("Ethereum")}
            >
              <img src="https://upload.wikimedia.org/wikipedia/commons/6/6f/Ethereum-icon-purple.svg" alt="Ethereum Logo" className="w-10 h-10" />
              <span>Ethereum</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Hero;