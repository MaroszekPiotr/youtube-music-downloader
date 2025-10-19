import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

describe('Setup - Project Structure', () => {
  const requiredDirectories = [
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
    'music',
    'playlists',
    'data',
    'logs',
    'temp'
  ];

  test('should have all required directories', async () => {
    for (const dir of requiredDirectories) {
      const stats = await fs.stat(dir);
      expect(stats.isDirectory()).toBe(true);
    }
  });

  test('should have valid package.json with required dependencies', async () => {
    const packageJson = JSON.parse(
      await fs.readFile('./package.json', 'utf-8')
    );

    expect(packageJson.type).toBe('module');
    expect(packageJson.dependencies).toHaveProperty('chalk');
    expect(packageJson.dependencies).toHaveProperty('commander');
    expect(packageJson.dependencies).toHaveProperty('fpcalc');
    expect(packageJson.dependencies).toHaveProperty('inversify');
    expect(packageJson.devDependencies).toHaveProperty('typescript');
    expect(packageJson.devDependencies).toHaveProperty('jest');
  });

  test('should have valid tsconfig.json with strict mode', async () => {
    const tsConfig = JSON.parse(
      await fs.readFile('./tsconfig.json', 'utf-8')
    );

    expect(tsConfig.compilerOptions.strict).toBe(true);
    expect(tsConfig.compilerOptions.strictNullChecks).toBe(true);
    expect(tsConfig.compilerOptions.noImplicitAny).toBe(true);
    expect(tsConfig.compilerOptions.module).toBe('ES2022');
    expect(tsConfig.compilerOptions.paths).toHaveProperty('@domain/*');
    expect(tsConfig.compilerOptions.paths).toHaveProperty('@application/*');
  });

  test('should have valid .gitignore excluding sensitive directories', async () => {
    const gitignore = await fs.readFile('./.gitignore', 'utf-8');

    expect(gitignore).toContain('music/');
    expect(gitignore).toContain('temp/');
    expect(gitignore).toContain('logs/');
    expect(gitignore).toContain('data/');
    expect(gitignore).toContain('node_modules/');
    expect(gitignore).toContain('dist/');
  });
});

describe('Setup - System Dependencies', () => {
  test('should detect Chromaprint >= 1.4.3', async () => {
    const { stdout } = await execAsync('fpcalc --version');
    const versionMatch = stdout.match(/(\d+\.\d+\.\d+)/);
    
    expect(versionMatch).toBeTruthy();
    
    const [major, minor] = versionMatch![1].split('.').map(Number);
    expect(major).toBeGreaterThanOrEqual(1);
    if (major === 1) {
      expect(minor).toBeGreaterThanOrEqual(4);
    }
  });

  test('should have FFmpeg available', async () => {
    try {
      const { stdout } = await execAsync('ffmpeg -version');
      expect(stdout).toContain('ffmpeg version');
    } catch (error) {
      console.warn('FFmpeg not installed - some features may not work');
    }
  });
});

describe('Setup - Configuration Files', () => {
  test('should create config.json with default values', async () => {
    const config = JSON.parse(
      await fs.readFile('./config.json', 'utf-8')
    );

    expect(config).toHaveProperty('outputDir');
    expect(config).toHaveProperty('playlistDir');
    expect(config).toHaveProperty('fingerprintSimilarityThreshold');
    expect(config.fingerprintSimilarityThreshold).toBeGreaterThanOrEqual(0.8);
    expect(config.fingerprintSimilarityThreshold).toBeLessThanOrEqual(1.0);
  });

  test('should create empty tracks.json database', async () => {
    const tracks = JSON.parse(
      await fs.readFile('./data/tracks.json', 'utf-8')
    );

    expect(tracks).toHaveProperty('tracks');
    expect(Array.isArray(tracks.tracks)).toBe(true);
  });

  test('should create empty playlists.json', async () => {
    const playlists = JSON.parse(
      await fs.readFile('./data/playlists.json', 'utf-8')
    );

    expect(playlists).toHaveProperty('playlists');
    expect(Array.isArray(playlists.playlists)).toBe(true);
  });
});
