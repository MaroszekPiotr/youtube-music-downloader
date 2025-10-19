## Zadanie 2: Moduł Fingerprinting (src/fingerprinter.js)

### Opis

Implementacja modułu do generowania audio fingerprintów przez Chromaprint oraz porównywania ich w celu wykrycia identycznych nagrań.

### Zakres Pracy

- Funkcja `generateFingerprint(audioFilePath, options)` - wrapper dla fpcalc
- Funkcja `compareFingerprints(fp1, fp2)` - porównanie binarne
- Obsługa błędów (brak pliku, uszkodzony plik audio)
- Cache fingerprintów w pamięci dla optymalizacji
- Logging operacji fingerprinting


### Implementacja

```javascript
// src/fingerprinter.js
const fpcalc = require('fpcalc');
const fs = require('fs');
const logger = require('./logger');

class Fingerprinter {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Generuje audio fingerprint dla pliku
   * @param {string} filePath - Ścieżka do pliku audio
   * @param {Object} options - Opcje (length: długość w sekundach)
   * @returns {Promise<{fingerprint: string, duration: number}>}
   */
  async generateFingerprint(filePath, options = { length: 60 }) {
    // Sprawdź cache
    const cacheKey = `${filePath}_${options.length}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Sprawdź czy plik istnieje
    if (!fs.existsSync(filePath)) {
      throw new Error(`Plik nie istnieje: ${filePath}`);
    }

    return new Promise((resolve, reject) => {
      fpcalc(filePath, options, (err, result) => {
        if (err) {
          logger.error(`Błąd generowania fingerprint: ${err.message}`);
          reject(err);
        } else {
          // Zapisz w cache
          this.cache.set(cacheKey, result);
          logger.info(`Wygenerowano fingerprint: ${filePath} (${result.duration}s)`);
          resolve(result);
        }
      });
    });
  }

  /**
   * Porównuje dwa fingerprints
   * @param {string} fp1 - Pierwszy fingerprint
   * @param {string} fp2 - Drugi fingerprint
   * @returns {boolean} - true jeśli identyczne
   */
  compareFingerprints(fp1, fp2) {
    if (!fp1 || !fp2) return false;
    return fp1 === fp2;
  }

  /**
   * Czyści cache
   */
  clearCache() {
    this.cache.clear();
  }
}

module.exports = new Fingerprinter();
```


### Testy

#### Test 2.1: Generowanie fingerprint dla poprawnego pliku

```javascript
// test/fingerprinter.test.js
const fingerprinter = require('../src/fingerprinter');
const path = require('path');

describe('Fingerprinter - Generowanie', () => {
  it('powinien wygenerować fingerprint dla pliku MP3', async () => {
    const testFile = path.join(__dirname, 'fixtures', 'sample.mp3');
    const result = await fingerprinter.generateFingerprint(testFile);
    
    assert.ok(result.fingerprint, 'Brak fingerprint');
    assert.ok(result.fingerprint.length > 100, 'Fingerprint zbyt krótki');
    assert.ok(result.duration > 0, 'Niepoprawny czas trwania');
  });
});
```


#### Test 2.2: Obsługa nieistniejącego pliku

```javascript
it('powinien rzucić błąd dla nieistniejącego pliku', async () => {
  await assert.rejects(
    async () => await fingerprinter.generateFingerprint('nonexistent.mp3'),
    /Plik nie istnieje/
  );
});
```


#### Test 2.3: Porównywanie fingerprintów

```javascript
it('powinien wykryć identyczne fingerprints', () => {
  const fp = 'AQAAf0mUaEkSRYnGL0mSI';
  assert.ok(fingerprinter.compareFingerprints(fp, fp));
});

it('powinien wykryć różne fingerprints', () => {
  const fp1 = 'AQAAf0mUaEkSRYnGL0mSI';
  const fp2 = 'BQBBg1nVbFmTJEnQL1mTJ';
  assert.ok(!fingerprinter.compareFingerprints(fp1, fp2));
});
```


#### Test 2.4: Cache fingerprintów

```javascript
it('powinien używać cache dla tego samego pliku', async () => {
  const testFile = path.join(__dirname, 'fixtures', 'sample.mp3');
  
  const start1 = Date.now();
  await fingerprinter.generateFingerprint(testFile);
  const time1 = Date.now() - start1;
  
  const start2 = Date.now();
  await fingerprinter.generateFingerprint(testFile);
  const time2 = Date.now() - start2;
  
  // Cache powinien być znacznie szybszy
  assert.ok(time2 < time1 / 10, 'Cache nie działa');
});
```


### Kryteria Akceptacji

- [ ] `generateFingerprint()` zwraca obiekt z `fingerprint` i `duration`
- [ ] Fingerprint ma długość > 100 znaków
- [ ] Rzuca błąd dla nieistniejących plików
- [ ] `compareFingerprints()` poprawnie wykrywa identyczne i różne fingerprints
- [ ] Cache przyspiesza powtórne wywołania dla tego samego pliku
- [ ] Logi informują o każdej operacji fingerprinting
- [ ] Wszystkie testy przechodzą (100% coverage)

***

