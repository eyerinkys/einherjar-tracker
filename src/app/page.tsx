import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { ApplicationShell } from '@/components/app/ApplicationShell';
import { auth } from '@/lib/auth';

export const runtime = 'nodejs';

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect('/sign-in');
  }

  return (
    <ApplicationShell
      user={{
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      }}
    />
  );
}
