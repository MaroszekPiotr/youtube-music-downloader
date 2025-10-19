## Zadanie 9: CLI - Komenda Sync (src/commands/sync.js)

### Opis

Główna komenda aplikacji orchestrująca cały proces synchronizacji playlist: pobieranie metadanych, deduplikacja przez fingerprinting, pobieranie audio i generowanie playlist M3U. Zawiera szczegółowy raportowanie postępu i statystyk.

### Zakres Pracy

- Odczyt linków do playlist z pliku JSON
- Workflow dla każdej playlisty:

1. Pobierz metadane z YouTube
2. Dla każdego utworu: sprawdź videoId → fingerprint → deduplikacja → pobierz
3. Generuj/aktualizuj plik M3U
- Progress bar z biblioteką `cli-progress`
- Kolorowy output przez `chalk`
- Raport końcowy ze statystykami
- Obsługa przerwania (Ctrl+C) z cleanup


### Implementacja

```javascript
// src/commands/sync.js
const metadata = require('../metadata');
const sampleDownloader = require('../sample-downloader');
const fingerprinter = require('../fingerprinter');
const deduplicator = require('../deduplicator');
const downloader = require('../downloader');
const m3uGenerator = require('../m3u-generator');
const database = require('../database');
const logger = require('../logger');
const fs = require('fs');
const chalk = require('chalk');
const cliProgress = require('cli-progress');

class SyncCommand {
  constructor() {
    this.stats = {
      totalPlaylists: 0,
      totalVideos: 0,
      newDownloads: 0,
      skippedDuplicates: 0,
      replacedQuality: 0,
      errors: 0
    };
  }

  /**
   * Wykonuje synchronizację playlist
   * @param {string} playlistsFile - Ścieżka do pliku JSON z linkami
   */
  async execute(playlistsFile) {
    console.log(chalk.cyan.bold('\n🎵 YouTube Music Downloader - Synchronizacja\n'));
    
    // Wczytaj linki do playlist
    const playlistUrls = this._loadPlaylistsFile(playlistsFile);
    
    if (playlistUrls.length === 0) {
      console.log(chalk.yellow('⚠ Brak playlist do synchronizacji'));
      return;
    }
    
    this.stats.totalPlaylists = playlistUrls.length;
    console.log(chalk.white(`📋 Znaleziono ${playlistUrls.length} playlist do synchronizacji\n`));
    
    // Przetwarzaj każdą playlistę
    for (const [index, playlistUrl] of playlistUrls.entries()) {
      console.log(chalk.cyan(`\n[${index + 1}/${playlistUrls.length}] Przetwarzanie playlisty...`));
      
      try {
        await this._processPlaylist(playlistUrl);
      } catch (err) {
        console.log(chalk.red(`✗ Błąd: ${err.message}`));
        this.stats.errors++;
        logger.error(`Błąd synchronizacji playlisty ${playlistUrl}: ${err.message}`);
      }
    }
    
    // Wyczyść folder temp
    sampleDownloader.cleanupAll();
    
    // Pokaż raport końcowy
    this._showFinalReport();
  }

  /**
   * Przetwarza pojedynczą playlistę
   * @private
   */
  async _processPlaylist(playlistUrl) {
    // 1. Pobierz metadane
    console.log(chalk.gray('  Pobieranie metadanych...'));
    const playlistInfo = await metadata.getPlaylistInfo(playlistUrl);
    
    console.log(chalk.white(`  📁 ${playlistInfo.name}`));
    console.log(chalk.gray(`  📊 Znaleziono ${playlistInfo.videos.length} utworów`));
    
    this.stats.totalVideos += playlistInfo.videos.length;
    
    // 2. Przetwarzaj utwory
    const processedTracks = [];
    
    // Progress bar
    const progressBar = new cliProgress.SingleBar({
      format: '  {bar} {percentage}% | {value}/{total} utworów | {status}',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });
    
    progressBar.start(playlistInfo.videos.length, 0, { status: 'Rozpoczynam...' });
    
    for (const [index, video] of playlistInfo.videos.entries()) {
      try {
        const result = await this._processVideo(video, playlistInfo.name);
        processedTracks.push(result.track);
        
        // Aktualizuj progress bar
        progressBar.update(index + 1, {
          status: result.action === 'downloaded' ? chalk.green('✓ Pobrano') :
                  result.action === 'skipped' ? chalk.yellow('⊘ Duplikat') :
                  chalk.blue('⟳ Zastąpiono')
        });
        
      } catch (err) {
        progressBar.update(index + 1, { status: chalk.red('✗ Błąd') });
        logger.error(`Błąd przetwarzania ${video.videoId}: ${err.message}`);
        this.stats.errors++;
      }
    }
    
    progressBar.stop();
    
    // 3. Generuj plik M3U
    console.log(chalk.gray('\n  Generowanie playlisty M3U...'));
    m3uGenerator.generateM3U(playlistInfo.name, processedTracks);
    console.log(chalk.green(`  ✓ Playlista zapisana: ${playlistInfo.name}.m3u`));
  }

  /**
   * Przetwarza pojedynczy utwór
   * @private
   */
  async _processVideo(video, playlistName) {
    // Sprawdź czy videoId już w bazie
    const existing = database.findByVideoId(video.videoId);
    
    if (existing) {
      // Dodaj tylko playlistę
      const playlists = [...new Set([...(existing.playlists || []), playlistName])];
      database.updateTrack(video.videoId, { playlists });
      
      return {
        action: 'exists',
        track: existing
      };
    }
    
    // Pobierz 60s fragment do fingerprinting
    const samplePath = await sampleDownloader.downloadSample(video.videoId, 60);
    
    // Wygeneruj fingerprint
    const { fingerprint, duration } = await fingerprinter.generateFingerprint(samplePath);
    
    // Sprawdź deduplikację
    const duplicate = deduplicator.findDuplicate(fingerprint);
    
    if (duplicate) {
      // Obsłuż duplikat (skip lub replace)
      const newTrackData = {
        fingerprint,
        title: video.title,
        parsedTitle: video.parsedTitle,
        artist: video.artist,
        audioQuality: video.audioQuality,
        duration: video.duration,
        playlists: [playlistName]
      };
      
      const result = deduplicator.handleDuplicate(video.videoId, newTrackData, duplicate);
      
      // Cleanup sample
      sampleDownloader.cleanup(samplePath);
      
      if (result.action === 'skip') {
        this.stats.skippedDuplicates++;
        return { action: 'skipped', track: result.track };
      } else {
        // Pobierz pełny plik (zastąpienie)
        const downloadResult = await downloader.downloadAudio(video.videoId);
        
        // Dodaj do bazy
        database.addTrack(video.videoId, {
          ...newTrackData,
          checksum: downloadResult.checksum,
          filename: downloadResult.filename
        });
        
        this.stats.replacedQuality++;
        return { action: 'replaced', track: newTrackData };
      }
    }
    
    // Nowy utwór - pobierz pełny plik
    const downloadResult = await downloader.downloadAudio(video.videoId);
    
    // Cleanup sample
    sampleDownloader.cleanup(samplePath);
    
    // Dodaj do bazy
    const trackData = {
      fingerprint,
      checksum: downloadResult.checksum,
      filename: downloadResult.filename,
      title: video.title,
      parsedTitle: video.parsedTitle,
      artist: video.artist,
      audioQuality: video.audioQuality,
      duration: video.duration,
      playlists: [playlistName]
    };
    
    database.addTrack(video.videoId, trackData);
    
    this.stats.newDownloads++;
    return { action: 'downloaded', track: trackData };
  }

  /**
   * Wczytuje plik z linkami do playlist
   * @private
   */
  _loadPlaylistsFile(filepath) {
    if (!fs.existsSync(filepath)) {
      throw new Error(`Plik nie istnieje: ${filepath}`);
    }
    
    try {
      const content = fs.readFileSync(filepath, 'utf-8');
      const urls = JSON.parse(content);
      
      if (!Array.isArray(urls)) {
        throw new Error('Plik musi zawierać tablicę JSON');
      }
      
      // Waliduj URLs
      return urls.filter(url => {
        if (!metadata.isPlaylistUrl(url)) {
          console.log(chalk.yellow(`⚠ Pomijam niepoprawny URL: ${url}`));
          return false;
        }
        return true;
      });
      
    } catch (err) {
      throw new Error(`Nie udało się wczytać pliku: ${err.message}`);
    }
  }

  /**
   * Pokazuje raport końcowy
   * @private
   */
  _showFinalReport() {
    console.log(chalk.cyan.bold('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.cyan.bold('📈 Podsumowanie Synchronizacji'));
    console.log(chalk.cyan.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
    
    console.log(chalk.white(`  Playlisty:              ${this.stats.totalPlaylists}`));
    console.log(chalk.white(`  Utwory sprawdzone:      ${this.stats.totalVideos}`));
    console.log(chalk.green(`  ✓ Nowe pobrane:         ${this.stats.newDownloads}`));
    console.log(chalk.yellow(`  ⊘ Pominięte duplikaty:  ${this.stats.skippedDuplicates}`));
    console.log(chalk.blue(`  ⟳ Zastąpione jakością:  ${this.stats.replacedQuality}`));
    
    if (this.stats.errors > 0) {
      console.log(chalk.red(`  ✗ Błędy:                ${this.stats.errors}`));
    }
    
    console.log(chalk.cyan.bold('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
    
    // Całkowity rozmiar biblioteki
    const allTracks = database.getAllTracks();
    const totalSize = allTracks.reduce((sum, track) => {
      const filepath = `./music/${track.filename}`;
      if (fs.existsSync(filepath)) {
        return sum + fs.statSync(filepath).size;
      }
      return sum;
    }, 0);
    
    console.log(chalk.white(`  📚 Biblioteka: ${allTracks.length} utworów (${this._formatSize(totalSize)})\n`));
  }

  _formatSize(bytes) {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}

module.exports = new SyncCommand();
```


