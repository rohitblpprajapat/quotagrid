'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectButton } from '@/components/ConnectButton';

const NAV_LINKS = [
  { href: '/market', label: 'Market' },
  { href: '/sell', label: 'Sell' },
  { href: '/agents', label: 'Agents' },
  { href: '/activity', label: 'Activity' },
];

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isLinkActive = (href: string) => {
    if (href === '/market') {
      return pathname === '/market' || pathname.startsWith('/market/') || pathname.startsWith('/buy/');
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#2a2638] bg-[#0b0a10]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="flex items-center gap-2.5 text-xl font-bold font-mono tracking-tight text-[#f4f2fa] hover:opacity-90 transition-opacity"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] flex items-center justify-center shadow-md shadow-[#8b5cf6]/20">
                <span className="text-white font-mono font-black text-base">Q</span>
              </div>
              <span>QuotaGrid</span>
              <span className="hidden sm:inline-block text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-[#8b5cf6]/15 border border-[#8b5cf6]/30 text-[#a78bfa]">
                Monad
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {NAV_LINKS.map((link) => {
                const active = isLinkActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? 'bg-[#8b5cf6]/15 border border-[#8b5cf6]/40 text-[#f4f2fa]'
                        : 'text-[#a39fb5] hover:text-[#f4f2fa] hover:bg-[#15131d] border border-transparent'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right actions: ConnectButton + Mobile Menu Hamburger */}
          <div className="flex items-center gap-3">
            <ConnectButton />

            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg bg-[#15131d] border border-[#2a2638] text-[#a39fb5] hover:text-[#f4f2fa] transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#2a2638] py-3 space-y-1">
            {NAV_LINKS.map((link) => {
              const active = isLinkActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-lg text-base font-medium transition-colors ${
                    active
                      ? 'bg-[#8b5cf6]/15 border border-[#8b5cf6]/40 text-[#f4f2fa]'
                      : 'text-[#a39fb5] hover:text-[#f4f2fa] hover:bg-[#15131d]'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;
