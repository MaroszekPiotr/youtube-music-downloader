## Zadanie 8: Generator Playlist M3U (src/m3u-generator.js)

### Opis

Moduł generujący pliki playlist w formacie M3U rozszerzonym (\#EXTM3U) zgodnym z Navidrome, zawierający metadane utworów oraz ścieżki względne do plików audio.

### Zakres Pracy

- Funkcja `generateM3U(playlistName, tracks, outputDir)` - generuje plik M3U
- Format: `#EXTINF:duration,artist - title` + ścieżka względna
- Aktualizacja istniejących playlist (dodawanie/usuwanie utworów)
- Walidacja ścieżek do plików
- Usuwanie nieistniejących plików z playlist
- Kodowanie UTF-8 dla polskich znaków


### Implementacja

```javascript
// src/m3u-generator.js
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

class M3UGenerator {
  constructor(playlistsDir = './playlists', musicDir = './music') {
    this.playlistsDir = playlistsDir;
    this.musicDir = musicDir;
    
    if (!fs.existsSync(playlistsDir)) {
      fs.mkdirSync(playlistsDir, { recursive: true });
    }
  }

  /**
   * Generuje plik M3U dla playlisty
   * @param {string} playlistName - Nazwa playlisty
   * @param {Array} tracks - Tablica utworów [{title, artist, duration, filename}, ...]
   * @returns {string} - Ścieżka do wygenerowanego pliku
   */
  generateM3U(playlistName, tracks) {
    const sanitizedName = this._sanitizeFilename(playlistName);
    const filepath = path.join(this.playlistsDir, `${sanitizedName}.m3u`);
    
    logger.info(`Generowanie playlisty M3U: ${playlistName} (${tracks.length} utworów)`);
    
    // Waliduj utwory
    const validTracks = tracks.filter(track => {
      const trackPath = path.join(this.musicDir, track.filename);
      if (!fs.existsSync(trackPath)) {
        logger.warn(`Plik nie istnieje: ${track.filename}, pomijam w playliście`);
        return false;
      }
      return true;
    });
    
    // Generuj zawartość M3U
    const content = this._buildM3UContent(validTracks);
    
    // Zapisz z kodowaniem UTF-8
    fs.writeFileSync(filepath, content, 'utf-8');
    
    logger.info(`Wygenerowano: ${filepath} (${validTracks.length}/${tracks.length} utworów)`);
    
    return filepath;
  }

  /**
   * Buduje zawartość pliku M3U
   * @private
   */
  _buildM3UContent(tracks) {
    const lines = ['#EXTM3U', '']; // Header
    
    tracks.forEach(track => {
      // #EXTINF:duration,artist - title
      const duration = Math.round(track.duration || 0);
      const artist = track.artist || 'Unknown Artist';
      const title = track.parsedTitle || track.title || 'Unknown Title';
      
      lines.push(`#EXTINF:${duration},${artist} - ${title}`);
      
      // Ścieżka względna do pliku
      const relativePath = path.join('..', 'music', track.filename);
      lines.push(relativePath);
      lines.push(''); // Pusta linia między utworami
    });
    
    return lines.join('\n');
  }

  /**
   * Aktualizuje istniejącą playlistę
   * @param {string} playlistName - Nazwa playlisty
   * @param {Array} tracks - Nowa lista utworów
   */
  updateM3U(playlistName, tracks) {
    const sanitizedName = this._sanitizeFilename(playlistName);
    const filepath = path.join(this.playlistsDir, `${sanitizedName}.m3u`);
    
    if (fs.existsSync(filepath)) {
      logger.info(`Aktualizacja playlisty: ${playlistName}`);
    }
    
    return this.generateM3U(playlistName, tracks);
  }

  /**
   * Usuwa playlistę
   * @param {string} playlistName - Nazwa playlisty do usunięcia
   */
  deleteM3U(playlistName) {
    const sanitizedName = this._sanitizeFilename(playlistName);
    const filepath = path.join(this.playlistsDir, `${sanitizedName}.m3u`);
    
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      logger.info(`Usunięto playlistę: ${playlistName}`);
      return true;
    }
    
    return false;
  }

  /**
   * Usuwa utwór ze wszystkich playlist
   * @param {string} filename - Nazwa pliku do usunięcia
   */
  removeTrackFromAllPlaylists(filename) {
    const playlists = this.getAllPlaylists();
    let removedCount = 0;
    
    playlists.forEach(playlistFile => {
      const filepath = path.join(this.playlistsDir, playlistFile);
      const content = fs.readFileSync(filepath, 'utf-8');
      const lines = content.split('\n');
      
      // Filtruj linie zawierające ten plik
      const newLines = [];
      let skip = false;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (line.includes(filename)) {
          skip = true;
          removedCount++;
          // Pomiń także poprzednią linię (#EXTINF) jeśli istnieje
          if (newLines.length > 0 && newLines[newLines.length - 1].startsWith('#EXTINF')) {
            newLines.pop();
          }
          continue;
        }
        
        if (!skip) {
          newLines.push(line);
        }
        skip = false;
      }
      
      // Zapisz zaktualizowaną playlistę
      fs.writeFileSync(filepath, newLines.join('\n'), 'utf-8');
    });
    
    logger.info(`Usunięto "${filename}" z ${removedCount} playlist`);
    return removedCount;
  }

  /**
   * Zwraca listę wszystkich playlist
   */
  getAllPlaylists() {
    return fs.readdirSync(this.playlistsDir)
      .filter(file => file.endsWith('.m3u'));
  }

  /**
   * Sanityzuje nazwę pliku (usuwa nielegalne znaki)
   * @private
   */
  _sanitizeFilename(name) {
    return name
      .replace(/[<>:"/\\|?*]/g, '_') // Nielegalne znaki Windows/Unix
      .replace(/\s+/g, '_')           // Spacje → podkreślenia
      .replace(/_{2,}/g, '_')         // Wielokrotne _ → pojedyncze
      .trim();
  }

  /**
   * Parsuje playlistę M3U do tablicy utworów
   * @param {string} playlistName - Nazwa playlisty
   * @returns {Array} - Tablica {title, filepath}
   */
  parseM3U(playlistName) {
    const sanitizedName = this._sanitizeFilename(playlistName);
    const filepath = path.join(this.playlistsDir, `${sanitizedName}.m3u`);
    
    if (!fs.existsSync(filepath)) {
      return [];
    }
    
    const content = fs.readFileSync(filepath, 'utf-8');
    const lines = content.split('\n');
    const tracks = [];
    let currentExtinf = null;
    
    lines.forEach(line => {
      line = line.trim();
      
      if (line.startsWith('#EXTINF:')) {
        currentExtinf = line;
      } else if (line && !line.startsWith('#') && currentExtinf) {
        tracks.push({
          extinf: currentExtinf,
          filepath: line
        });
        currentExtinf = null;
      }
    });
    
    return tracks;
  }
}

module.exports = new M3UGenerator();
```


### Testy

#### Test 8.1: Generowanie pliku M3U

```javascript
// test/m3u-generator.test.js
const m3uGenerator = require('../src/m3u-generator');

describe('M3U Generator - Generowanie', () => {
  beforeEach(() => {
    // Utwórz testowy plik audio
    fs.writeFileSync('./music/test123.mp3', 'test data');
  });

  it('powinien wygenerować poprawny plik M3U', () => {
    const tracks = [
      {
        title: 'Test Song',
        artist: 'Test Artist',
        duration: 213,
        filename: 'test123.mp3',
        parsedTitle: 'Test Song'
      }
    ];
    
    const filepath = m3uGenerator.generateM3U('Test Playlist', tracks);
    
    assert.ok(fs.existsSync(filepath));
    
    const content = fs.readFileSync(filepath, 'utf-8');
    assert.ok(content.startsWith('#EXTM3U'));
    assert.ok(content.includes('#EXTINF:213,Test Artist - Test Song'));
    assert.ok(content.includes('../music/test123.mp3'));
  });
});
```


#### Test 8.2: Sanityzacja nazwy pliku

```javascript
it('powinien usunąć nielegalne znaki z nazwy', () => {
  const sanitized = m3uGenerator._sanitizeFilename('Play<list>: Name/With?Chars');
  assert.equal(sanitized, 'Play_list__Name_With_Chars');
});
```


#### Test 8.3: Usuwanie utworu ze wszystkich playlist

```javascript
it('powinien usunąć utwór ze wszystkich playlist', () => {
  // Utwórz 2 playlisty z tym samym utworem
  const tracks = [{
    title: 'Song',
    artist: 'Artist',
    duration: 180,
    filename: 'remove-me.mp3'
  }];
  
  fs.writeFileSync('./music/remove-me.mp3', 'data');
  
  m3uGenerator.generateM3U('Playlist 1', tracks);
  m3uGenerator.generateM3U('Playlist 2', tracks);
  
  const count = m3uGenerator.removeTrackFromAllPlaylists('remove-me.mp3');
  
  assert.equal(count, 2);
  
  // Sprawdź czy pliki nie zawierają już tego utworu
  const content1 = fs.readFileSync('./playlists/Playlist_1.m3u', 'utf-8');
  assert.ok(!content1.includes('remove-me.mp3'));
});
```


#### Test 8.4: Parsowanie playlisty M3U

```javascript
it('powinien sparsować playlistę M3U do tablicy', () => {
  const tracks = [
    { title: 'Song 1', artist: 'Artist 1', duration: 200, filename: 'song1.mp3' },
    { title: 'Song 2', artist: 'Artist 2', duration: 180, filename: 'song2.mp3' }
  ];
  
  fs.writeFileSync('./music/song1.mp3', 'data');
  fs.writeFileSync('./music/song2.mp3', 'data');
  
  m3uGenerator.generateM3U('Parse Test', tracks);
  const parsed = m3uGenerator.parseM3U('Parse Test');
  
  assert.equal(parsed.length, 2);
  assert.ok(parsed[^0].extinf.includes('Song 1'));
  assert.ok(parsed[^1].filepath.includes('song2.mp3'));
});
```


### Kryteria Akceptacji

- [ ] `generateM3U()` tworzy plik z headerem \#EXTM3U
- [ ] Format linii: `#EXTINF:duration,artist - title` + ścieżka względna
- [ ] Kodowanie UTF-8 obsługuje polskie znaki
- [ ] Sanityzacja nazw usuwa nielegalne znaki (< > : " / \ | ? *)
- [ ] `removeTrackFromAllPlaylists()` usuwa utwór ze wszystkich M3U
- [ ] Walidacja pomija nieistniejące pliki audio
- [ ] `parseM3U()` poprawnie parsuje istniejącą playlistę
- [ ] Wszystkie testy przechodzą

***