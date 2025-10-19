## Zadanie 12: System Logowania (src/logger.js)

### Opis

Uniwersalny system logowania z poziomami (info/warn/error/debug), automatyczną rotacją plików, kolorowaniem w konsoli oraz zapisem do osobnych plików logów w zależności od typu operacji.

### Zakres Pracy

- Poziomy logowania: `DEBUG`, `INFO`, `WARN`, `ERROR`
- Zapis do plików: `app.log`, `duplicates.log`, `replaced.log`, `error.log`
- Automatyczna rotacja logów (max 10MB na plik)
- Formatowanie timestampów
- Kolorowanie komunikatów w konsoli (chalk)
- Opcja konfiguracji poziomu logowania (env: LOG_LEVEL)
- Stack trace dla błędów


### Implementacja

```javascript
// src/logger.js
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class Logger {
  constructor(logDir = './logs') {
    this.logDir = logDir;
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    this.logLevel = process.env.LOG_LEVEL || 'INFO';
    
    // Hierarchia poziomów
    this.levels = {
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3
    };
    
    // Upewnij się że folder istnieje
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  /**
   * Loguje wiadomość INFO
   */
  info(message, data = null) {
    this._log('INFO', message, data, 'app.log');
  }

  /**
   * Loguje ostrzeżenie WARN
   */
  warn(message, data = null) {
    this._log('WARN', message, data, 'app.log');
  }

  /**
   * Loguje błąd ERROR
   */
  error(message, error = null) {
    const errorData = error ? {
      message: error.message,
      stack: error.stack
    } : null;
    
    this._log('ERROR', message, errorData, 'error.log');
    this._log('ERROR', message, errorData, 'app.log');
  }

  /**
   * Loguje debug DEBUG (tylko gdy LOG_LEVEL=DEBUG)
   */
  debug(message, data = null) {
    this._log('DEBUG', message, data, 'app.log');
  }

  /**
   * Główna funkcja logowania
   * @private
   */
  _log(level, message, data, filename) {
    // Sprawdź czy poziom jest wystarczający
    if (this.levels[level] < this.levels[this.logLevel]) {
      return;
    }
    
    const timestamp = new Date().toISOString();
    const logEntry = this._formatLogEntry(timestamp, level, message, data);
    
    // Konsola z kolorowaniem
    this._logToConsole(level, message, data);
    
    // Plik
    this._logToFile(filename, logEntry);
  }

  /**
   * Formatuje wpis logu
   * @private
   */
  _formatLogEntry(timestamp, level, message, data) {
    let entry = `[${timestamp}] [${level}] ${message}`;
    
    if (data) {
      entry += '\n' + JSON.stringify(data, null, 2);
    }
    
    return entry + '\n';
  }

  /**
   * Loguje do konsoli z kolorowaniem
   * @private
   */
  _logToConsole(level, message, data) {
    const timestamp = new Date().toLocaleTimeString('pl-PL');
    
    switch (level) {
      case 'DEBUG':
        console.log(chalk.gray(`[${timestamp}] [DEBUG] ${message}`));
        break;
      case 'INFO':
        console.log(chalk.white(`[${timestamp}] [INFO] ${message}`));
        break;
      case 'WARN':
        console.log(chalk.yellow(`[${timestamp}] [WARN] ${message}`));
        break;
      case 'ERROR':
        console.log(chalk.red(`[${timestamp}] [ERROR] ${message}`));
        if (data && data.stack) {
          console.log(chalk.red(data.stack));
        }
        break;
    }
    
    if (data && level === 'DEBUG') {
      console.log(chalk.gray(JSON.stringify(data, null, 2)));
    }
  }

  /**
   * Zapisuje do pliku
   * @private
   */
  _logToFile(filename, entry) {
    const filepath = path.join(this.logDir, filename);
    
    // Sprawdź rotację
    this._rotateIfNeeded(filepath);
    
    // Append do pliku
    try {
      fs.appendFileSync(filepath, entry, 'utf-8');
    } catch (err) {
      console.error(chalk.red(`Błąd zapisu logu: ${err.message}`));
    }
  }

  /**
   * Rotuje plik jeśli przekroczył limit
   * @private
   */
  _rotateIfNeeded(filepath) {
    if (!fs.existsSync(filepath)) {
      return;
    }
    
    const stats = fs.statSync(filepath);
    
    if (stats.size > this.maxFileSize) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const rotatedPath = filepath.replace('.log', `-${timestamp}.log`);
      
      fs.renameSync(filepath, rotatedPath);
      
      // Usuń najstarsze logi jeśli jest ich więcej niż 5
      this._cleanupOldLogs(filepath);
    }
  }

  /**
   * Usuwa najstarsze logi
   * @private
   */
  _cleanupOldLogs(filepath) {
    const basename = path.basename(filepath, '.log');
    const dirname = path.dirname(filepath);
    
    const rotatedFiles = fs.readdirSync(dirname)
      .filter(f => f.startsWith(basename) && f !== path.basename(filepath))
      .map(f => ({
        name: f,
        path: path.join(dirname, f),
        time: fs.statSync(path.join(dirname, f)).mtime
      }))
      .sort((a, b) => b.time - a.time);
    
    // Zachowaj tylko 5 najnowszych
    if (rotatedFiles.length > 5) {
      rotatedFiles.slice(5).forEach(file => {
        fs.unlinkSync(file.path);
      });
    }
  }

  /**
   * Czyści wszystkie logi
   */
  clearLogs() {
    const files = fs.readdirSync(this.logDir);
    files.forEach(file => {
      const filepath = path.join(this.logDir, file);
      fs.unlinkSync(filepath);
    });
    
    console.log(chalk.green('✓ Wyczyszczono wszystkie logi'));
  }
}

module.exports = new Logger();
```


