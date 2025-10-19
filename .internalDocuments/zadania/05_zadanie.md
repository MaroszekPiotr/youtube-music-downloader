## Zadanie 5: Moduł Deduplikacji (src/deduplicator.js)

### Opis

Logika wykrywania duplikatów przez porównywanie audio fingerprintów oraz decydowania czy zastąpić istniejący utwór lepszą jakością.

### Zakres Pracy

- `findDuplicate(fingerprint, database)` - szuka identycznego fingerprint w bazie
- `shouldReplace(existingTrack, newTrack)` - porównuje jakość audio
- `handleDuplicate(videoId, newTrack, existingTrack)` - akcja przy duplikacie
- Logging szczegółowych informacji o znalezionych duplikatach


### Implementacja

```javascript
// src/deduplicator.js
const database = require('./database');
const logger = require('./logger');
const fs = require('fs');

class Deduplicator {
  /**
   * Szuka duplikatu po fingerprint
   * @param {string} fingerprint - Audio fingerprint
   * @returns {Object|null} - Znaleziony utwór lub null
   */
  findDuplicate(fingerprint) {
    if (!fingerprint) return null;
    
    const duplicate = database.findByFingerprint(fingerprint);
    if (duplicate) {
      logger.info(`Znaleziono duplikat po fingerprint: ${duplicate.title}`);
    }
    return duplicate;
  }

  /**
   * Decyduje czy zastąpić istniejący utwór nowym
   * @param {Object} existingTrack - Istniejący utwór w bazie
   * @param {Object} newTrack - Nowy utwór do porównania
   * @returns {boolean} - true jeśli nowy jest lepszy
   */
  shouldReplace(existingTrack, newTrack) {
    const existingQuality = existingTrack.audioQuality || 0;
    const newQuality = newTrack.audioQuality || 0;
    
    // Zastąp jeśli nowy ma lepszą jakość (różnica >= 10kbps)
    return newQuality > existingQuality + 10;
  }

  /**
   * Obsługuje znaleziony duplikat
   * @param {string} newVideoId - VideoId nowego utworu
   * @param {Object} newTrackData - Dane nowego utworu
   * @param {Object} duplicate - Istniejący duplikat
   * @returns {Object} - { action: 'skip'|'replace', track: Object }
   */
  handleDuplicate(newVideoId, newTrackData, duplicate) {
    const shouldReplace = this.shouldReplace(duplicate, newTrackData);
    
    if (shouldReplace) {
      // Zastąp lepszą jakością
      logger.info(
        `Zastępowanie: "${duplicate.title}" ` +
        `(${duplicate.audioQuality}kbps → ${newTrackData.audioQuality}kbps)`
      );
      
      // Usuń stary plik fizyczny
      const oldFilePath = `./music/${duplicate.filename}`;
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
      
      // Usuń stary wpis z bazy
      database.removeTrack(duplicate.videoId);
      
      // Zachowaj playlisty ze starego utworu
      newTrackData.playlists = [
        ...(duplicate.playlists || []),
        ...(newTrackData.playlists || [])
      ];
      
      // Deduplikuj playlisty
      newTrackData.playlists = [...new Set(newTrackData.playlists)];
      
      this.logReplacement(duplicate, newVideoId, newTrackData);
      
      return {
        action: 'replace',
        track: newTrackData
      };
      
    } else {
      // Pomiń, ale dodaj playlistę
      logger.info(
        `Pomijanie duplikatu: "${newTrackData.title}" ` +
        `(${newTrackData.audioQuality}kbps <= ${duplicate.audioQuality}kbps)`
      );
      
      // Dodaj nową playlistę do istniejącego utworu
      const updatedPlaylists = [
        ...(duplicate.playlists || []),
        ...(newTrackData.playlists || [])
      ];
      
      database.updateTrack(duplicate.videoId, {
        playlists: [...new Set(updatedPlaylists)]
      });
      
      this.logSkip(newVideoId, newTrackData, duplicate);
      
      return {
        action: 'skip',
        track: duplicate
      };
    }
  }

  /**
   * Loguje zastąpienie do logs/replaced.log
   */
  logReplacement(oldTrack, newVideoId, newTrack) {
    const logEntry = [
      `[${new Date().toISOString()}] QUALITY_UPGRADE`,
      `  Title: "${oldTrack.title}"`,
      `  Old VideoId: ${oldTrack.videoId} (${oldTrack.audioQuality}kbps)`,
      `  New VideoId: ${newVideoId} (${newTrack.audioQuality}kbps)`,
      `  Fingerprint: ${oldTrack.fingerprint.substring(0, 20)}... (identical)`,
      `  Action: REPLACED`,
      `  Updated Playlists: [${newTrack.playlists.join(', ')}]`,
      ''
    ].join('\n');
    
    fs.appendFileSync('./logs/replaced.log', logEntry);
  }

  /**
   * Loguje pominięcie do logs/duplicates.log
   */
  logSkip(newVideoId, newTrack, existingTrack) {
    const logEntry = [
      `[${new Date().toISOString()}] DUPLICATE_FOUND`,
      `  Title: "${newTrack.title}"`,
      `  VideoId: ${newVideoId}`,
      `  Fingerprint: ${newTrack.fingerprint.substring(0, 20)}... (matches ${existingTrack.videoId})`,
      `  Audio Quality: ${newTrack.audioQuality}kbps`,
      `  Existing: "${existingTrack.title}" (${existingTrack.videoId}, ${existingTrack.audioQuality}kbps)`,
      `  Action: SKIPPED (lower or equal quality)`,
      ''
    ].join('\n');
    
    fs.appendFileSync('./logs/duplicates.log', logEntry);
  }
}

module.exports = new Deduplicator();
```


