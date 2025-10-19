## Zadanie 11: CLI - Komendy Pomocnicze (src/commands/*)

### Opis

Zestaw pomocniczych komend CLI do zarządzania biblioteką: wyświetlanie listy utworów (list), statystyki biblioteki (stats), czyszczenie osieroconych plików (cleanup) oraz walidacja integralności (validate).

### Zakres Pracy

#### Komenda `list` (src/commands/list.js)

- Wyświetla wszystkie utwory w formie tabelarycznej

```
- Opcje filtrowania: `--playlist <name>`, `--artist <name>`
```

- Opcje sortowania: `--sort-by quality|title|artist|date`
- Paginacja wyników dla dużych bibliotek
- Kolorowe wyróżnienie jakości audio


#### Komenda `stats` (src/commands/stats.js)

- Całkowita liczba utworów
- Całkowity rozmiar biblioteki (w GB/MB)
- Średnia jakość audio (kbps)
- Liczba playlist
- Top 5 playlist (najwięcej utworów)
- Top 5 artystów (najwięcej utworów)
- Rozkład jakości audio (histogram)


#### Komenda `cleanup` (src/commands/cleanup.js)

- Znajduje pliki MP3 w `/music` nieobecne w bazie danych
- Znajduje wpisy w bazie bez fizycznych plików
- Usuwa osierocone referencje z playlist M3U
- Opcja `--dry-run` do podglądu bez usuwania
- Raport o zwolnionym miejscu na dysku


#### Komenda `validate` (src/commands/validate.js)

- Sprawdza czy wszystkie pliki w bazie istnieją na dysku
- Sprawdza czy wszystkie fingerprints są unikalne
- Waliduje strukturę wszystkich plików M3U
- Sprawdza czy checksumы są poprawne
- Wykrywa uszkodzone pliki MP3
- Szczegółowy raport z listą problemów


### Implementacja - Komenda List