### Testy

#### Test 12.1: Logowanie na różnych poziomach

```javascript
// test/logger.test.js
const logger = require('../src/logger');

describe('Logger - Poziomy', () => {
  it('powinien zapisać INFO do app.log', () => {
    logger.info('Test info message');
    
    const content = fs.readFileSync('./logs/app.log', 'utf-8');
    assert.ok(content.includes('[INFO] Test info message'));
  });

  it('powinien zapisać ERROR do error.log i app.log', () => {
    logger.error('Test error', new Error('Test error'));
    
    const errorLog = fs.readFileSync('./logs/error.log', 'utf-8');
    const appLog = fs.readFileSync('./logs/app.log', 'utf-8');
    
    assert.ok(errorLog.includes('[ERROR] Test error'));
    assert.ok(appLog.includes('[ERROR] Test error'));
  });
});
```


#### Test 12.2: Rotacja plików

```javascript
it('powinien rotować plik po przekroczeniu 10MB', () => {
  // Ustaw mniejszy limit dla testu
  logger.maxFileSize = 1024; // 1KB
  
  // Zapisz dużo danych
  for (let i = 0; i < 100; i++) {
    logger.info('Test message with some data to fill the file');
  }
  
  // Sprawdź czy powstał plik rotowany
  const files = fs.readdirSync('./logs');
  const rotatedFiles = files.filter(f => f.includes('app-') && f.endsWith('.log'));
  
  assert.ok(rotatedFiles.length > 0);
});
```


#### Test 12.3: Formatowanie z danymi

```javascript
it('powinien zapisać dane jako JSON', () => {
  const testData = { key: 'value', number: 123 };
  logger.info('Test with data', testData);
  
  const content = fs.readFileSync('./logs/app.log', 'utf-8');
  assert.ok(content.includes('"key": "value"'));
  assert.ok(content.includes('"number": 123'));
});
```


#### Test 12.4: Czyszczenie logów

```javascript
it('powinien wyczyścić wszystkie logi', () => {
  logger.info('Test message');
  logger.clearLogs();
  
  const files = fs.readdirSync('./logs');
  assert.equal(files.length, 0);
});
```


### Kryteria Akceptacji

- [ ] Logowanie na 4 poziomach: DEBUG, INFO, WARN, ERROR
- [ ] Zapis do app.log, error.log z odpowiednim formatowaniem
- [ ] Automatyczna rotacja plików po przekroczeniu 10MB
- [ ] Zachowuje tylko 5 najnowszych plików rotowanych
- [ ] Kolorowanie w konsoli przez chalk (szary/biały/żółty/czerwony)
- [ ] Stack trace dla błędów
- [ ] Respektuje zmienną środowiskową LOG_LEVEL
- [ ] Wszystkie testy przechodzą

***
