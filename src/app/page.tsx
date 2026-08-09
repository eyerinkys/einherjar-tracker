import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { ApplicationShell } from '@/components/app/ApplicationShell';
import { auth } from '@/lib/auth';
import { getExercises } from '@/server/queries/exercises';
import { getSplitDays } from '@/server/queries/splits';
import { getActiveWorkout } from '@/server/queries/workouts';
import { getCompletedSessionHistory, getExerciseHistory, getExerciseIdsWithHistory } from '@/server/queries/history';
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
  const splitDaysRequest = getSplitDays(userId);
  const exerciseIdsWithDataRequest = getExerciseIdsWithHistory(userId);

  const initialExerciseHistoryRequest = Promise.all([
    exercisesRequest,
    splitDaysRequest,
    exerciseIdsWithDataRequest,
  ]).then(([visibleExercises, visibleSplitDays, loggedIds]) => {
    if (visibleExercises.length === 0) return null;
    const splitExerciseIds = new Set(
      visibleSplitDays.flatMap((day) => day.exercises.map((ex) => ex.exerciseId))
    );
    const loggedSet = new Set(loggedIds);
    const selectable = visibleExercises.filter(
      (ex) => loggedSet.has(ex.id) || splitExerciseIds.has(ex.id)
    );
    const targetExercise = selectable[0] ?? visibleExercises[0];
    return targetExercise ? getExerciseHistory(userId, targetExercise.id) : null;
  });

  const db = getDb();
  const profileRequest = db.query.trainingProfiles.findFirst({
    where: eq(trainingProfiles.userId, userId),
  });

  const [exercises, splitDays, activeWorkout, historyPage, exerciseHistory, bodyweightSummary, photosRes, profile, exerciseIdsWithData] = await Promise.all([
    exercisesRequest,
    splitDaysRequest,
    getActiveWorkout(userId),
    getCompletedSessionHistory(userId, { pageSize: 20 }),
    initialExerciseHistoryRequest,
    getBodyweightSummary(userId),
    getPhotos(),
    profileRequest,
    exerciseIdsWithDataRequest,
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
      exerciseIdsWithData={exerciseIdsWithData}
      user={{
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      }}
    />
  );
}