```javascript
// src/commands/list.js
const database = require('../database');
const chalk = require('chalk');
const Table = require('cli-table3');

class ListCommand {
  /**
   * Wyświetla listę utworów
   * @param {Object} options - {playlist, artist, sortBy, limit}
   */
  execute(options = {}) {
    console.log(chalk.cyan.bold('\n📚 Twoja Biblioteka Muzyczna\n'));
    
    let tracks = database.getAllTracks();
    
    // Filtrowanie
    if (options.playlist) {
      tracks = tracks.filter(t => 
        t.playlists && t.playlists.includes(options.playlist)
      );
      console.log(chalk.gray(`Filtr: Playlista "${options.playlist}"\n`));
    }
    
    if (options.artist) {
      tracks = tracks.filter(t => 
        t.artist && t.artist.toLowerCase().includes(options.artist.toLowerCase())
      );
      console.log(chalk.gray(`Filtr: Artysta "${options.artist}"\n`));
    }
    
    if (tracks.length === 0) {
      console.log(chalk.yellow('⚠ Brak utworów pasujących do filtrów'));
      return;
    }
    
    // Sortowanie
    if (options.sortBy) {
      tracks = this._sortTracks(tracks, options.sortBy);
    }
    
    // Limit
    const limit = options.limit || tracks.length;
    const displayTracks = tracks.slice(0, limit);
    
    // Tabela
    const table = new Table({
      head: [
        chalk.cyan('Tytuł'),
        chalk.cyan('Artysta'),
        chalk.cyan('Jakość'),
        chalk.cyan('Playlisty')
      ],
      colWidths: [40, 30, 12, 30],
      wordWrap: true
    });
    
    displayTracks.forEach(track => {
      table.push([
        this._truncate(track.title, 38),
        this._truncate(track.artist || 'Unknown', 28),
        this._formatQuality(track.audioQuality),
        track.playlists ? track.playlists.length.toString() : '0'
      ]);
    });
    
    console.log(table.toString());
    
    // Podsumowanie
    console.log(chalk.white(`\nŁącznie: ${tracks.length} utworów`));
    if (limit < tracks.length) {
      console.log(chalk.gray(`Pokazano ${limit} z ${tracks.length}`));
    }
    
    // Statystyki
    const totalSize = this._calculateTotalSize(tracks);
    const avgQuality = this._calculateAverageQuality(tracks);
    console.log(chalk.white(`Rozmiar: ${this._formatSize(totalSize)}`));
    console.log(chalk.white(`Średnia jakość: ${avgQuality}kbps\n`));
  }

  /**
   * Sortuje utwory
   * @private
   */
  _sortTracks(tracks, sortBy) {
    switch (sortBy) {
      case 'quality':
        return tracks.sort((a, b) => (b.audioQuality || 0) - (a.audioQuality || 0));
      case 'title':
        return tracks.sort((a, b) => a.title.localeCompare(b.title));
      case 'artist':
        return tracks.sort((a, b) => (a.artist || '').localeCompare(b.artist || ''));
      case 'date':
        return tracks.sort((a, b) => 
          new Date(b.addedAt || 0) - new Date(a.addedAt || 0)
        );
      default:
        return tracks;
    }
  }

  /**
   * Formatuje jakość audio z kolorem
   * @private
   */
  _formatQuality(quality) {
    const q = quality || 0;
    if (q >= 256) return chalk.green(`${q}kbps`);
    if (q >= 192) return chalk.yellow(`${q}kbps`);
    return chalk.red(`${q}kbps`);
  }

  _truncate(str, maxLen) {
    return str.length > maxLen ? str.substring(0, maxLen - 3) + '...' : str;
  }

  _calculateTotalSize(tracks) {
    const fs = require('fs');
    return tracks.reduce((sum, track) => {
      const filepath = `./music/${track.filename}`;
      if (fs.existsSync(filepath)) {
        return sum + fs.statSync(filepath).size;
      }
      return sum;
    }, 0);
  }

  _calculateAverageQuality(tracks) {
    const total = tracks.reduce((sum, t) => sum + (t.audioQuality || 0), 0);
    return Math.round(total / tracks.length);
  }

  _formatSize(bytes) {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}

module.exports = new ListCommand();
```


### Implementacja - Komenda Stats

