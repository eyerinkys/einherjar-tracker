'use client';

import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { InsightEye } from '@/components/ui/InsightEye';
import { authClient } from '@/lib/auth-client';
import { LogOut, User as UserIcon, ChevronDown } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  user: {
    name: string;
    email?: string;
  };
}

export function Header({ activeTab, user }: HeaderProps) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  async function handleSignOut() {
    setSignOutError(null);
    setIsSigningOut(true);

    try {
      const result = await authClient.signOut();

      if (result.error) {
        setSignOutError('Sign out failed. Try again.');
        return;
      }

      router.replace('/sign-in');
      router.refresh();
    } catch {
      setSignOutError('Sign out failed. Try again.');
    } finally {
      setIsSigningOut(false);
    }
  }

  const getTitle = () => {
    switch (activeTab) {
      case 'split': return 'WORKOUT SPLIT';
      case 'train': return 'ACTIVE SESSION';
      case 'history': return 'TRAINING LEDGER';
      case 'progress': return 'PROGRESS & ANALYTICS';
      case 'bodyweight': return 'BODYWEIGHT LOG';
      case 'photos': return 'PROGRESS PHOTOS';
      default: return 'EINHERJAR';
    }
  };

  const getQuote = () => {
    if (!user.email) return null;
    const normalized = user.email.trim().toLowerCase();
    if (normalized === 'dhritimandas.sudo@gmail.com') {
      return {
        text: 'Praise the Sun!',
        author: 'Solaire of Astora',
      };
    }
    if (normalized === 'ynotbgurt@gmail.com') {
      return {
        text: 'I love you',
        author: '🐢',
      };
    }
    return null;
  };

  const userQuote = getQuote();

  return (
    <header className="sticky top-0 z-30 bg-[#161A20]/90 backdrop-blur-md border-b border-[#393E46] px-4 py-3">
      <div className="relative max-w-7xl mx-auto flex items-center justify-between">
        {/* Left Branding */}
        <div className="flex items-center gap-3">
          <InsightEye size={32} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-mono text-base font-bold tracking-widest text-[#DFD0B8] uppercase">
                EINHERJAR
              </h1>
              <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[#222831] border border-[#4D5460] text-[#948979] rounded-xs">
                LEDGER
              </span>
            </div>
            <p className="text-[11px] font-mono text-[#948979] tracking-wider uppercase">
              {getTitle()}
            </p>
          </div>
        </div>

        {/* Right User Indicator & Dropdown Menu containing Sign Out */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-expanded={isMenuOpen}
            aria-haspopup="true"
            className="flex items-center gap-2 bg-[#222831] hover:bg-[#2A313C] px-2.5 py-1.5 rounded-xs border border-[#4D5460] hover:border-[#677D6A] transition-colors group cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#677D6A]"
            aria-label="User profile menu"
          >
            <div className="w-7 h-7 rounded-xs bg-[#161A20] border border-[#393E46] flex items-center justify-center text-[#DFD0B8] group-hover:border-[#677D6A] transition-colors">
              <UserIcon className="w-4 h-4 text-[#8DAA91]" />
            </div>
            <span className="hidden sm:inline font-mono text-xs font-medium text-[#DFD0B8]">
              {user.name}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-[#948979] transition-transform duration-200 ${isMenuOpen ? 'rotate-180 text-[#DFD0B8]' : ''}`} />
          </button>

          {/* User Profile & Sign Out Dropdown Popover */}
          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-[#1C2128] border border-[#393E46] rounded-xs shadow-2xl p-4 z-50 font-mono">
              {/* Profile Header */}
              <div className="flex items-center gap-3 pb-3 mb-3 border-b border-[#393E46]">
                <div className="w-10 h-10 rounded-xs bg-[#222831] border border-[#4D5460] flex items-center justify-center text-[#DFD0B8]">
                  <UserIcon className="w-5 h-5 text-[#8DAA91]" />
                </div>
                <div className="overflow-hidden">
                  <div className="text-xs font-bold text-[#DFD0B8] truncate">{user.name}</div>
                  {user.email && (
                    <div className="text-[11px] text-[#948979] truncate">{user.email}</div>
                  )}
                </div>
              </div>

              {/* Personal User Quote (if applicable) */}
              {userQuote && (
                <div className="mb-3 p-3 bg-[#161A20] border border-[#393E46] rounded-xs text-xs">
                  <p className="text-[#DFD0B8] italic font-serif leading-relaxed">
                    "{userQuote.text}"
                  </p>
                  <p className="text-[#8DAA91] text-[11px] text-right mt-1.5 tracking-wide font-mono">
                    — {userQuote.author}
                  </p>
                </div>
              )}

              {/* Sign Out Action */}
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="w-full flex items-center justify-center gap-2 rounded-xs border border-[#4D5460] bg-[#222831] hover:bg-[#8F5F5F]/20 hover:border-[#8F5F5F] hover:text-[#E6A8A8] py-2 px-3 text-xs uppercase tracking-wider text-[#C4B8A5] transition-all disabled:cursor-wait disabled:opacity-60"
                aria-label={isSigningOut ? 'Signing out' : 'Sign out'}
              >
                <LogOut aria-hidden="true" className="w-4 h-4" />
                <span>{isSigningOut ? 'Leaving...' : 'Sign out'}</span>
              </button>
            </div>
          )}
        </div>

        {signOutError ? (
          <p
            role="alert"
            className="absolute right-0 top-full mt-3 border border-[#8F5F5F] bg-[#222831] px-3 py-2 text-sm text-[#E6A8A8] shadow-lg z-50"
          >
            {signOutError}
          </p>
        ) : null}
      </div>
    </header>
  );
}
