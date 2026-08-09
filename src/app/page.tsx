import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { ApplicationShell } from '@/components/app/ApplicationShell';
import { auth } from '@/lib/auth';
import { getExercises } from '@/server/queries/exercises';
import { getSplitDays } from '@/server/queries/splits';
import { getActiveWorkout } from '@/server/queries/workouts';
import { getCompletedSessionHistory, getExerciseHistory } from '@/server/queries/history';
import { getBodyweightSummary } from '@/server/queries/bodyweight';

export const runtime = 'nodejs';

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect('/sign-in');
  }

  const userId = session.user.id;
  const exercisesRequest = getExercises(userId);
  const firstExerciseHistoryRequest = exercisesRequest.then((visibleExercises) => (
    visibleExercises[0] ? getExerciseHistory(userId, visibleExercises[0].id) : null
  ));
  const [exercises, splitDays, activeWorkout, historyPage, exerciseHistory, bodyweightSummary] = await Promise.all([
    exercisesRequest,
    getSplitDays(userId),
    getActiveWorkout(userId),
    getCompletedSessionHistory(userId, { pageSize: 20 }),
    firstExerciseHistoryRequest,
    getBodyweightSummary(userId),
  ]);

  return (
    <ApplicationShell
      exercises={exercises}
      initialSplitDays={splitDays}
      initialActiveWorkout={activeWorkout}
      initialHistoryPage={historyPage}
      initialExerciseHistory={exerciseHistory}
      initialBodyweightSummary={bodyweightSummary}
      user={{
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      }}
    />
  );
}
