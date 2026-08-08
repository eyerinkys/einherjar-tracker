'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { InsightEye } from '@/components/ui/InsightEye';
import { authClient } from '@/lib/auth-client';
import { LogOut, User as UserIcon } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  user: {
    name: string;
  };
}

export function Header({ activeTab, user }: HeaderProps) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

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

        {/* Right User Indicator & Training Status */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 bg-[#222831] px-3 py-1 rounded-xs border border-[#393E46] text-xs font-mono text-[#DFD0B8]">
            <span className="w-2 h-2 rounded-full bg-[#677D6A] animate-pulse" />
            <span>{user.name}</span>
          </div>

          <div aria-hidden="true" className="w-8 h-8 rounded-xs bg-[#222831] border border-[#4D5460] flex items-center justify-center text-[#DFD0B8]">
            <UserIcon className="w-4 h-4 text-[#948979]" />
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xs border border-[#4D5460] bg-[#222831] px-3 font-mono text-xs uppercase tracking-wider text-[#C4B8A5] transition-colors hover:border-[#677D6A] hover:text-[#F0E6D6] disabled:cursor-wait disabled:opacity-60"
            aria-label={isSigningOut ? 'Signing out' : 'Sign out'}
          >
            <LogOut aria-hidden="true" className="size-4" />
            <span className="hidden md:inline">{isSigningOut ? 'Leaving' : 'Sign out'}</span>
          </button>
        </div>

        {signOutError ? (
          <p
            role="alert"
            className="absolute right-0 top-full mt-3 border border-[#8F5F5F] bg-[#222831] px-3 py-2 text-sm text-[#E6A8A8] shadow-lg"
          >
            {signOutError}
          </p>
        ) : null}
      </div>
    </header>
  );
}
