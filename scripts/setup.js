// scripts/setup.js
import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';

const execAsync = promisify(exec);

async function verifyChromaprint() {
  try {
    const { stdout } = await execAsync('fpcalc --version');
    const versionMatch = stdout.match(/(\d+\.\d+\.\d+)/);
    
    if (!versionMatch) {
      throw new Error('Cannot parse Chromaprint version');
    }
    
    const version = versionMatch[1];
    const [major, minor] = version.split('.').map(Number);
    
    if (major < 1 || (major === 1 && minor < 4)) {
      throw new Error(`Chromaprint version ${version} is too old. Required >= 1.4.0`);
    }
    
    return version;
  } catch (error) {
    const installInstructions = chalk.yellow(
      '\n' +
      '╔═══════════════════════════════════════════════════════════════╗\n' +
      '║  Chromaprint (fpcalc) is not installed                       ║\n' +
      '╚═══════════════════════════════════════════════════════════════╝\n' +
      '\n' +
      'Installation instructions:\n' +
      '\n' +
      '  📦 Windows:\n' +
      '     1. Download: https://github.com/acoustid/chromaprint/releases\n' +
      '     2. Extract to: C:\\Program Files\\Chromaprint\n' +
      '     3. Add to PATH in System Environment Variables\n' +
      '     4. Restart terminal and verify: fpcalc --version\n' +
      '\n' +
      '  🐧 Ubuntu/Debian:\n' +
      '     sudo apt-get install libchromaprint-tools\n' +
      '\n' +
      '  🍎 macOS:\n' +
      '     brew install chromaprint\n' +
      '\n'
    );
    
    throw new Error(installInstructions + `\nError: ${error.message}`);
  }
}

// ... rest of setup code
