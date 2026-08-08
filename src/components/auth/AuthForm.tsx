'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { authClient } from '@/lib/auth-client';

interface AuthFormProps {
  mode: 'sign-in' | 'sign-up';
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSignUp = mode === 'sign-up';
  const errorId = `${mode}-error`;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '');
    const password = String(formData.get('password') ?? '');

    try {
      const result = isSignUp
        ? await authClient.signUp.email({
            name: String(formData.get('name') ?? ''),
            email,
            password,
          })
        : await authClient.signIn.email({ email, password });

      if (result.error) {
        setError(
          isSignUp
            ? 'Unable to create the account. Check your details or contact the account owner.'
            : 'Unable to sign in. Check your credentials and try again.'
        );
        return;
      }

      router.replace('/');
      router.refresh();
    } catch {
      setError('The authentication service is unavailable. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={handleSubmit} aria-describedby={error ? errorId : undefined}>
      {isSignUp ? (
        <div className="space-y-2">
          <label htmlFor="name" className="block font-mono text-xs uppercase tracking-wider text-[#C4B8A5]">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            maxLength={80}
            aria-invalid={error ? true : undefined}
            className="min-h-11 w-full rounded-xs border border-[#677D6A] bg-[#161A20] px-3 py-2 text-base text-[#F0E6D6] caret-[#C9A96E] transition-colors placeholder:text-[#948979] hover:border-[#8DAA91] focus:border-[#8DAA91]"
            placeholder="Your name"
          />
        </div>
      ) : null}

      <div className="space-y-2">
        <label htmlFor="email" className="block font-mono text-xs uppercase tracking-wider text-[#C4B8A5]">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          maxLength={254}
          aria-invalid={error ? true : undefined}
          className="min-h-11 w-full rounded-xs border border-[#677D6A] bg-[#161A20] px-3 py-2 text-base text-[#F0E6D6] caret-[#C9A96E] transition-colors placeholder:text-[#948979] hover:border-[#8DAA91] focus:border-[#8DAA91]"
          placeholder="you@example.com"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="block font-mono text-xs uppercase tracking-wider text-[#C4B8A5]">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={isSignUp ? 'new-password' : 'current-password'}
          required
          minLength={isSignUp ? 12 : undefined}
          maxLength={128}
          aria-invalid={error ? true : undefined}
          className="min-h-11 w-full rounded-xs border border-[#677D6A] bg-[#161A20] px-3 py-2 text-base text-[#F0E6D6] caret-[#C9A96E] transition-colors placeholder:text-[#948979] hover:border-[#8DAA91] focus:border-[#8DAA91]"
          placeholder={isSignUp ? 'At least 12 characters' : 'Your password'}
        />
      </div>

      <div id={errorId} role={error ? 'alert' : undefined} aria-live="polite" className="min-h-5 text-sm text-[#E6A8A8]">
        {error}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="min-h-11 w-full rounded-xs border border-[#677D6A] bg-[#40534C] px-4 py-2.5 font-mono text-sm font-bold uppercase tracking-widest text-[#F0E6D6] transition-colors hover:bg-[#4E665C] disabled:cursor-wait disabled:opacity-60"
      >
        <span className="inline-flex items-center justify-center gap-2">
          {isSubmitting ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : null}
          {isSubmitting ? 'Please wait' : isSignUp ? 'Create account' : 'Enter ledger'}
        </span>
      </button>

      <p className="text-center text-sm text-[#A79B89]">
        {isSignUp ? 'Already have an account?' : 'Need to create an allowed account?'}{' '}
        <Link
          href={isSignUp ? '/sign-in' : '/sign-up'}
          className="inline-flex min-h-11 items-center font-medium text-[#C7D5C9] underline decoration-[#677D6A] underline-offset-4 hover:text-[#F0E6D6]"
        >
          {isSignUp ? 'Sign in' : 'Sign up'}
        </Link>
      </p>
    </form>
  );
}
