'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowUpDown, 
  Clock, 
  TrendingUp, 
  DollarSign, 
  Users,
  UserCircle,
  Menu,
  X,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { cn, formatAddress } from '@/lib/utils';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import GlowButton from './ui/glow-button';

const navigation = [
  { name: 'Transfer', href: '/', icon: ArrowUpDown, description: 'Send funds' },
  { name: 'History', href: '/history', icon: Clock, description: 'Transaction history' },
  { name: 'AI Insights', href: '/insights', icon: TrendingUp, description: 'Market analytics' },
  { name: 'Lending', href: '/lending', icon: DollarSign, description: 'P2P lending' },
  { name: 'Social', href: '/social', icon: Users, description: 'Social trading' },
  { name: 'Profile', href: '/profile', icon: UserCircle, description: 'User profile' },
];

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

  return (
    <>
      {/* Desktop Navigation */}
      <motion.nav 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="hidden lg:flex fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b border-stone-800/50"
        style={{
          background: 'rgba(0, 0, 0, 0.8)'
        }}
      >
        <div className="flex items-center justify-between w-full max-w-7xl mx-auto px-6 py-4">
          {/* Logo */}
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="flex items-center space-x-3"
          >
            <div className="relative">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-black" />
              </div>
              <div className="absolute -inset-1 bg-gradient-to-r from-white/20 to-transparent rounded-lg blur opacity-75"></div>
            </div>
            <span className="text-2xl satoshi-bold bg-gradient-to-r from-white via-gray-300 to-white bg-clip-text text-transparent">
              Aptash
            </span>
          </motion.div>

          {/* Navigation Links */}
          <div className="flex items-center space-x-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.name} href={item.href}>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                      "relative px-4 py-2 rounded-lg transition-all duration-300 flex items-center space-x-2",
                      isActive 
                        ? "bg-white/10 text-white shadow-lg" 
                        : "text-stone-400 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="satoshi-medium">{item.name}</span>
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-white/10 rounded-lg border border-white/20"
                        initial={false}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                      />
                    )}
                  </motion.div>
                </Link>
              );
            })}
          </div>

          {/* Wallet Connection */}
          <div className="flex items-center space-x-4">
            {account ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center space-x-3"
              >
                <div className="px-4 py-2 bg-gradient-to-r from-stone-800/50 to-stone-900/50 backdrop-blur border border-stone-700/50 rounded-lg">
                  <span className="text-white satoshi-regular text-sm">
                    {formatAddress(account.address.toString())}
                  </span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleWalletAction}
                  className="border-stone-600 text-stone-300 hover:text-white hover:border-white"
                >
                  Disconnect
                </Button>
              </motion.div>
            ) : (
              <GlowButton onClick={handleWalletAction}>
              
                Connect Wallet
              </GlowButton>
            )}
          </div>
        </div>
      </motion.nav>

      {/* Mobile Navigation */}
      <motion.nav 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="lg:hidden fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b border-stone-800/50"
        style={{
          background: 'rgba(0, 0, 0, 0.9)'
        }}
      >
        <div className="flex items-center justify-between px-6 py-4">
          {/* Mobile Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-black" />
            </div>
            <span className="text-xl satoshi-bold text-white">Aptash</span>
          </div>

          <div className="flex items-center space-x-3">
            {/* Mobile Wallet Status */}
            {account && (
              <div className="px-3 py-1 bg-stone-800/50 rounded-lg">
                <span className="text-white satoshi-regular text-xs">
                  {formatAddress(account.address.toString())}
                </span>
              </div>
            )}
            
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-white hover:text-white hover:bg-white/10"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="border-t border-stone-800/50"
              style={{
                background: 'rgba(0, 0, 0, 0.95)'
              }}
            >
              <div className="px-6 py-6 space-y-4">
                {/* Mobile Navigation Links */}
                <div className="space-y-2">
                  {navigation.map((item, index) => {
                    const isActive = pathname === item.href;
                    return (
                      <motion.div
                        key={item.name}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Link href={item.href} onClick={() => setMobileMenuOpen(false)}>
                          <div className={cn(
                            "flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-300",
                            isActive 
                              ? "bg-white/10 text-white border border-white/20" 
                              : "text-stone-400 hover:text-white hover:bg-white/5"
                          )}>
                            <item.icon className="w-5 h-5" />
                            <div>
                              <div className="satoshi-medium">{item.name}</div>
                              <div className="text-xs text-stone-500">{item.description}</div>
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Mobile Wallet Connection */}
                <div className="pt-4 border-t border-stone-800/50">
                  {account ? (
                    <div className="space-y-3">
                      <div className="text-sm text-stone-400">Connected:</div>
                      <div className="text-xs satoshi-regular bg-stone-800/50 p-3 rounded-lg border border-stone-700/50">
                        {formatAddress(account.address.toString())}
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleWalletAction}
                        className="w-full border-stone-600 text-stone-300 hover:text-white hover:border-white"
                      >
                        Disconnect Wallet
                      </Button>
                    </div>
                  ) : (
                    <div className="w-full justify-center">
                      <GlowButton onClick={handleWalletAction}>
                       
                        Connect Wallet
                      </GlowButton>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Spacer for fixed navigation */}
      <div className="h-20" />
    </>
  );
}