```javascript
// src/commands/stats.js
const database = require('../database');
const m3uGenerator = require('../m3u-generator');
const fs = require('fs');
const chalk = require('chalk');

class StatsCommand {
  execute() {
    console.log(chalk.cyan.bold('\n📊 Statystyki Biblioteki\n'));
    
    const tracks = database.getAllTracks();
    const playlists = m3uGenerator.getAllPlaylists();
    
    // Podstawowe statystyki
    console.log(chalk.white(`Utwory:           ${tracks.length}`));
    console.log(chalk.white(`Playlisty:        ${playlists.length}`));
    
    // Rozmiar biblioteki
    const totalSize = this._calculateTotalSize(tracks);
    console.log(chalk.white(`Całkowity rozmiar: ${this._formatSize(totalSize)}`));
    
    // Średnia jakość
    const avgQuality = this._calculateAverageQuality(tracks);
    console.log(chalk.white(`Średnia jakość:   ${avgQuality}kbps`));
    
    // Średni czas trwania
    const avgDuration = this._calculateAverageDuration(tracks);
    console.log(chalk.white(`Średni czas:      ${this._formatDuration(avgDuration)}`));
    
    // Ostatnia synchronizacja
    const lastSync = this._getLastSyncDate(tracks);
    if (lastSync) {
      console.log(chalk.white(`Ostatnia sync:    ${lastSync}`));
    }
    
    // Top playlisty
    console.log(chalk.cyan.bold('\n🎵 Top 5 Playlist:\n'));
    const topPlaylists = this._getTopPlaylists(tracks);
    topPlaylists.slice(0, 5).forEach((p, i) => {
      console.log(chalk.white(`  ${i + 1}. ${p.name} (${p.count} utworów)`));
    });
    
    // Top artyści
    console.log(chalk.cyan.bold('\n🎤 Top 5 Artystów:\n'));
    const topArtists = this._getTopArtists(tracks);
    topArtists.slice(0, 5).forEach((a, i) => {
      console.log(chalk.white(`  ${i + 1}. ${a.name} (${a.count} utworów)`));
    });
    
    // Rozkład jakości
    console.log(chalk.cyan.bold('\n📈 Rozkład Jakości Audio:\n'));
    const qualityDistribution = this._getQualityDistribution(tracks);
    Object.entries(qualityDistribution).forEach(([range, count]) => {
      const bar = '█'.repeat(Math.ceil(count / tracks.length * 50));
      console.log(chalk.white(`  ${range}: ${bar} ${count}`));
    });
    
    console.log('');
  }

  _calculateTotalSize(tracks) {
    return tracks.reduce((sum, track) => {
      const filepath = `./music/${track.filename}`;
      if (fs.existsSync(filepath)) {
        return sum + fs.statSync(filepath).size;
      }
      return sum;
    }, 0);
  }

  _calculateAverageQuality(tracks) {
    const total = tracks.reduce((sum, t) => sum + (t.audioQuality || 0), 0);
    return Math.round(total / tracks.length);
  }

  _calculateAverageDuration(tracks) {
    const total = tracks.reduce((sum, t) => sum + (t.duration || 0), 0);
    return Math.round(total / tracks.length);
  }

  _getLastSyncDate(tracks) {
    const dates = tracks
      .map(t => t.addedAt)
      .filter(d => d)
      .sort()
      .reverse();
    
    if (dates.length > 0) {
      return new Date(dates[^0]).toLocaleString('pl-PL');
    }
    return null;
  }

  _getTopPlaylists(tracks) {
    const playlistCounts = {};
    
    tracks.forEach(track => {
      if (track.playlists) {
        track.playlists.forEach(playlist => {
          playlistCounts[playlist] = (playlistCounts[playlist] || 0) + 1;
        });
      }
    });
    
    return Object.entries(playlistCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  _getTopArtists(tracks) {
    const artistCounts = {};
    
    tracks.forEach(track => {
      const artist = track.artist || 'Unknown';
      artistCounts[artist] = (artistCounts[artist] || 0) + 1;
    });
    
    return Object.entries(artistCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  _getQualityDistribution(tracks) {
    const distribution = {
      '<128kbps': 0,
      '128-191kbps': 0,
      '192-255kbps': 0,
      '256-319kbps': 0,
      '320kbps+': 0
    };
    
    tracks.forEach(track => {
      const q = track.audioQuality || 0;
      if (q < 128) distribution['<128kbps']++;
      else if (q < 192) distribution['128-191kbps']++;
      else if (q < 256) distribution['192-255kbps']++;
      else if (q < 320) distribution['256-319kbps']++;
      else distribution['320kbps+']++;
    });
    
    return distribution;
  }

  _formatSize(bytes) {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  _formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  }
}

module.exports = new StatsCommand();
```


### Implementacja - Komenda Cleanup