### Testy

#### Test 9.1: Wczytywanie pliku playlist

```javascript
// test/sync-command.test.js
const syncCommand = require('../src/commands/sync');

describe('Sync Command - Plik playlist', () => {
  it('powinien wczytać poprawny plik JSON', () => {
    const testFile = './test/fixtures/playlists.json';
    fs.writeFileSync(testFile, JSON.stringify([
      'https://www.youtube.com/playlist?list=PLxxx',
      'https://www.youtube.com/playlist?list=PLyyy'
    ]));
    
    const urls = syncCommand._loadPlaylistsFile(testFile);
    assert.equal(urls.length, 2);
  });

  it('powinien odfiltrować niepoprawne URLs', () => {
    const testFile = './test/fixtures/playlists-invalid.json';
    fs.writeFileSync(testFile, JSON.stringify([
      'https://www.youtube.com/playlist?list=PLxxx',
      'https://www.youtube.com/watch?v=invalid'
    ]));
    
    const urls = syncCommand._loadPlaylistsFile(testFile);
    assert.equal(urls.length, 1);
  });
});
```


#### Test 9.2: Przetwarzanie utworu - nowy

```javascript
it('powinien pobrać nowy utwór', async function() {
  this.timeout(60000);
  
  const video = {
    videoId: 'dQw4w9WgXcQ',
    title: 'Test Song',
    artist: 'Test Artist',
    audioQuality: 192,
    duration: 213
  };
  
  const result = await syncCommand._processVideo(video, 'Test Playlist');
  
  assert.equal(result.action, 'downloaded');
  assert.ok(database.findByVideoId('dQw4w9WgXcQ'));
});
```


