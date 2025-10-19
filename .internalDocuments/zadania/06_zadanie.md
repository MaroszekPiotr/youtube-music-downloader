## Zadanie 6: Moduł Pobierania Metadanych (src/metadata.js)

### Opis

Moduł odpowiedzialny za pobieranie szczegółowych metadanych z playlist YouTube, w tym informacji o każdym utworze: videoId, tytuł, artysta, jakość audio dostępna na YouTube, czas trwania i data publikacji.

### Zakres Pracy

- Funkcja `getPlaylistInfo(playlistUrl)` - pobiera metadane całej playlisty
- Funkcja `getVideoInfo(videoId)` - pobiera metadane pojedynczego video
- Ekstrakcja `audioQuality` (bitrate) z dostępnych formatów
- Parsowanie nazwy playlisty z YouTube
- Obsługa błędów: nieistniejąca playlista, prywatne video, usunięte video
- Walidacja struktury danych zwracanych przez yt-dlp


### Implementacja

```javascript
// src/metadata.js
const ytDlp = require('ytdlp-nodejs');
const logger = require('./logger');

class MetadataExtractor {
  /**
   * Pobiera informacje o playliście
   * @param {string} playlistUrl - URL playlisty YouTube
   * @returns {Promise<{name: string, videos: Array}>}
   */
  async getPlaylistInfo(playlistUrl) {
    logger.info(`Pobieranie metadanych playlisty: ${playlistUrl}`);
    
    try {
      const info = await ytDlp.getInfoAsync(playlistUrl, {
        flatPlaylist: false, // Pełne metadane każdego video
        dumpSingleJson: true
      });
      
      // Walidacja odpowiedzi
      if (!info.entries || !Array.isArray(info.entries)) {
        throw new Error('Niepoprawna struktura danych playlisty');
      }
      
      const playlistName = info.title || 'Unknown Playlist';
      const videos = info.entries
        .filter(entry => entry && !entry.is_unavailable) // Usuń niedostępne
        .map(entry => this._parseVideoEntry(entry));
      
      logger.info(`Znaleziono ${videos.length} utworów w "${playlistName}"`);
      
      return {
        name: playlistName,
        url: playlistUrl,
        videos
      };
      
    } catch (err) {
      logger.error(`Błąd pobierania playlisty: ${err.message}`);
      throw new Error(`Nie udało się pobrać playlisty: ${err.message}`);
    }
  }

  /**
   * Pobiera informacje o pojedynczym video
   * @param {string} videoId - YouTube videoId
   * @returns {Promise<Object>}
   */
  async getVideoInfo(videoId) {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    try {
      const info = await ytDlp.getInfoAsync(videoUrl, {
        dumpSingleJson: true
      });
      
      return this._parseVideoEntry(info);
      
    } catch (err) {
      logger.error(`Błąd pobierania metadanych ${videoId}: ${err.message}`);
      throw err;
    }
  }

  /**
   * Parsuje dane pojedynczego video z yt-dlp
   * @private
   */
  _parseVideoEntry(entry) {
    // Znajdź najlepszy format audio
    const audioQuality = this._extractBestAudioQuality(entry.formats || []);
    
    // Ekstraktuj artystę z tytułu (format: "Artist - Title")
    const { artist, title } = this._parseTitle(entry.title);
    
    return {
      videoId: entry.id,
      title: entry.title,
      parsedTitle: title,
      artist: artist || entry.uploader || entry.channel || 'Unknown Artist',
      uploader: entry.uploader,
      duration: entry.duration || 0,
      audioQuality: audioQuality,
      uploadDate: entry.upload_date,
      viewCount: entry.view_count,
      thumbnailUrl: entry.thumbnail
    };
  }

  /**
   * Znajduje najlepszy dostępny bitrate audio
   * @private
   */
  _extractBestAudioQuality(formats) {
    const audioFormats = formats.filter(f => 
      f.acodec && f.acodec !== 'none' && f.vcodec === 'none'
    );
    
    if (audioFormats.length === 0) {
      logger.warn('Brak dedykowanych formatów audio, szukam w mieszanych');
      // Fallback do formatów z video
      const mixedFormats = formats.filter(f => f.acodec && f.acodec !== 'none');
      audioFormats.push(...mixedFormats);
    }
    
    // Znajdź najwyższy bitrate
    let maxBitrate = 0;
    audioFormats.forEach(format => {
      const bitrate = format.abr || format.tbr || 0;
      if (bitrate > maxBitrate) {
        maxBitrate = bitrate;
      }
    });
    
    return Math.round(maxBitrate) || 128; // Domyślnie 128kbps jeśli brak danych
  }

  /**
   * Parsuje tytuł w formacie "Artist - Title"
   * @private
   */
  _parseTitle(fullTitle) {
    const match = fullTitle.match(/^(.+?)\s*[-–—]\s*(.+)$/);
    
    if (match) {
      return {
        artist: match[^1].trim(),
        title: match[^2].trim()
      };
    }
    
    return {
      artist: null,
      title: fullTitle
    };
  }

  /**
   * Waliduje czy URL to playlista YouTube
   */
  isPlaylistUrl(url) {
    return /[?&]list=/.test(url);
  }

  /**
   * Ekstraktuje playlistId z URL
   */
  extractPlaylistId(url) {
    const match = url.match(/[?&]list=([^&]+)/);
    return match ? match[^1] : null;
  }
}

module.exports = new MetadataExtractor();
```