```javascript
// src/commands/cleanup.js
const database = require('../database');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const logger = require('../logger');

class CleanupCommand {
  /**
   * Czyści osierocone pliki
   * @param {Object} options - {dryRun: boolean}
   */
  execute(options = {}) {
    console.log(chalk.cyan.bold('\n🧹 Czyszczenie Biblioteki\n'));
    
    const results = {
      orphanedFiles: [],
      orphanedDbEntries: [],
      freedSpace: 0
    };
    
    // 1. Znajdź pliki bez wpisu w bazie
    console.log(chalk.gray('🔍 Szukam osieroconych plików...'));
    results.orphanedFiles = this._findOrphanedFiles();
    
    if (results.orphanedFiles.length > 0) {
      console.log(chalk.yellow(`\n⚠ Znaleziono ${results.orphanedFiles.length} osierocone pliki:\n`));
      results.orphanedFiles.forEach(file => {
        const filepath = path.join('./music', file);
        const size = fs.statSync(filepath).size;
        results.freedSpace += size;
        console.log(chalk.white(`  • ${file} (${this._formatSize(size)})`));
      });
      
      if (!options.dryRun) {
        results.orphanedFiles.forEach(file => {
          fs.unlinkSync(path.join('./music', file));
        });
        console.log(chalk.green(`\n✓ Usunięto ${results.orphanedFiles.length} plików`));
      }
    } else {
      console.log(chalk.green('✓ Brak osieroconych plików'));
    }
    
    // 2. Znajdź wpisy w bazie bez plików
    console.log(chalk.gray('\n🔍 Szukam wpisów bez plików...'));
    results.orphanedDbEntries = this._findOrphanedDbEntries();
    
    if (results.orphanedDbEntries.length > 0) {
      console.log(chalk.yellow(`\n⚠ Znaleziono ${results.orphanedDbEntries.length} wpisów bez plików:\n`));
      results.orphanedDbEntries.forEach(track => {
        console.log(chalk.white(`  • ${track.title} (${track.videoId})`));
      });
      
      if (!options.dryRun) {
        results.orphanedDbEntries.forEach(track => {
          database.removeTrack(track.videoId);
        });
        console.log(chalk.green(`\n✓ Usunięto ${results.orphanedDbEntries.length} wpisów`));
      }
    } else {
      console.log(chalk.green('✓ Brak osieroconych wpisów'));
    }
    
    // Podsumowanie
    if (options.dryRun) {
      console.log(chalk.cyan.bold('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
      console.log(chalk.yellow.bold('⚠ Tryb podglądu (--dry-run)'));
      console.log(chalk.white('Nic nie zostało usunięte'));
      console.log(chalk.white(`Możliwe do zwolnienia: ${this._formatSize(results.freedSpace)}`));
      console.log(chalk.cyan.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
    } else if (results.orphanedFiles.length > 0 || results.orphanedDbEntries.length > 0) {
      console.log(chalk.cyan.bold('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
      console.log(chalk.green.bold('✓ Czyszczenie zakończone'));
      console.log(chalk.white(`Zwolniono: ${this._formatSize(results.freedSpace)}`));
      console.log(chalk.cyan.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
    } else {
      console.log(chalk.green('\n✓ Biblioteka jest czysta!\n'));
    }
    
    logger.info(`Cleanup: ${results.orphanedFiles.length} plików, ${results.orphanedDbEntries.length} wpisów`);
  }

  /**
   * Znajduje pliki MP3 bez wpisu w bazie
   * @private
   */
  _findOrphanedFiles() {
    const musicFiles = fs.readdirSync('./music').filter(f => f.endsWith('.mp3'));
    const dbTracks = database.getAllTracks();
    const dbFilenames = new Set(dbTracks.map(t => t.filename));
    
    return musicFiles.filter(file => !dbFilenames.has(file));
  }

  /**
   * Znajduje wpisy w bazie bez fizycznych plików
   * @private
   */
  _findOrphanedDbEntries() {
    const tracks = database.getAllTracks();
    
    return tracks.filter(track => {
      const filepath = path.join('./music', track.filename);
      return !fs.existsSync(filepath);
    });
  }

  _formatSize(bytes) {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}

module.exports = new CleanupCommand();
```


### Implementacja - Komenda Validate

