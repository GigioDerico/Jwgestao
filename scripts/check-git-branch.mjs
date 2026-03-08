import { execSync } from 'node:child_process';

const expectedBranch = process.argv[2] || 'main';

function getCurrentBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  } catch {
    console.error('Unable to detect the current git branch.');
    process.exit(1);
  }
}

const currentBranch = getCurrentBranch();

if (currentBranch !== expectedBranch) {
  console.error(`Android APK build blocked: current branch is "${currentBranch}", expected "${expectedBranch}".`);
  console.error(`Switch to "${expectedBranch}" before running this command so the APK matches that branch.`);
  process.exit(1);
}

console.log(`Using git branch "${currentBranch}" for Android APK build.`);
