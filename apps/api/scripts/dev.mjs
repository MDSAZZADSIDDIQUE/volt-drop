// Development loop for the API and worker. It compiles once, then keeps the TypeScript compiler
// watching and restarts each process when its compiled output changes. Plain Node, so it behaves the
// same on Windows, macOS and Linux.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

// On Windows, `tsc` on the PATH is a .cmd shim, which only a shell can run.
const shell = process.platform === 'win32';

const firstBuild = spawnSync('tsc', ['-p', 'tsconfig.build.json'], { stdio: 'inherit', shell });
if (firstBuild.status !== 0) {
  console.error('The first compile failed. Fix the errors above, then run `pnpm dev` again.');
  process.exit(firstBuild.status ?? 1);
}

const nodeArgs = ['--watch', '--enable-source-maps', '--import', './dist/instrumentation.js'];
const children = [
  spawn('tsc', ['-p', 'tsconfig.build.json', '--watch', '--preserveWatchOutput'], {
    stdio: 'inherit',
    shell,
  }),
  spawn(process.execPath, [...nodeArgs, 'dist/main.js'], { stdio: 'inherit' }),
];
if (existsSync('dist/worker.js')) {
  children.push(spawn(process.execPath, [...nodeArgs, 'dist/worker.js'], { stdio: 'inherit' }));
}

function stopAll() {
  for (const child of children) {
    child.kill();
  }
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    stopAll();
    process.exit(0);
  });
}

for (const child of children) {
  child.on('exit', (code) => {
    if (code !== null && code !== 0) {
      stopAll();
      process.exit(code);
    }
  });
}
