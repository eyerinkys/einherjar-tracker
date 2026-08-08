import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadSeedEnvironment, runSeed } from './seed-command';

const testVariable = 'EINHERJAR_SEED_COMMAND_TEST_VALUE';
const originalValue = process.env[testVariable];
const temporaryDirectories: string[] = [];

afterEach(async () => {
  if (originalValue === undefined) {
    delete process.env[testVariable];
  } else {
    process.env[testVariable] = originalValue;
  }

  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('seed command', () => {
  it('loads an env file before seeding and closes the database client afterward', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'einherjar-seed-command-'));
    temporaryDirectories.push(directory);
    const envPath = join(directory, '.env.local');
    await writeFile(envPath, `${testVariable}=loaded-from-env-file\n`);
    const events: string[] = [];
    const database = {
      $client: {
        end: async () => {
          events.push('close');
        },
      },
    };

    const result = await runSeed({
      loadEnvironment: () => {
        loadSeedEnvironment(envPath);
        events.push(`env:${process.env[testVariable]}`);
      },
      getDatabase: () => {
        events.push('database');
        return database as never;
      },
      seed: async () => {
        events.push('seed');
      },
      info: () => {
        events.push('success');
      },
      error: () => {
        events.push('error');
      },
    });

    expect(result).toBe(true);
    expect(events).toEqual(['env:loaded-from-env-file', 'database', 'seed', 'success', 'close']);
  });

  it('closes the database client when seeding fails', async () => {
    const events: string[] = [];
    const database = {
      $client: {
        end: async () => {
          events.push('close');
        },
      },
    };

    const result = await runSeed({
      loadEnvironment: () => {
        events.push('env');
      },
      getDatabase: () => database as never,
      seed: async () => {
        events.push('seed');
        throw new Error('seed failure');
      },
      info: () => {
        events.push('success');
      },
      error: () => {
        events.push('error');
      },
    });

    expect(result).toBe(false);
    expect(events).toEqual(['env', 'seed', 'error', 'close']);
  });
});
