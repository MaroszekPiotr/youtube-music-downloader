## Zadanie 7: Moduł Pobierania Pełnego Audio (src/downloader.js)

### Opis

Moduł odpowiedzialny za pobieranie pełnych plików audio z YouTube w najwyższej dostępnej jakości, generowanie checksumów dla nazw plików oraz zapisywanie metadanych.

### Zakres Pracy

- Funkcja `downloadAudio(videoId, outputDir)` - pobiera pełny plik MP3
- Generowanie checksum (SHA256) z videoId dla nazwy pliku
- Progress callback z informacją o postępie
- Automatyczna konwersja do MP3 przez FFmpeg
- Retry logic przy błędach pobierania
- Walidacja pobranego pliku (rozmiar, integritet)


### Implementacja

```javascript
// src/downloader.js
const ytDlp = require('ytdlp-nodejs');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

class AudioDownloader {
  constructor(musicDir = './music') {
    this.musicDir = musicDir;
    if (!fs.existsSync(musicDir)) {
      fs.mkdirSync(musicDir, { recursive: true });
    }
  }

  /**
   * Pobiera pełny plik audio z YouTube
   * @param {string} videoId - YouTube videoId
   * @param {Function} onProgress - Callback dla postępu (optional)
   * @param {number} retries - Liczba prób przy błędach
   * @returns {Promise<{filename: string, checksum: string, filepath: string, size: number}>}
   */
  async downloadAudio(videoId, onProgress = null, retries = 3) {
    const checksum = this._generateChecksum(videoId);
    const filename = `${checksum}.mp3`;
    const filepath = path.join(this.musicDir, filename);
    
    // Sprawdź czy już istnieje
    if (fs.existsSync(filepath)) {
      logger.info(`Plik już istnieje: ${filename}`);
      return {
        filename,
        checksum,
        filepath,
        size: fs.statSync(filepath).size
      };
    }
    
    logger.info(`Pobieranie pełnego audio: ${videoId} → ${filename}`);
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await this._download(videoId, filepath, onProgress);
        
        // Walidacja pobranego pliku
        this._validateFile(filepath);
        
        const stats = fs.statSync(filepath);
        logger.info(`Pobrano: ${filename} (${this._formatSize(stats.size)})`);
        
        return {
          filename,
          checksum,
          filepath,
          size: stats.size
        };
        
      } catch (err) {
        logger.warn(`Próba ${attempt}/${retries} nieudana: ${err.message}`);
        
        // Usuń częściowo pobrany plik
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
        
        if (attempt === retries) {
          throw new Error(`Pobieranie nie powiodło się po ${retries} próbach: ${err.message}`);
        }
        
        // Exponential backoff
        await this._sleep(2000 * Math.pow(2, attempt - 1));
      }
    }
  }

  /**
   * Wewnętrzna funkcja pobierania
   * @private
   */
  async _download(videoId, outputPath, onProgress) {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    return new Promise((resolve, reject) => {
      const downloadProcess = ytDlp.download(videoUrl, {
        filter: 'audioonly',
        format: 'bestaudio',
        audioQuality: 0, // Najwyższa jakość VBR
        type: 'mp3',
        output: outputPath
      });
      
      // Progress callback
      if (onProgress) {
        downloadProcess.on('progress', (data) => {
          if (data.percent) {
            onProgress({
              percent: parseFloat(data.percent),
              downloaded: data.downloaded,
              total: data.total,
              speed: data.speed,
              eta: data.eta
            });
          }
        });
      }
      
      downloadProcess.on('complete', () => {
        resolve();
      });
      
      downloadProcess.on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * Generuje checksum SHA256 z videoId
   * @private
   */
  _generateChecksum(videoId) {
    return crypto
      .createHash('sha256')
      .update(videoId)
      .digest('hex')
      .substring(0, 16); // Pierwsze 16 znaków
  }

  /**
   * Waliduje pobrany plik
   * @private
   */
  _validateFile(filepath) {
    if (!fs.existsSync(filepath)) {
      throw new Error('Plik nie został utworzony');
    }
    
    const stats = fs.statSync(filepath);
    
    // Minimalna wielkość 100KB (bardzo krótki utwór)
    if (stats.size < 100000) {
      throw new Error(`Plik zbyt mały (${stats.size} bytes), prawdopodobnie uszkodzony`);
    }
    
    // Sprawdź czy to rzeczywiście MP3 (magic bytes)
    const buffer = Buffer.alloc(3);
    const fd = fs.openSync(filepath, 'r');
    fs.readSync(fd, buffer, 0, 3, 0);
    fs.closeSync(fd);
    
    // MP3: ID3 tag (0x494433) lub MPEG frame sync (0xFFE/0xFFF)
    const isMP3 = (
      (buffer[^0] === 0x49 && buffer[^1] === 0x44 && buffer[^2] === 0x33) || // ID3
      (buffer[^0] === 0xFF && (buffer[^1] & 0xE0) === 0xE0) // MPEG sync
    );
    
    if (!isMP3) {
      throw new Error('Plik nie jest poprawnym MP3');
    }
  }

  /**
   * Usuwa plik audio
   */
  deleteAudio(filename) {
    const filepath = path.join(this.musicDir, filename);
    
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      logger.info(`Usunięto plik: ${filename}`);
      return true;
    }
    
    return false;
  }

  /**
   * Formatuje rozmiar pliku
   * @private
   */
  _formatSize(bytes) {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new AudioDownloader();
```