#### Test 9.3: Przetwarzanie utworu - duplikat

```javascript
it('powinien pominąć duplikat gorszej jakości', async function() {
  this.timeout(60000);
  
  // Dodaj istniejący utwór
  const existingFingerprint = 'FP_TEST_123';
  database.addTrack('existing', {
    fingerprint: existingFingerprint,
    checksum: 'abc',
    filename: 'abc.mp3',
    title: 'Existing',
    artist: 'Artist',
    audioQuality: 320
  });
  
  // Mock fingerprinter żeby zwrócił ten sam fingerprint
  const originalGenerate = fingerprinter.generateFingerprint;
  fingerprinter.generateFingerprint = async () => ({
    fingerprint: existingFingerprint,
    duration: 180
  });
  
  const video = {
    videoId: 'duplicate',
    title: 'Duplicate',
    artist: 'Artist',
    audioQuality: 128, // Gorsza jakość
    duration: 180
  };
  
  const result = await syncCommand._processVideo(video, 'Test Playlist');
  
  assert.equal(result.action, 'skipped');
  
  // Przywróć oryginalną funkcję
  fingerprinter.generateFingerprint = originalGenerate;
});
```


#### Test 9.4: E2E test - pełna synchronizacja

```javascript
it('powinien zsynchronizować całą playlistę E2E', async function() {
  this.timeout(120000);
  
  const testFile = './test/fixtures/test-playlists.json';
  fs.writeFileSync(testFile, JSON.stringify([
    'https://www.youtube.com/playlist?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf'
  ]));
  
  await syncCommand.execute(testFile);
  
  assert.ok(syncCommand.stats.totalVideos > 0);
  assert.ok(syncCommand.stats.newDownloads > 0);
});
```


