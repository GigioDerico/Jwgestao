import fs from 'node:fs';
import { execSync } from 'node:child_process';

function getJavaVersionOutput() {
  try {
    return execSync('java -version 2>&1', { encoding: 'utf8' });
  } catch (error) {
    return error.stdout || error.stderr || '';
  }
}

function parseJavaMajor(versionOutput) {
  const match = versionOutput.match(/version "(\d+)(?:\.(\d+))?/);
  if (!match) return null;

  const major = Number(match[1]);
  if (major === 1 && match[2]) {
    return Number(match[2]);
  }

  return major;
}

const versionOutput = getJavaVersionOutput();
const major = parseJavaMajor(versionOutput);

if (!major) {
  console.error('Unable to detect the active Java version. Set JAVA_HOME to a JDK between 17 and 24 before building the Android APK.');
  process.exit(1);
}

if (major < 17 || major > 24) {
  console.error(`Unsupported Java version detected: ${major}.`);
  console.error('Use a JDK between 17 and 24 for the Android release build.');

  const androidStudioJbr = '/Applications/Android Studio.app/Contents/jbr/Contents/Home';
  if (process.platform === 'darwin' && fs.existsSync(androidStudioJbr)) {
    console.error(`Suggested fix: export JAVA_HOME="${androidStudioJbr}"`);
  }

  process.exit(1);
}

console.log(`Using supported Java ${major} for Android build.`);
