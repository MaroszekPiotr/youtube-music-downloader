## Zadanie 10: CLI - Komenda Remove (src/commands/remove.js)

### Opis

Komenda umożliwiająca usunięcie utworu z biblioteki wraz z automatycznym usunięciem pliku fizycznego z dysku oraz wszystkich referencji z playlist M3U. Obsługuje wyszukiwanie po videoId, checksumie lub fragmencie tytułu.

### Zakres Pracy

- Funkcja `execute(identifier, options)` - główna funkcja usuwania
- Wyszukiwanie utworu po różnych kryteriach: videoId, checksum, tytuł (fuzzy search)
- Interaktywne potwierdzenie przed usunięciem
- Usuwanie pliku fizycznego z `/music`
- Aktualizacja wszystkich plików M3U
- Usunięcie wpisu z bazy danych
- Opcja `--force` dla pominięcia potwierdzenia
- Szczegółowy raport o usuniętych elementach


### Implementacja

```javascript
// src/commands/remove.js
const database = require('../database');
const downloader = require('../downloader');
const m3uGenerator = require('../m3u-generator');
const logger = require('../logger');
const chalk = require('chalk');
const readline = require('readline');

class RemoveCommand {
  /**
   * Usuwa utwór z biblioteki
   * @param {string} identifier - VideoId, checksum lub fragment tytułu
   * @param {Object} options - Opcje {force: boolean}
   */
  async execute(identifier, options = {}) {
    console.log(chalk.cyan.bold('\n🗑️  YouTube Music Downloader - Usuwanie Utworu\n'));
    
    // Znajdź utwór
    const track = this._findTrack(identifier);
    
    if (!track) {
      console.log(chalk.red(`✗ Nie znaleziono utworu: "${identifier}"`));
      console.log(chalk.gray('\nSpróbuj wyszukać po:'));
      console.log(chalk.gray('  • VideoId (np. dQw4w9WgXcQ)'));
      console.log(chalk.gray('  • Checksum (np. a3f5e2b1c4d8)'));
      console.log(chalk.gray('  • Fragment tytułu (np. "Never Gonna Give")'));
      return;
    }
    
    // Pokaż informacje o utworze
    this._displayTrackInfo(track);
    
    // Potwierdź usunięcie (jeśli nie --force)
    if (!options.force) {
      const confirmed = await this._confirm('Czy na pewno chcesz usunąć ten utwór?');
      if (!confirmed) {
        console.log(chalk.yellow('\n⊘ Anulowano'));
        return;
      }
    }
    
    console.log(chalk.gray('\n🔄 Usuwanie...'));
    
    const results = {
      fileDeleted: false,
      playlistsUpdated: 0,
      databaseRemoved: false
    };
    
    // 1. Usuń plik fizyczny
    try {
      const deleted = downloader.deleteAudio(track.filename);
      results.fileDeleted = deleted;
      if (deleted) {
        console.log(chalk.green(`  ✓ Usunięto plik: ${track.filename}`));
      } else {
        console.log(chalk.yellow(`  ⚠ Plik nie istnieje: ${track.filename}`));
      }
    } catch (err) {
      console.log(chalk.red(`  ✗ Błąd usuwania pliku: ${err.message}`));
      logger.error(`Błąd usuwania pliku ${track.filename}: ${err.message}`);
    }
    
    // 2. Usuń z wszystkich playlist M3U
    try {
      const count = m3uGenerator.removeTrackFromAllPlaylists(track.filename);
      results.playlistsUpdated = count;
      console.log(chalk.green(`  ✓ Zaktualizowano ${count} playlist`));
    } catch (err) {
      console.log(chalk.red(`  ✗ Błąd aktualizacji playlist: ${err.message}`));
      logger.error(`Błąd aktualizacji playlist: ${err.message}`);
    }
    
    // 3. Usuń z bazy danych
    try {
      database.removeTrack(track.videoId);
      results.databaseRemoved = true;
      console.log(chalk.green(`  ✓ Usunięto z bazy danych`));
    } catch (err) {
      console.log(chalk.red(`  ✗ Błąd usuwania z bazy: ${err.message}`));
      logger.error(`Błąd usuwania z bazy: ${err.message}`);
    }
    
    // Raport końcowy
    console.log(chalk.cyan.bold('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.green.bold('✓ Utwór został usunięty'));
    console.log(chalk.cyan.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
    
    logger.info(`Usunięto utwór: ${track.title} (${track.videoId})`);
  }

  /**
   * Znajduje utwór po identyfikatorze
   * @private
   */
  _findTrack(identifier) {
    // Szukaj po videoId
    let track = database.findByVideoId(identifier);
    if (track) {
      return { videoId: identifier, ...track };
    }
    
    // Szukaj po checksumie
    track = database.findByChecksum(identifier);
    if (track) {
      return track;
    }
    
    // Szukaj po fragmencie tytułu (case-insensitive)
    const allTracks = database.getAllTracks();
    const matches = allTracks.filter(t => 
      t.title.toLowerCase().includes(identifier.toLowerCase()) ||
      (t.artist && t.artist.toLowerCase().includes(identifier.toLowerCase()))
    );
    
    if (matches.length === 1) {
      return matches[^0];
    } else if (matches.length > 1) {
      console.log(chalk.yellow('\n⚠ Znaleziono wiele pasujących utworów:'));
      matches.forEach((t, i) => {
        console.log(chalk.white(`  ${i + 1}. ${t.artist} - ${t.title}`));
        console.log(chalk.gray(`     VideoId: ${t.videoId}`));
      });
      console.log(chalk.gray('\nUżyj dokładnego videoId lub checksum'));
      return null;
    }
    
    return null;
  }

  /**
   * Wyświetla informacje o utworze przed usunięciem
   * @private
   */
  _displayTrackInfo(track) {
    console.log(chalk.white('📀 Znaleziono utwór:\n'));
    console.log(chalk.white(`  Tytuł:         ${track.title}`));
    console.log(chalk.white(`  Artysta:       ${track.artist || 'Unknown'}`));
    console.log(chalk.white(`  VideoId:       ${track.videoId}`));
    console.log(chalk.white(`  Checksum:      ${track.checksum}`));
    console.log(chalk.white(`  Plik:          ${track.filename}`));
    console.log(chalk.white(`  Jakość:        ${track.audioQuality}kbps`));
    
    if (track.playlists && track.playlists.length > 0) {
      console.log(chalk.white(`  Playlisty:     ${track.playlists.join(', ')}`));
    }
    
    console.log('');
  }

  /**
   * Prosi użytkownika o potwierdzenie
   * @private
   */
  async _confirm(question) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    return new Promise((resolve) => {
      rl.question(chalk.yellow(`\n${question} (t/n): `), (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 't' || answer.toLowerCase() === 'y');
      });
    });
  }
}

module.exports = new RemoveCommand();
```