### Kryteria Akceptacji

- [ ] Wczytuje plik JSON z tablicą URLs do playlist
- [ ] Odfiltruje niepoprawne URLs (nie-playlisty)
- [ ] Dla każdej playlisty: pobiera metadane, przetwarza utwory, generuje M3U
- [ ] Progress bar pokazuje postęp z kolorowym statusem
- [ ] Deduplikacja przez fingerprinting działa poprawnie
- [ ] Raport końcowy pokazuje statystyki (pobrane, pominięte, zastąpione)
- [ ] Cleanup folderu /temp po synchronizacji
- [ ] Wszystkie testy przechodzą (w tym E2E)

***

Ze względu na długość odpowiedzi, przedstawiłem szczegółowo zadania 6-9. Pozostałe zadania (10-13) będą zaimplementowane według tego samego schematu:

**Zadanie 10: CLI - Komenda Remove** - usuwa utwory z bazy, dysku i wszystkich playlist M3U, z opcjami wyszukiwania po videoId/checksum/tytule.

**Zadanie 11: CLI - Komendy Pomocnicze** - implementacja `list` (tabelaryczne wyświetlanie), `stats` (statystyki biblioteki), `cleanup` (usuwanie osieroconych plików), `validate` (weryfikacja integralności).

**Zadanie 12: System Logowania** - uniwersalny logger z poziomami (info/warn/error), rotacją plików, kolorowaniem konsoli przez chalk.

**Zadanie 13: Entry Point i Dokumentacja** - CLI przez Commander.js, README.md, przykładowe pliki konfiguracyjne, instrukcje użycia.

Każde zadanie zawiera minimum 4 testy jednostkowe + kryteria akceptacji w formie checkbox list.
<span style="display:none">[^3][^4][^5]</span>

<div align="center">⁂</div>

[^1]: https://github.com/DevEmperor/YMD

[^2]: https://www.dobreprogramy.pl/youtube-music-downloader,program,windows,6628302407505537

[^3]: https://www.instalki.pl/rankingi/top/pobieranie-z-youtube-10-najlepszych-programow/

[^4]: https://github.com/topics/youtube-mp3-downloader

[^5]: https://www.dobreprogramy.pl/youtube-song-downloader,program,windows,6628632938776705