### Testy

#### Test 7.1: Pobieranie pliku audio

```javascript
// test/downloader.test.js
const downloader = require('../src/downloader');

describe('Downloader - Pobieranie', () => {
  it('powinien pobrać pełny plik MP3 z YouTube', async function() {
    this.timeout(60000); // YouTube może być wolny
    
    const videoId = 'dQw4w9WgXcQ';
    const result = await downloader.downloadAudio(videoId);
    
    assert.ok(result.filename.endsWith('.mp3'));
    assert.ok(result.checksum);
    assert.ok(result.size > 1000000); // > 1MB
    assert.ok(fs.existsSync(result.filepath));
  });
});
```


#### Test 7.2: Generowanie checksum

```javascript
it('powinien generować identyczny checksum dla tego samego videoId', () => {
  const checksum1 = downloader._generateChecksum('testVideoId');
  const checksum2 = downloader._generateChecksum('testVideoId');
  
  assert.equal(checksum1, checksum2);
  assert.equal(checksum1.length, 16);
});
```


#### Test 7.3: Walidacja pliku MP3

```javascript
it('powinien wykryć uszkodzony plik', () => {
  const testFile = path.join('./music', 'test-corrupt.mp3');
  fs.writeFileSync(testFile, 'Not an MP3 file');
  
  assert.throws(() => {
    downloader._validateFile(testFile);
  }, /nie jest poprawnym MP3/);
  
  fs.unlinkSync(testFile);
});
```


#### Test 7.4: Progress callback

```javascript
it('powinien wywołać callback z postępem pobierania', async function() {
  this.timeout(60000);
  
  let progressCalled = false;
  let lastPercent = 0;
  
  await downloader.downloadAudio('dQw4w9WgXcQ', (progress) => {
    progressCalled = true;
    lastPercent = progress.percent;
    assert.ok(progress.percent >= 0 && progress.percent <= 100);
  });
  
  assert.ok(progressCalled);
  assert.equal(lastPercent, 100);
});
```


### Kryteria Akceptacji

- [ ] `downloadAudio()` pobiera plik MP3 w najwyższej jakości
- [ ] Generuje 16-znakowy checksum SHA256 z videoId
- [ ] Waliduje pobrany plik (rozmiar > 100KB, poprawne magic bytes MP3)
- [ ] Progress callback zwraca procent, speed, eta
- [ ] Retry logic wykonuje 3 próby z exponential backoff
- [ ] Pomija pobieranie jeśli plik już istnieje
- [ ] `deleteAudio()` usuwa plik z dysku
- [ ] Wszystkie testy przechodzą

***