### Testy

#### Test 10.1: Wyszukiwanie po videoId

```javascript
// test/remove-command.test.js
const removeCommand = require('../src/commands/remove');

describe('Remove Command - Wyszukiwanie', () => {
  beforeEach(() => {
    database.addTrack('test123', {
      fingerprint: 'FP_TEST',
      checksum: 'abc123',
      filename: 'abc123.mp3',
      title: 'Test Song',
      artist: 'Test Artist',
      audioQuality: 192
    });
  });

  it('powinien znaleźć utwór po videoId', () => {
    const track = removeCommand._findTrack('test123');
    assert.ok(track);
    assert.equal(track.videoId, 'test123');
  });
});
```


#### Test 10.2: Wyszukiwanie po checksumie

```javascript
it('powinien znaleźć utwór po checksumie', () => {
  const track = removeCommand._findTrack('abc123');
  assert.ok(track);
  assert.equal(track.checksum, 'abc123');
});
```


#### Test 10.3: Wyszukiwanie po fragmencie tytułu

```javascript
it('powinien znaleźć utwór po fragmencie tytułu', () => {
  const track = removeCommand._findTrack('Test Song');
  assert.ok(track);
  assert.equal(track.title, 'Test Song');
});
```


#### Test 10.4: Usuwanie utworu z opcją --force

```javascript
it('powinien usunąć utwór bez potwierdzenia z --force', async () => {
  fs.writeFileSync('./music/abc123.mp3', 'test data');
  m3uGenerator.generateM3U('Test Playlist', [{
    title: 'Test Song',
    artist: 'Test Artist',
    duration: 180,
    filename: 'abc123.mp3'
  }]);
  
  await removeCommand.execute('test123', { force: true });
  
  // Sprawdź czy usunięto z bazy
  const track = database.findByVideoId('test123');
  assert.equal(track, null);
  
  // Sprawdź czy usunięto plik
  assert.ok(!fs.existsSync('./music/abc123.mp3'));
});
```


### Kryteria Akceptacji

- [ ] Wyszukuje utwory po videoId, checksumie i fragmencie tytułu
- [ ] Wyświetla informacje o znalezionym utworze przed usunięciem
- [ ] Wymaga potwierdzenia użytkownika (t/n) przed usunięciem
- [ ] Opcja `--force` pomija potwierdzenie
- [ ] Usuwa plik fizyczny z `/music`
- [ ] Aktualizuje wszystkie pliki M3U (usuwa referencje)
- [ ] Usuwa wpis z bazy danych
- [ ] Obsługuje przypadek wielu pasujących wyników (lista do wyboru)
- [ ] Wszystkie testy przechodzą

***