```javascript
// src/commands/validate.js
const database = require('../database');
const m3uGenerator = require('../m3u-generator');
const fs = require('fs');
const chalk = require('chalk');

class ValidateCommand {
  execute() {
    console.log(chalk.cyan.bold('\n🔍 Walidacja Biblioteki\n'));
    
    const issues = {
      missingFiles: [],
      duplicateFingerprints: [],
      invalidM3U: [],
      corruptedFiles: [],
      invalidChecksums: []
    };
    
    // 1. Sprawdź pliki
    console.log(chalk.gray('🔍 Sprawdzam pliki...'));
    issues.missingFiles = this._validateFiles();
    
    if (issues.missingFiles.length > 0) {
      console.log(chalk.red(`  ✗ Brakujące pliki: ${issues.missingFiles.length}`));
    } else {
      console.log(chalk.green('  ✓ Wszystkie pliki istnieją'));
    }
    
    // 2. Sprawdź fingerprints
    console.log(chalk.gray('🔍 Sprawdzam fingerprints...'));
    issues.duplicateFingerprints = this._validateFingerprints();
    
    if (issues.duplicateFingerprints.length > 0) {
      console.log(chalk.red(`  ✗ Duplikaty fingerprints: ${issues.duplicateFingerprints.length}`));
    } else {
      console.log(chalk.green('  ✓ Fingerprints są unikalne'));
    }
    
    // 3. Sprawdź playlisty M3U
    console.log(chalk.gray('🔍 Sprawdzam playlisty M3U...'));
    issues.invalidM3U = this._validateM3U();
    
    if (issues.invalidM3U.length > 0) {
      console.log(chalk.red(`  ✗ Niepoprawne playlisty: ${issues.invalidM3U.length}`));
    } else {
      console.log(chalk.green('  ✓ Playlisty M3U są poprawne'));
    }
    
    // Raport końcowy
    const totalIssues = Object.values(issues).reduce((sum, arr) => sum + arr.length, 0);
    
    console.log(chalk.cyan.bold('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    
    if (totalIssues === 0) {
      console.log(chalk.green.bold('✓ Biblioteka jest w pełni prawidłowa!'));
    } else {
      console.log(chalk.yellow.bold(`⚠ Znaleziono ${totalIssues} problemów:`));
      
      if (issues.missingFiles.length > 0) {
        console.log(chalk.white('\nBrakujące pliki:'));
        issues.missingFiles.forEach(t => {
          console.log(chalk.red(`  • ${t.title} (${t.filename})`));
        });
      }
      
      if (issues.duplicateFingerprints.length > 0) {
        console.log(chalk.white('\nDuplikaty fingerprints:'));
        issues.duplicateFingerprints.forEach(dup => {
          console.log(chalk.red(`  • ${dup.fp}: ${dup.tracks.join(', ')}`));
        });
      }
      
      if (issues.invalidM3U.length > 0) {
        console.log(chalk.white('\nNiepoprawne playlisty:'));
        issues.invalidM3U.forEach(p => {
          console.log(chalk.red(`  • ${p}`));
        });
      }
    }
    
    console.log(chalk.cyan.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
  }

  _validateFiles() {
    const tracks = database.getAllTracks();
    return tracks.filter(track => {
      const filepath = `./music/${track.filename}`;
      return !fs.existsSync(filepath);
    });
  }

  _validateFingerprints() {
    const tracks = database.getAllTracks();
    const fpMap = {};
    
    tracks.forEach(track => {
      if (track.fingerprint) {
        if (!fpMap[track.fingerprint]) {
          fpMap[track.fingerprint] = [];
        }
        fpMap[track.fingerprint].push(track.title);
      }
    });
    
    return Object.entries(fpMap)
      .filter(([fp, tracks]) => tracks.length > 1)
      .map(([fp, tracks]) => ({ fp, tracks }));
  }

  _validateM3U() {
    const playlists = m3uGenerator.getAllPlaylists();
    const invalid = [];
    
    playlists.forEach(playlist => {
      const filepath = `./playlists/${playlist}`;
      const content = fs.readFileSync(filepath, 'utf-8');
      
      if (!content.startsWith('#EXTM3U')) {
        invalid.push(playlist);
      }
    });
    
    return invalid;
  }
}

module.exports = new ValidateCommand();
```


