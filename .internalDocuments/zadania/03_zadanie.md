## Zadanie 3: Moduł Bazy Danych (src/database.js)

### Opis

Implementacja warstwy dostępu do danych przechowujących metadane utworów, fingerprints i playlisty w formacie JSON. CRUD operations z atomowym zapisem.

### Zakres Pracy

- Funkcje: `load()`, `save()`, `addTrack()`, `removeTrack()`, `updateTrack()`
- Funkcje wyszukiwania: `findByVideoId()`, `findByFingerprint()`, `findByChecksum()`
- `getAllTracks()`, `getTracksByPlaylist(playlistName)`
- Atomowy zapis z backup poprzedniej wersji
- Walidacja struktury danych


### Implementacja

```javascript
// src/database.js
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

class Database {
  constructor(dataPath = './data/tracks.json') {
    this.dataPath = dataPath;
    this.data = {};
    this.load();
  }

  /**
   * Ładuje dane z pliku JSON
   */
  load() {
    try {
      if (fs.existsSync(this.dataPath)) {
        const rawData = fs.readFileSync(this.dataPath, 'utf-8');
        this.data = JSON.parse(rawData);
        logger.info(`Załadowano ${Object.keys(this.data).length} utworów z bazy`);
      } else {
        this.data = {};
        this.save();
      }
    } catch (err) {
      logger.error(`Błąd ładowania bazy: ${err.message}`);
      // Spróbuj odzyskać z backupu
      this.loadBackup();
    }
  }

  /**
   * Zapisuje dane do pliku JSON z backupem
   */
  save() {
    try {
      // Backup poprzedniej wersji
      if (fs.existsSync(this.dataPath)) {
        fs.copyFileSync(this.dataPath, `${this.dataPath}.backup`);
      }
      
      fs.writeFileSync(
        this.dataPath, 
        JSON.stringify(this.data, null, 2),
        'utf-8'
      );
      logger.info('Zapisano bazę danych');
    } catch (err) {
      logger.error(`Błąd zapisu bazy: ${err.message}`);
      throw err;
    }
  }

  /**
   * Dodaje nowy utwór do bazy
   */
  addTrack(videoId, trackData) {
    if (this.data[videoId]) {
      throw new Error(`Utwór ${videoId} już istnieje w bazie`);
    }
    
    // Walidacja
    this.validateTrackData(trackData);
    
    this.data[videoId] = {
      ...trackData,
      addedAt: new Date().toISOString()
    };
    this.save();
    logger.info(`Dodano utwór: ${trackData.title} (${videoId})`);
  }

  /**
   * Usuwa utwór z bazy
   */
  removeTrack(videoId) {
    if (!this.data[videoId]) {
      throw new Error(`Utwór ${videoId} nie istnieje w bazie`);
    }
    
    const title = this.data[videoId].title;
    delete this.data[videoId];
    this.save();
    logger.info(`Usunięto utwór: ${title} (${videoId})`);
  }

  /**
   * Aktualizuje dane utworu
   */
  updateTrack(videoId, updates) {
    if (!this.data[videoId]) {
      throw new Error(`Utwór ${videoId} nie istnieje w bazie`);
    }
    
    this.data[videoId] = {
      ...this.data[videoId],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.save();
  }

  /**
   * Wyszukuje po videoId
   */
  findByVideoId(videoId) {
    return this.data[videoId] || null;
  }

  /**
   * Wyszukuje po fingerprint
   */
  findByFingerprint(fingerprint) {
    for (const [videoId, track] of Object.entries(this.data)) {
      if (track.fingerprint === fingerprint) {
        return { videoId, ...track };
      }
    }
    return null;
  }

  /**
   * Wyszukuje po checksum
   */
  findByChecksum(checksum) {
    for (const [videoId, track] of Object.entries(this.data)) {
      if (track.checksum === checksum) {
        return { videoId, ...track };
      }
    }
    return null;
  }

  /**
   * Zwraca wszystkie utwory
   */
  getAllTracks() {
    return Object.entries(this.data).map(([videoId, track]) => ({
      videoId,
      ...track
    }));
  }

  /**
   * Zwraca utwory z danej playlisty
   */
  getTracksByPlaylist(playlistName) {
    return this.getAllTracks().filter(track => 
      track.playlists && track.playlists.includes(playlistName)
    );
  }

  /**
   * Waliduje strukturę danych utworu
   */
  validateTrackData(trackData) {
    const required = ['fingerprint', 'checksum', 'filename', 'title', 'artist'];
    for (const field of required) {
      if (!trackData[field]) {
        throw new Error(`Brak wymaganego pola: ${field}`);
      }
    }
  }

  /**
   * Ładuje backup
   */
  loadBackup() {
    const backupPath = `${this.dataPath}.backup`;
    if (fs.existsSync(backupPath)) {
      const rawData = fs.readFileSync(backupPath, 'utf-8');
      this.data = JSON.parse(rawData);
      logger.warn('Odzyskano dane z backupu');
    }
  }
}

module.exports = new Database();
```


### Testy

#### Test 3.1: Dodawanie utworu

```javascript
// test/database.test.js
describe('Database - CRUD', () => {
  beforeEach(() => {
    // Użyj testowej bazy
    db = new Database('./test/data/test-tracks.json');
  });

  it('powinien dodać nowy utwór', () => {
    const trackData = {
      fingerprint: 'AQAAf0mUaEk...',
      checksum: 'abc123',
      filename: 'abc123.mp3',
      title: 'Test Song',
      artist: 'Test Artist',
      audioQuality: 192,
      playlists: []
    };
    
    db.addTrack('testVideoId', trackData);
    const found = db.findByVideoId('testVideoId');
    
    assert.ok(found);
    assert.equal(found.title, 'Test Song');
    assert.ok(found.addedAt);
  });
});
```


#### Test 3.2: Wyszukiwanie po fingerprint

```javascript
it('powinien znaleźć utwór po fingerprint', () => {
  const fp = 'AQAAf0mUaEk...';
  db.addTrack('vid1', { 
    fingerprint: fp,
    checksum: 'abc',
    filename: 'abc.mp3',
    title: 'Song',
    artist: 'Artist'
  });
  
  const found = db.findByFingerprint(fp);
  assert.ok(found);
  assert.equal(found.videoId, 'vid1');
});
```


#### Test 3.3: Atomowy zapis z backupem

```javascript
it('powinien utworzyć backup przed zapisem', () => {
  db.addTrack('vid1', validTrackData);
  
  const backupPath = './test/data/test-tracks.json.backup';
  assert.ok(fs.existsSync(backupPath));
});
```


#### Test 3.4: Walidacja danych

```javascript
it('powinien rzucić błąd przy brakujących polach', () => {
  assert.throws(() => {
    db.addTrack('vid1', { title: 'Only Title' });
  }, /Brak wymaganego pola/);
});
```


### Kryteria Akceptacji

- [ ] `addTrack()` dodaje utwór i zapisuje do pliku
- [ ] `removeTrack()` usuwa utwór i zapisuje zmiany
- [ ] `findByFingerprint()` znajduje utwory po fingerprint
- [ ] Przy zapisie tworzony jest backup poprzedniej wersji
- [ ] Walidacja wykrywa brakujące pola wymagane
- [ ] `getAllTracks()` zwraca wszystkie utwory z videoId
- [ ] Recovery z backupu działa przy uszkodzonym pliku głównym
- [ ] Wszystkie testy przechodzą

***

