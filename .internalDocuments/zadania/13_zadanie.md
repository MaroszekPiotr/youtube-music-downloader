## Zadanie 13: Entry Point i Dokumentacja (src/index.js, README.md)

### Opis

Główny punkt wejścia aplikacji z CLI opartym na Commander.js, pełną dokumentacją w README.md, przykładowymi plikami konfiguracyjnymi oraz instrukcjami instalacji i użycia.

### Zakres Pracy

- Entry point `src/index.js` z Commander.js
- Definicja wszystkich komend CLI z opcjami
- Help i usage examples
- Plik `config.json` z przykładową konfiguracją
- Plik `playlists.json` z przykładowymi linkami
- `README.md` z pełną dokumentacją
- `CONTRIBUTING.md` z guidelines dla kontrybutorów
- `.env.example` z przykładowymi zmiennymi środowiskowymi
- `package.json` z scripts: start, test, lint


### Implementacja - Entry Point

```javascript
// src/index.js
#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const syncCommand = require('./commands/sync');
const removeCommand = require('./commands/remove');
const listCommand = require('./commands/list');
const statsCommand = require('./commands/stats');
const cleanupCommand = require('./commands/cleanup');
const validateCommand = require('./commands/validate');
const logger = require('./logger');

// Wersja z package.json
const pkg = require('../package.json');

program
  .name('ytmd')
  .description(chalk.cyan('YouTube Music Downloader z Audio Fingerprinting'))
  .version(pkg.version);

// Komenda: sync
program
  .command('sync <playlists-file>')
  .description('Synchronizuje playlisty z YouTube')
  .option('-f, --force', 'Pomija potwierdzenia')
  .action(async (playlistsFile, options) => {
    try {
      await syncCommand.execute(playlistsFile, options);
    } catch (err) {
      console.error(chalk.red(`✗ Błąd: ${err.message}`));
      logger.error('Sync command failed', err);
      process.exit(1);
    }
  });

// Komenda: remove
program
  .command('remove <identifier>')
  .description('Usuwa utwór z biblioteki')
  .option('-f, --force', 'Pomija potwierdzenie')
  .action(async (identifier, options) => {
    try {
      await removeCommand.execute(identifier, options);
    } catch (err) {
      console.error(chalk.red(`✗ Błąd: ${err.message}`));
      logger.error('Remove command failed', err);
      process.exit(1);
    }
  });

// Komenda: list
program
  .command('list')
  .description('Wyświetla listę utworów')
  .option('-p, --playlist <name>', 'Filtruj po playliście')
  .option('-a, --artist <name>', 'Filtruj po artyście')
  .option('-s, --sort-by <field>', 'Sortuj po: quality|title|artist|date')
  .option('-l, --limit <number>', 'Limit wyników', parseInt)
  .action((options) => {
    try {
      listCommand.execute(options);
    } catch (err) {
      console.error(chalk.red(`✗ Błąd: ${err.message}`));
      logger.error('List command failed', err);
      process.exit(1);
    }
  });

// Komenda: stats
program
  .command('stats')
  .description('Wyświetla statystyki biblioteki')
  .action(() => {
    try {
      statsCommand.execute();
    } catch (err) {
      console.error(chalk.red(`✗ Błąd: ${err.message}`));
      logger.error('Stats command failed', err);
      process.exit(1);
    }
  });

// Komenda: cleanup
program
  .command('cleanup')
  .description('Usuwa osierocone pliki i wpisy')
  .option('-d, --dry-run', 'Podgląd bez usuwania')
  .action((options) => {
    try {
      cleanupCommand.execute(options);
    } catch (err) {
      console.error(chalk.red(`✗ Błąd: ${err.message}`));
      logger.error('Cleanup command failed', err);
      process.exit(1);
    }
  });

// Komenda: validate
program
  .command('validate')
  .description('Waliduje integralność biblioteki')
  .action(() => {
    try {
      validateCommand.execute();
    } catch (err) {
      console.error(chalk.red(`✗ Błąd: ${err.message}`));
      logger.error('Validate command failed', err);
      process.exit(1);
    }
  });

// Global error handler
process.on('unhandledRejection', (err) => {
  console.error(chalk.red('\n✗ Nieobsłużony błąd:'));
  console.error(chalk.red(err.message));
  logger.error('Unhandled rejection', err);
  process.exit(1);
});

// SIGINT handler (Ctrl+C)
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\n⊘ Przerwano przez użytkownika'));
  logger.info('Application interrupted by user');
  process.exit(0);
});

// Parse argumenty
program.parse(process.argv);

// Jeśli brak argumentów, pokaż help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
```


