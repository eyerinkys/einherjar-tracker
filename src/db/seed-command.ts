import { config } from 'dotenv';
import { getDb, type createDatabaseClient } from './client';
import {
  createDrizzleExerciseSeedDatabase,
  seedBuiltInExercises,
} from './seed-exercises';

type DatabaseClient = ReturnType<typeof createDatabaseClient>;

export interface SeedCommandDependencies {
  loadEnvironment(): void;
  getDatabase(): DatabaseClient;
  seed(database: DatabaseClient): Promise<void>;
  info(message: string): void;
  error(message: string): void;
}

export function loadSeedEnvironment(path = '.env.local'): void {
  config({ path, quiet: true });
  config({ path: '.env', quiet: true });
}

const defaultDependencies: SeedCommandDependencies = {
  loadEnvironment: loadSeedEnvironment,
  getDatabase: getDb,
  seed: (database) => seedBuiltInExercises(createDrizzleExerciseSeedDatabase(database)),
  info: console.info,
  error: console.error,
};

export async function runSeed(
  dependencies: Partial<SeedCommandDependencies> = {},
): Promise<boolean> {
  const command = { ...defaultDependencies, ...dependencies };
  let database: DatabaseClient | undefined;

  try {
    command.loadEnvironment();
    database = command.getDatabase();
    await command.seed(database);
    command.info('Built-in exercise seed completed.');
    return true;
  } catch {
    command.error('Built-in exercise seed failed.');
    return false;
  } finally {
    await database?.$client.end();
  }
}
