// scripts/setup.js
import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';
import path from 'path';

const execAsync = promisify(exec);

/**
 * Verifies Chromaprint (fpcalc) installation
 */
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
      '║       Chromaprint (fpcalc) is not installed                 ║\n' +
      '╚═══════════════════════════════════════════════════════════════╝\n' +
      '\n' +
      'Installation instructions:\n' +
      '\n' +
      ' 📦 Windows:\n' +
      '    choco install chromaprint\n' +
      '    OR download from: https://acoustid.org/chromaprint\n' +
      '\n' +
      ' 📦 macOS:\n' +
      '    brew install chromaprint\n' +
      '\n' +
      ' 📦 Ubuntu/Debian:\n' +
      '    sudo apt-get install libchromaprint-tools\n' +
      '\n' +
      ' 📦 Arch Linux:\n' +
      '    sudo pacman -S chromaprint\n' +
      '\n'
    );

    console.error(installInstructions);
    throw new Error('Chromaprint installation required');
  }
}

/**
 * Creates required directory structure
 */
async function createDirectories() {
  const directories = [
    // Source directories (Clean Architecture layers)
    'src/domain/entities',
    'src/domain/value-objects',
    'src/domain/repositories',
    'src/application/use-cases',
    'src/application/ports',
    'src/infrastructure/adapters',
    'src/infrastructure/external',
    'src/presentation/cli',
    'src/shared/types',
    'src/shared/utils',
    'src/types',
    // Runtime directories
    'music',
    'playlists',
    'data',
    'logs',
    'temp',
    // Scripts directory
    'scripts'
  ];

  console.log(chalk.blue('📁 Creating directory structure...'));

  for (const dir of directories) {
    try {
      await fs.mkdir(dir, { recursive: true });
      console.log(chalk.green(`  ✓ ${dir}`));
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }
}

/**
 * Creates configuration files
 */
async function createConfigFiles() {
  console.log(chalk.blue('\n⚙️  Creating configuration files...'));

  // config.json
  const config = {
    outputDir: './music',
    playlistDir: './playlists',
    dataDir: './data',
    tempDir: './temp',
    logDir: './logs',
    fingerprintSimilarityThreshold: 0.85,
    logLevel: 'INFO',
    maxRetries: 3,
    downloadTimeout: 300000,
    audioFormat: 'mp3',
    audioQuality: '192'
  };

  await fs.writeFile(
    'config.json',
    JSON.stringify(config, null, 2),
    'utf-8'
  );
  console.log(chalk.green('  ✓ config.json'));

  // data/tracks.json
  const tracksDb = {
    version: '1.0.0',
    lastModified: new Date().toISOString(),
    tracks: []
  };

  await fs.writeFile(
    'data/tracks.json',
    JSON.stringify(tracksDb, null, 2),
    'utf-8'
  );
  console.log(chalk.green('  ✓ data/tracks.json'));

  // data/playlists.json
  const playlistsDb = {
    version: '1.0.0',
    lastModified: new Date().toISOString(),
    playlists: []
  };

  await fs.writeFile(
    'data/playlists.json',
    JSON.stringify(playlistsDb, null, 2),
    'utf-8'
  );
  console.log(chalk.green('  ✓ data/playlists.json'));
}

/**
 * Verifies FFmpeg installation via ytdl-core
 */
async function verifyFFmpeg() {
  console.log(chalk.blue('\n🎵 Checking FFmpeg...'));
  
  try {
    const { stdout } = await execAsync('ffmpeg -version');
    const versionMatch = stdout.match(/ffmpeg version (\S+)/);
    
    if (versionMatch) {
      console.log(chalk.green(`  ✓ FFmpeg ${versionMatch[1]} found`));
      return true;
    }
  } catch (error) {
    console.log(chalk.yellow('  ⚠ FFmpeg not found in PATH'));
    console.log(chalk.blue('  ℹ FFmpeg will be downloaded automatically on first use by ytdl-core'));
    return false;
  }
}

/**
 * Main setup function
 */
async function setup() {
  console.log(chalk.bold.cyan('\n🚀 YouTube Music Downloader - Project Setup\n'));
  console.log(chalk.gray('═'.repeat(70)));

  try {
    // Step 1: Verify Chromaprint
    console.log(chalk.blue('\n🔍 Verifying Chromaprint installation...'));
    const chromaprintVersion = await verifyChromaprint();
    console.log(chalk.green(`  ✓ Chromaprint ${chromaprintVersion} detected`));

    // Step 2: Create directories
    await createDirectories();

    // Step 3: Create config files
    await createConfigFiles();

    // Step 4: Verify FFmpeg
    await verifyFFmpeg();

    // Success summary
    console.log(chalk.gray('\n' + '═'.repeat(70)));
    console.log(chalk.bold.green('\n✅ Setup completed successfully!\n'));
    console.log(chalk.white('Next steps:'));
    console.log(chalk.gray('  1. npm run build          - Compile TypeScript'));
    console.log(chalk.gray('  2. npm test               - Run tests'));
    console.log(chalk.gray('  3. npm run cli -- --help  - See available commands\n'));

  } catch (error) {
    console.log(chalk.gray('\n' + '═'.repeat(70)));
    console.log(chalk.bold.red('\n❌ Setup failed!\n'));
    console.error(chalk.red(error.message));
    process.exit(1);
  }
}

// Run setup
setup();
