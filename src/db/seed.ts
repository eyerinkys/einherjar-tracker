import { getDb } from './client';
import { seedBuiltInExercises } from './seed-exercises';

async function main(): Promise<void> {
  await seedBuiltInExercises(getDb());
  console.info('Built-in exercise seed completed.');
}

void main().catch(() => {
  console.error('Built-in exercise seed failed.');
  process.exitCode = 1;
});
