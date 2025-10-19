## Zadanie 4: Moduł Pobierania Fragmentów Audio (src/sample-downloader.js)

### Opis

Moduł do pobierania pierwszych 60 sekund audio z YouTube w celu wygenerowania fingerprint bez konieczności pobierania całego pliku.

### Zakres Pracy

- Funkcja `downloadSample(videoUrl, outputPath, duration)`
- Konfiguracja yt-dlp z postprocessorArgs: `-ss 0 -t 60`
- Progress callback
- Automatyczne czyszczenie plików tymczasowych
- Retry logic przy błędach sieci


### Implementacja

```javascript
// src/sample-downloader.js
const ytDlp = require('ytdlp-nodejs');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

class SampleDownloader {
  constructor(tempDir = './temp') {
    this.tempDir = tempDir;
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  }

  /**
   * Pobiera fragment audio (domyślnie 60s)
   * @param {string} videoId - YouTube videoId
   * @param {number} duration - Długość fragmentu w sekundach
   * @param {number} retries - Liczba prób przy błędach
   * @returns {Promise<string>} - Ścieżka do pobranego pliku
   */
  async downloadSample(videoId, duration = 60, retries = 3) {
    const outputPath = path.join(this.tempDir, `${videoId}_sample.mp3`);
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    logger.info(`Pobieranie fragmentu: ${videoId} (${duration}s)`);
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await this._download(videoUrl, outputPath, duration);
        
        // Weryfikuj czy plik został utworzony
        if (fs.existsSync(outputPath)) {
          const stats = fs.statSync(outputPath);
          logger.info(`Pobrano fragment: ${videoId} (${stats.size} bytes)`);
          return outputPath;
        }
      } catch (err) {
        logger.warn(`Próba ${attempt}/${retries} nieudana: ${err.message}`);
        if (attempt === retries) {
          throw new Error(`Nie udało się pobrać fragmentu po ${retries} próbach`);
        }
        // Czekaj przed kolejną próbą (exponential backoff)
        await this._sleep(1000 * Math.pow(2, attempt - 1));
      }
    }
  }

  /**
   * Wewnętrzna funkcja pobierania
   */
  async _download(videoUrl, outputPath, duration) {
    return new Promise((resolve, reject) => {
      ytDlp.download(videoUrl, {
        filter: 'audioonly',
        format: 'bestaudio',
        audioQuality: 0,
        type: 'mp3',
        output: outputPath,
        postprocessorArgs: [
          '-ss', '0',              // Start od 0 sekundy
          '-t', duration.toString() // Długość
        ]
      }, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
  }

  /**
   * Usuwa plik tymczasowy
   */
  cleanup(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info(`Usunięto plik tymczasowy: ${path.basename(filePath)}`);
      }
    } catch (err) {
      logger.warn(`Nie udało się usunąć pliku: ${err.message}`);
    }
  }

  /**
   * Czyści cały folder temp
   */
  cleanupAll() {
    try {
      const files = fs.readdirSync(this.tempDir);
      files.forEach(file => {
        const filePath = path.join(this.tempDir, file);
        fs.unlinkSync(filePath);
      });
      logger.info(`Wyczyszczono folder temp (${files.length} plików)`);
    } catch (err) {
      logger.error(`Błąd czyszczenia folderu temp: ${err.message}`);
    }
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new SampleDownloader();
```


### Testy

#### Test 4.1: Pobieranie fragmentu

```javascript
// test/sample-downloader.test.js
describe('SampleDownloader - Pobieranie', () => {
  it('powinien pobrać 60s fragment z YouTube', async function() {
    this.timeout(30000); // YouTube może być wolny
    
    const videoId = 'dQw4w9WgXcQ'; // Rick Astley (publiczny test video)
    const filePath = await sampleDownloader.downloadSample(videoId, 60);
    
    assert.ok(fs.existsSync(filePath));
    const stats = fs.statSync(filePath);
    assert.ok(stats.size > 500000, 'Plik zbyt mały'); // ~0.5MB minimum
  });
});
```


#### Test 4.2: Retry logic

```javascript
it('powinien ponowić próbę przy błędzie', async function() {
  this.timeout(60000);
  
  // Symuluj niestabilne połączenie przez losowe błędy
  let attempts = 0;
  const originalDownload = sampleDownloader._download;
  sampleDownloader._download = async function(...args) {
    attempts++;
    if (attempts < 2) {
      throw new Error('Network error');
    }
    return originalDownload.apply(this, args);
  };
  
  await sampleDownloader.downloadSample('dQw4w9WgXcQ', 10);
  assert.ok(attempts >= 2, 'Nie wykonano retry');
});
```


#### Test 4.3: Cleanup pojedynczego pliku

```javascript
it('powinien usunąć plik tymczasowy', async () => {
  const testFile = path.join('./temp', 'test_sample.mp3');
  fs.writeFileSync(testFile, 'test data');
  
  sampleDownloader.cleanup(testFile);
  assert.ok(!fs.existsSync(testFile));
});
```


#### Test 4.4: Cleanup całego folderu

```javascript
it('powinien wyczyścić cały folder temp', () => {
  // Utwórz kilka testowych plików
  for (let i = 0; i < 3; i++) {
    fs.writeFileSync(path.join('./temp', `test${i}.mp3`), 'data');
  }
  
  sampleDownloader.cleanupAll();
  const files = fs.readdirSync('./temp');
  assert.equal(files.length, 0);
});
```


### Kryteria Akceptacji

- [ ] `downloadSample()` pobiera fragment 60s z YouTube
- [ ] Pobrany plik ma rozmiar > 500KB (zależy od jakości)
- [ ] Retry logic wykonuje 3 próby z exponential backoff
- [ ] `cleanup()` usuwa pojedynczy plik tymczasowy
- [ ] `cleanupAll()` usuwa wszystkie pliki z `/temp`
- [ ] Logi informują o każdej próbie i wyniku
- [ ] Wszystkie testy przechodzą

***