### Plik konfiguracyjny

```json
// config.json
{
  "musicDir": "./music",
  "playlistsDir": "./playlists",
  "dataDir": "./data",
  "logsDir": "./logs",
  "tempDir": "./temp",
  "fingerprint": {
    "length": 60,
    "enabled": true
  },
  "download": {
    "audioQuality": 0,
    "retries": 3,
    "timeout": 30000
  },
  "deduplication": {
    "similarityThreshold": 0.90,
    "qualityDifferenceThreshold": 10
  }
}
```


### Przykładowy plik playlist

```json
// playlists.json
[
  "https://www.youtube.com/playlist?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf",
  "https://www.youtube.com/playlist?list=PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI",
  "https://www.youtube.com/playlist?list=PLcirGkCPmbmFeQ1sm4wFciF03D_EroIfr"
]
```


### Package.json scripts

```json
{
  "name": "youtube-music-downloader",
  "version": "1.0.0",
  "description": "YouTube Music Downloader with Chromaprint Audio Fingerprinting",
  "main": "src/index.js",
  "bin": {
    "ytmd": "./src/index.js"
  },
  "scripts": {
    "start": "node src/index.js",
    "sync": "node src/index.js sync playlists.json",
    "test": "mocha test/**/*.test.js --timeout 10000",
    "test:watch": "mocha test/**/*.test.js --watch",
    "lint": "eslint src/**/*.js",
    "lint:fix": "eslint src/**/*.js --fix",
    "setup": "node src/setup.js"
  },
  "keywords": ["youtube", "music", "downloader", "chromaprint", "fingerprinting"],
  "author": "Your Name",
  "license": "MIT",
  "dependencies": {
    "ytdlp-nodejs": "^1.0.0",
    "commander": "^11.0.0",
    "fpcalc": "^1.4.3",
    "chalk": "^4.1.2",
    "cli-progress": "^3.12.0",
    "cli-table3": "^0.6.3"
  },
  "devDependencies": {
    "mocha": "^10.2.0",
    "eslint": "^8.50.0"
  }
}
```


### Testy

#### Test 13.1: CLI help

```javascript
// test/cli.test.js
const { exec } = require('child_process');

describe('CLI - Help', () => {
  it('powinien wyświetlić help bez argumentów', (done) => {
    exec('node src/index.js', (err, stdout, stderr) => {
      assert.ok(stdout.includes('Usage:'));
      assert.ok(stdout.includes('sync'));
      assert.ok(stdout.includes('remove'));
      done();
    });
  });
});
```


#### Test 13.2: CLI version

```javascript
it('powinien wyświetlić wersję', (done) => {
  exec('node src/index.js --version', (err, stdout, stderr) => {
    assert.ok(stdout.includes('1.0.0'));
    done();
  });
});
```


#### Test 13.3: Niepoprawna komenda

```javascript
it('powinien wyświetlić błąd dla niepoprawnej komendy', (done) => {
  exec('node src/index.js invalid-command', (err, stdout, stderr) => {
    assert.ok(stderr.includes('error') || stdout.includes('error'));
    done();
  });
});
```


#### Test 13.4: E2E - pełny workflow

```javascript
it('powinien wykonać pełny workflow E2E', async function() {
  this.timeout(180000); // 3 minuty
  
  // 1. Sync
  await exec('node src/index.js sync test/fixtures/playlists.json');
  
  // 2. List
  await exec('node src/index.js list');
  
  // 3. Stats
  await exec('node src/index.js stats');
  
  // 4. Validate
  await exec('node src/index.js validate');
  
  // 5. Cleanup
  await exec('node src/index.js cleanup --dry-run');
});
```


### Kryteria Akceptacji

- [ ] Entry point używa Commander.js dla CLI
- [ ] Wszystkie komendy są zdefiniowane z opcjami
- [ ] `--help` wyświetla dokumentację komend
- [ ] `--version` wyświetla wersję z package.json
- [ ] Shebang `#!/usr/bin/env node` dla uruchamiania jako executable
- [ ] Global error handlers dla unhandledRejection i SIGINT
- [ ] `config.json` zawiera wszystkie opcje konfiguracji
- [ ] `playlists.json` z przykładowymi linkami
- [ ] `package.json` z scripts: start, test, lint
- [ ] README.md jest kompletny (z poprzedniego zadania)
- [ ] Wszystkie testy przechodzą, w tym E2E

***

