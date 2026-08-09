import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { ApplicationShell } from '@/components/app/ApplicationShell';
import { auth } from '@/lib/auth';
import { getExercises } from '@/server/queries/exercises';
import { getSplitDays } from '@/server/queries/splits';
import { getActiveWorkout } from '@/server/queries/workouts';
import { getCompletedSessionHistory, getExerciseHistory } from '@/server/queries/history';
import { getBodyweightSummary } from '@/server/queries/bodyweight';
import { getPhotos } from '@/actions/photos';
import { getHomeDashboardData } from '@/server/queries/home';
import { getDb } from '@/db/client';
import { trainingProfiles } from '@/db/schema/ai';
import { eq } from 'drizzle-orm';

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
  const db = getDb();
  const profileRequest = db.query.trainingProfiles.findFirst({
    where: eq(trainingProfiles.userId, userId),
  });

  const [exercises, splitDays, activeWorkout, historyPage, exerciseHistory, bodyweightSummary, photosRes, profile] = await Promise.all([
    exercisesRequest,
    getSplitDays(userId),
    getActiveWorkout(userId),
    getCompletedSessionHistory(userId, { pageSize: 20 }),
    firstExerciseHistoryRequest,
    getBodyweightSummary(userId),
    getPhotos(),
    profileRequest,
  ]);

  const timezone = profile?.ianaTimezone || 'UTC';
  const homeDashboardData = await getHomeDashboardData(userId, timezone);

  return (
    <ApplicationShell
      exercises={exercises}
      initialSplitDays={splitDays}
      initialActiveWorkout={activeWorkout}
      initialHistoryPage={historyPage}
      initialExerciseHistory={exerciseHistory}
      initialBodyweightSummary={bodyweightSummary}
      initialPhotos={photosRes.ok ? photosRes.data : []}
      initialHomeDashboardData={homeDashboardData}
      user={{
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      }}
    />
  );
}
