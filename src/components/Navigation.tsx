'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence, color } from 'framer-motion';
import { 
  Menu,
  User,
  X,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { cn, formatAddress } from '@/lib/utils';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import GlowButton from './ui/glow-button';

const navigation = [
  { name: 'Transfer', href: '/',  description: 'Send funds' },
  { name: 'History', href: '/history',  description: 'Transaction history' },
  { name: 'AI Insights', href: '/insights',  description: 'Market analytics' },
  { name: 'Lending', href: '/lending',  description: 'P2P lending' },
  { name: 'Social', href: '/social',   description: 'Social trading' },
  { name: 'Profile', href: '/profile',  description: 'User profile' },
];

const variants = [{
  name: "stone",
  color: "bg-stone-900",
}]

export default function Navigation() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { account, connect, disconnect, wallets } = useWallet();

  const handleWalletAction = async () => {
    if (account) {
      await disconnect();
    } else if (wallets.length > 0) {
      await connect(wallets[0].name);
    }
  };

  const selectedVariant = variants[0];
  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden lg:flex fixed top-0 left-0 right-0 text-white bg-transparent backdrop-blur-md">
        <div className="flex items-center justify-between w-full  mx-auto px-24 py-4">
           <div
        className="absolute -top-80  right-1/25 w-screen h-90 rounded-full bg-black opacity-20 blur-[100px] pointer-events-none"
      />
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="relative">

                <Zap className="w-10 h-10 text-white" />

            </div>
            <div>
              <span className="text-3xl font-medium ">Aptash.</span>
           
            </div>
          </Link>
          
          {/* Navigation Links */}
          <div className="flex items-center space-x-2">
            {navigation.map((item) => {
             
              const isActive = pathname === item.href;
              
              return (
                <Link key={item.name} href={item.href}>
                  <div
                   
                    
                    className={cn(
                      "flex items-center space-x-2  px-4 transition-all duration-200",
                      isActive 
                        ? " text-white " 
                        : " hover:text-white  duration-300  text-stone-400"
                    )}
                  >
                    
                    <span className="font-medium text-sm">{item.name}</span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Wallet Connection */}
          <div className="flex items-center space-x-3">
            {account ? (
              <div className="flex items-center space-x-2">
                <div className="px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm">
                  <span className="text-green-800 font-medium">
                    {formatAddress(account.address.toString())}
                  </span>
                </div>
                <Button variant="outline" size="sm" onClick={handleWalletAction}>
                  Disconnect
                </Button>
              </div>
            ) : (
              <GlowButton onClick={handleWalletAction} variant={selectedVariant.name}>
              <button onClick={handleWalletAction} className="flex items-center m-1 text-sm font-medium text-white">
                <User className="w-5 h-5 mr-2 inline-block" />
                Connect Wallet
              </button>
              </GlowButton>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold">Aptash</span>
          </Link>
          
          <div className="flex items-center space-x-2">
            {account && (
              <div className="px-2 py-1 bg-green-50 border border-green-200 rounded text-xs text-green-800">
                Connected
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full left-0 right-0 bg-white border-b border-gray-200 overflow-hidden"
            >
              <div className="py-2">
                {navigation.map((item, index) => {
                  
                  const isActive = pathname === item.href;
                  
                  return (
                    <motion.div
                      key={item.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link href={item.href}>
                        <Button
                          variant="ghost"
                          className={cn(
                            "w-full justify-start px-4 py-3 text-left h-auto",
                            isActive && "bg-gray-100"
                          )}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          
                          <div>
                            <div className="font-medium">{item.name}</div>
                            <div className="text-xs text-gray-500">{item.description}</div>
                          </div>
                        </Button>
                      </Link>
                    </motion.div>
                  );
                })}
                
                {/* Mobile Wallet Section */}
                <div className="border-t border-gray-200 mt-2 pt-2 px-4">
                  {account ? (
                    <div className="space-y-2">
                      <div className="text-sm text-gray-600">Connected:</div>
                      <div className="text-xs font-mono bg-gray-100 p-2 rounded">
                        {formatAddress(account.address.toString(), 12)}
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleWalletAction}
                        className="w-full"
                      >
                        Disconnect Wallet
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      onClick={handleWalletAction} 
                      className="w-full bg-black text-white"
                    >
                      Connect Wallet
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Spacer for fixed navigation */}
      <div className="h-20"></div>
    </>
  );
}
