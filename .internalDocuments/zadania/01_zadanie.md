## Zadanie 1: Setup Projektu i Instalacja Zależności

### Opis

Utworzenie struktury projektu Node.js z wszystkimi wymaganymi folderami, plikami konfiguracyjnymi i zależnościami. Implementacja skryptu weryfikującego obecność Chromaprint w systemie oraz automatycznej instalacji FFmpeg.

### Zakres Pracy

- Inicjalizacja `package.json` z metadanymi projektu
- Instalacja pakietów: `ytdlp-nodejs`, `commander`, `fpcalc`, `chalk` (kolorowy output)
- Utworzenie struktury folderów: `/src`, `/music`, `/playlists`, `/data`, `/logs`, `/temp`
- Skrypt weryfikacji `fpcalc --version`
- Automatyczna instalacja FFmpeg przez `ytDlp.downloadFFmpeg()`
- Plik `.gitignore` z wykluczeniami: `/music`, `/temp`, `/logs`, `/data`, `node_modules`


### Implementacja

```javascript
// setup.js
const fs = require('fs');
const { exec } = require('child_process');
const ytDlp = require('ytdlp-nodejs');

async function verifyChromaprint() {
  return new Promise((resolve, reject) => {
    exec('fpcalc --version', (error, stdout) => {
      if (error) {
        reject('Chromaprint nie jest zainstalowany');
      }
      const version = stdout.match(/(\d+\.\d+\.\d+)/);
      if (version && parseFloat(version[^1]) >= 1.4) {
        resolve(version[^1]);
      } else {
        reject('Wymagana wersja Chromaprint >= 1.4.3');
      }
    });
  });
}

async function setupProject() {
  const folders = ['music', 'playlists', 'data', 'logs', 'temp', 'src'];
  folders.forEach(folder => {
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }
  });
  
  await ytDlp.downloadFFmpeg();
  const chromaprintVersion = await verifyChromaprint();
  console.log(`✓ Chromaprint ${chromaprintVersion} zainstalowany`);
}
```


### Testy

#### Test 1.1: Weryfikacja struktury folderów

```javascript
// test/setup.test.js
const fs = require('fs');
const assert = require('assert');

describe('Setup - Struktura folderów', () => {
  it('powinien utworzyć wszystkie wymagane foldery', () => {
    const folders = ['music', 'playlists', 'data', 'logs', 'temp', 'src'];
    folders.forEach(folder => {
      assert.ok(fs.existsSync(folder), `Folder ${folder} nie istnieje`);
    });
  });
});
```


#### Test 1.2: Weryfikacja Chromaprint

```javascript
it('powinien wykryć zainstalowany Chromaprint >= 1.4.3', async () => {
  const version = await verifyChromaprint();
  assert.ok(parseFloat(version) >= 1.4, 'Zbyt stara wersja Chromaprint');
});
```


#### Test 1.3: Weryfikacja package.json

```javascript
it('powinien zawierać wszystkie wymagane zależności', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json'));
  assert.ok(pkg.dependencies['ytdlp-nodejs']);
  assert.ok(pkg.dependencies['commander']);
  assert.ok(pkg.dependencies['fpcalc']);
});
```


### Kryteria Akceptacji

- [ ] Wszystkie 6 folderów zostało utworzonych
- [ ] `package.json` zawiera wszystkie wymagane zależności
- [ ] Chromaprint >= 1.4.3 jest wykrywany poprawnie
- [ ] FFmpeg jest automatycznie instalowany
- [ ] `.gitignore` wyklucza foldery z dużymi plikami
- [ ] Skrypt setup wyświetla komunikat o sukcesie z wersjami narzędzi
- [ ] Wszystkie testy przechodzą

***