### Testy

#### Test 11.1: List - Filtrowanie po playliście

```javascript
// test/list-command.test.js
describe('List Command', () => {
  it('powinien filtrować utwory po playliście', () => {
    database.addTrack('vid1', {
      fingerprint: 'FP1',
      checksum: 'abc',
      filename: 'abc.mp3',
      title: 'Song 1',
      artist: 'Artist',
      playlists: ['Playlist A']
    });
    
    database.addTrack('vid2', {
      fingerprint: 'FP2',
      checksum: 'def',
      filename: 'def.mp3',
      title: 'Song 2',
      artist: 'Artist',
      playlists: ['Playlist B']
    });
    
    const output = listCommand.execute({ playlist: 'Playlist A' });
    // Sprawdź że output zawiera tylko Song 1
  });
});
```


#### Test 11.2: Stats - Obliczanie rozkładu jakości

```javascript
// test/stats-command.test.js
it('powinien obliczyć rozkład jakości audio', () => {
  const tracks = [
    { audioQuality: 128 },
    { audioQuality: 192 },
    { audioQuality: 320 }
  ];
  
  const distribution = statsCommand._getQualityDistribution(tracks);
  
  assert.equal(distribution['128-191kbps'], 1);
  assert.equal(distribution['192-255kbps'], 1);
  assert.equal(distribution['320kbps+'], 1);
});
```


#### Test 11.3: Cleanup - Znajdowanie osieroconych plików

```javascript
// test/cleanup-command.test.js
it('powinien znaleźć osierocone pliki', () => {
  // Utwórz plik bez wpisu w bazie
  fs.writeFileSync('./music/orphaned.mp3', 'test');
  
  const orphaned = cleanupCommand._findOrphanedFiles();
  
  assert.ok(orphaned.includes('orphaned.mp3'));
});
```


#### Test 11.4: Validate - Wykrywanie duplikatów fingerprints

```javascript
// test/validate-command.test.js
it('powinien wykryć duplikaty fingerprints', () => {
  database.addTrack('vid1', {
    fingerprint: 'SAME_FP',
    checksum: 'abc',
    filename: 'abc.mp3',
    title: 'Song 1',
    artist: 'Artist'
  });
  
  database.addTrack('vid2', {
    fingerprint: 'SAME_FP',
    checksum: 'def',
    filename: 'def.mp3',
    title: 'Song 2',
    artist: 'Artist'
  });
  
  const duplicates = validateCommand._validateFingerprints();
  assert.equal(duplicates.length, 1);
});
```


### Kryteria Akceptacji

#### List Command

- [ ] Wyświetla utwory w formie tabelarycznej z cli-table3
- [ ] Filtrowanie po playliście i artyście działa
- [ ] Sortowanie po quality/title/artist/date działa
- [ ] Jakość audio jest kolorowana (zielony ≥256, żółty ≥192, czerwony <192)
- [ ] Pokazuje podsumowanie: liczba utworów, rozmiar, średnia jakość


#### Stats Command

- [ ] Pokazuje wszystkie podstawowe statystyki (utwory, playlisty, rozmiar)
- [ ] Top 5 playlist i artystów jest poprawnie obliczane
- [ ] Rozkład jakości audio wyświetla histogram ASCII
- [ ] Data ostatniej synchronizacji jest formatowana


#### Cleanup Command

- [ ] Opcja --dry-run pokazuje podgląd bez usuwania
- [ ] Znajduje pliki MP3 bez wpisu w bazie danych
- [ ] Znajduje wpisy w bazie bez fizycznych plików
- [ ] Raport pokazuje zwolnione miejsce na dysku


#### Validate Command

- [ ] Sprawdza istnienie wszystkich plików z bazy
- [ ] Wykrywa duplikaty fingerprints
- [ ] Waliduje strukturę plików M3U (header \#EXTM3U)
- [ ] Szczegółowy raport listuje wszystkie problemy

***

