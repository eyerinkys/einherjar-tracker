import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { ApplicationShell } from '@/components/app/ApplicationShell';
import { auth } from '@/lib/auth';
import { getExercises } from '@/server/queries/exercises';
import { getSplitDays } from '@/server/queries/splits';

export const runtime = 'nodejs';

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect('/sign-in');
  }

  const [exercises, splitDays] = await Promise.all([
    getExercises(session.user.id),
    getSplitDays(session.user.id),
  ]);

  return (
    <ApplicationShell
      exercises={exercises}
      initialSplitDays={splitDays}
      user={{
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      }}
    />
  );
}