### Testy

#### Test 6.1: Pobieranie metadanych playlisty

```javascript
// test/metadata.test.js
const metadata = require('../src/metadata');

describe('Metadata - Playlista', () => {
  it('powinien pobrać metadane playlisty YouTube', async function() {
    this.timeout(30000);
    
    // Publiczna testowa playlista
    const playlistUrl = 'https://www.youtube.com/playlist?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf';
    
    const result = await metadata.getPlaylistInfo(playlistUrl);
    
    assert.ok(result.name);
    assert.ok(Array.isArray(result.videos));
    assert.ok(result.videos.length > 0);
    
    // Sprawdź strukturę pierwszego video
    const firstVideo = result.videos[^0];
    assert.ok(firstVideo.videoId);
    assert.ok(firstVideo.title);
    assert.ok(firstVideo.artist);
    assert.ok(firstVideo.audioQuality > 0);
  });
});
```


#### Test 6.2: Pobieranie metadanych pojedynczego video

```javascript
it('powinien pobrać metadane pojedynczego video', async function() {
  this.timeout(20000);
  
  const videoId = 'dQw4w9WgXcQ'; // Rick Astley
  const result = await metadata.getVideoInfo(videoId);
  
  assert.equal(result.videoId, videoId);
  assert.ok(result.title.includes('Never Gonna Give You Up'));
  assert.ok(result.audioQuality >= 128);
  assert.ok(result.duration > 0);
});
```


#### Test 6.3: Ekstrakcja najlepszej jakości audio

```javascript
it('powinien wyekstraktować najwyższą jakość audio', () => {
  const formats = [
    { acodec: 'opus', vcodec: 'none', abr: 128 },
    { acodec: 'opus', vcodec: 'none', abr: 256 },
    { acodec: 'mp4a', vcodec: 'none', abr: 192 }
  ];
  
  const quality = metadata._extractBestAudioQuality(formats);
  assert.equal(quality, 256);
});
```


#### Test 6.4: Parsowanie tytułu Artist - Title

```javascript
it('powinien sparsować tytuł w formacie "Artist - Title"', () => {
  const result = metadata._parseTitle('Rick Astley - Never Gonna Give You Up');
  
  assert.equal(result.artist, 'Rick Astley');
  assert.equal(result.title, 'Never Gonna Give You Up');
});

it('powinien obsłużyć tytuł bez separatora', () => {
  const result = metadata._parseTitle('Never Gonna Give You Up');
  
  assert.equal(result.artist, null);
  assert.equal(result.title, 'Never Gonna Give You Up');
});
```


#### Test 6.5: Walidacja URL playlisty

```javascript
it('powinien rozpoznać URL playlisty', () => {
  const playlistUrl = 'https://www.youtube.com/playlist?list=PLxxx';
  assert.ok(metadata.isPlaylistUrl(playlistUrl));
});

it('powinien odrzucić URL pojedynczego video', () => {
  const videoUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  assert.ok(!metadata.isPlaylistUrl(videoUrl));
});
```


### Kryteria Akceptacji

- [ ] `getPlaylistInfo()` zwraca nazwę playlisty i tablicę videos
- [ ] Każde video zawiera: videoId, title, artist, audioQuality, duration
- [ ] Filtruje niedostępne/usunięte video (is_unavailable)
- [ ] `_extractBestAudioQuality()` zwraca najwyższy bitrate z dostępnych formatów
- [ ] Parsuje tytuły w formacie "Artist - Title" poprawnie
- [ ] Rzuca błąd dla nieistniejącej/prywatnej playlisty
- [ ] `isPlaylistUrl()` poprawnie rozpoznaje URL playlist
- [ ] Wszystkie testy przechodzą

***

