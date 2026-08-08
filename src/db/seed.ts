import { runSeed } from './seed-command';

void runSeed().then((completed) => {
  if (!completed) {
    process.exitCode = 1;
  }
});