### Testy

#### Test 5.1: Wykrywanie duplikatu

```javascript
// test/deduplicator.test.js
describe('Deduplicator - Wykrywanie', () => {
  beforeEach(() => {
    // Dodaj testowy utwór do bazy
    database.addTrack('vid1', {
      fingerprint: 'FP_TEST_123',
      checksum: 'abc',
      filename: 'abc.mp3',
      title: 'Test Song',
      artist: 'Artist',
      audioQuality: 192
    });
  });

  it('powinien znaleźć duplikat po fingerprint', () => {
    const duplicate = deduplicator.findDuplicate('FP_TEST_123');
    assert.ok(duplicate);
    assert.equal(duplicate.title, 'Test Song');
  });

  it('powinien zwrócić null gdy brak duplikatu', () => {
    const duplicate = deduplicator.findDuplicate('FP_DIFFERENT');
    assert.equal(duplicate, null);
  });
});
```


#### Test 5.2: Decyzja o zastąpieniu

```javascript
describe('Deduplicator - Decyzja', () => {
  it('powinien zastąpić gdy nowy ma lepszą jakość', () => {
    const existing = { audioQuality: 128 };
    const newTrack = { audioQuality: 320 };
    assert.ok(deduplicator.shouldReplace(existing, newTrack));
  });

  it('nie powinien zastąpić gdy różnica < 10kbps', () => {
    const existing = { audioQuality: 192 };
    const newTrack = { audioQuality: 195 };
    assert.ok(!deduplicator.shouldReplace(existing, newTrack));
  });
});
```


#### Test 5.3: Obsługa duplikatu - zastąpienie

```javascript
it('powinien zastąpić utwór lepszą jakością', () => {
  const newTrackData = {
    fingerprint: 'FP_TEST_123',
    checksum: 'xyz',
    filename: 'xyz.mp3',
    title: 'Test Song Reupload',
    artist: 'Artist',
    audioQuality: 320,
    playlists: ['New Playlist']
  };
  
  const duplicate = database.findByVideoId('vid1');
  const result = deduplicator.handleDuplicate('vid2', newTrackData, duplicate);
  
  assert.equal(result.action, 'replace');
  assert.ok(result.track.playlists.includes('New Playlist'));
});
```


#### Test 5.4: Obsługa duplikatu - pominięcie

```javascript
it('powinien pominąć utwór gorszej jakości i dodać playlistę', () => {
  const newTrackData = {
    fingerprint: 'FP_TEST_123',
    audioQuality: 128,
    playlists: ['Another Playlist']
  };
  
  const duplicate = database.findByVideoId('vid1');
  const result = deduplicator.handleDuplicate('vid2', newTrackData, duplicate);
  
  assert.equal(result.action, 'skip');
  
  // Sprawdź czy playlista została dodana
  const updated = database.findByVideoId('vid1');
  assert.ok(updated.playlists.includes('Another Playlist'));
});
```


### Kryteria Akceptacji

- [ ] `findDuplicate()` znajduje utwory po identycznym fingerprint
- [ ] `shouldReplace()` zwraca true gdy różnica jakości >= 10kbps
- [ ] `handleDuplicate()` z action='replace' usuwa stary plik i wpis
- [ ] `handleDuplicate()` z action='skip' dodaje playlistę do istniejącego utworu
- [ ] Playlisty są deduplikowane (brak duplikatów w tablicy)
- [ ] Zastąpienia są logowane do `logs/replaced.log`
- [ ] Pominięcia są logowane do `logs/duplicates.log`
- [ ] Wszystkie testy przechodzą

***

Ze względu na limit miejsca, przedstawiłem szczegółowo pierwsze 5 zadań. Pozostałe zadania (6-13) będą realizowane według podobnego schematu z:

- Szczegółowym opisem implementacji
- Testami jednostkowymi (minimum 4 na moduł)
- Kryteriami akceptacji (checkbox list)
- Przykładami kodu

**Pozostałe zadania:**

- Zadanie 6: Moduł pobierania metadanych (metadata.js)
- Zadanie 7: Moduł pobierania pełnego audio (downloader.js)
- Zadanie 8: Generator M3U (m3u-generator.js)
- Zadanie 9: CLI - komenda sync (commands/sync.js)
- Zadanie 10: CLI - komenda remove (commands/remove.js)
- Zadanie 11: CLI - komendy pomocnicze (list, stats, cleanup, validate)
- Zadanie 12: System logowania (logger.js)
- Zadanie 13: Entry point i dokumentacja (index.js, README.md)

Każde zadanie zawiera minimum 70% test coverage z testami jednostkowymi, integracyjnymi i E2E gdzie stosowne.
<span style="display:none">[^2][^3][^4][^5][^6][^7][^8][^9]</span>

<div align="center">⁂</div>

[^1]: https://github.com/isa-group/project-template-nodejs

[^2]: https://dev.to/mr_ali3n/folder-structure-for-nodejs-expressjs-project-435l

[^3]: https://blog.risingstack.com/node-js-project-structure-tutorial-node-js-at-scale/

[^4]: https://blog.logrocket.com/node-js-project-architecture-best-practices/

[^5]: https://stackoverflow.com/questions/5178334/folder-structure-for-a-node-js-project

[^6]: https://www.reddit.com/r/node/comments/1aqrsgf/project_structure_choice_separate_projects_or/

[^7]: https://github.com/makeitrealcamp/nodejs-template

[^8]: https://dev.to/himanshudevgupta/scalable-folder-structure-for-nodejs-expressjs-projects-2025-edition-571p

[^9]: https://www.geeksforgeeks.org/node-js/how-to-make-to-do-list-using-nodejs/

