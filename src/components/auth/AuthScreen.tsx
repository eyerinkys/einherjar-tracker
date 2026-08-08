import { InsightEye } from '@/components/ui/InsightEye';
import { RunePanel } from '@/components/ui/RunePanel';
import { AuthForm } from './AuthForm';

interface AuthScreenProps {
  mode: 'sign-in' | 'sign-up';
}

export function AuthScreen({ mode }: AuthScreenProps) {
  const isSignUp = mode === 'sign-up';

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#161A20] px-4 py-10 text-[#DFD0B8]">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#677D6A] to-transparent" />
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <InsightEye size={44} active={false} />
          <div>
            <p className="font-mono text-lg font-bold tracking-[0.18em] text-[#F0E6D6]">EINHERJAR</p>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#948979]">Private training ledger</p>
          </div>
        </div>

        <RunePanel variant="carved" className="p-6 sm:p-8">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#F0E6D6]">
            {isSignUp ? 'Create your account' : 'Return to your ledger'}
          </h1>
          <p className="mt-2 max-w-sm text-sm leading-6 text-[#A79B89]">
            {isSignUp
              ? 'Registration is limited to the two approved email addresses.'
              : 'Sign in to continue to your private training record.'}
          </p>

          <AuthForm mode={mode} />
        </RunePanel>
      </div>
    </main>
  );
}
