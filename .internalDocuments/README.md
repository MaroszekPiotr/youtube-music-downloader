
# README.md dla YouTube Music Downloader

```markdown
# YouTube Music Downloader 🎵

Zaawansowana aplikacja Node.js CLI do pobierania muzyki z playlist YouTube z inteligentną deduplikacją opartą na audio fingerprinting (Chromaprint/AcoustID).

## ✨ Funkcje

- **🎯 Audio Fingerprinting** - Używa Chromaprint do wykrywania duplikatów na poziomie faktycznej zawartości audio, nie tytułów
- **🎼 Najwyższa Jakość** - Automatyczne pobieranie audio w najwyższej dostępnej jakości (VBR 320kbps)
- **🔄 Inteligentna Deduplikacja** - Automatycznie wykrywa i pomija reuploady tego samego nagrania
- **🎭 Rozróżnianie Wersji** - Automatycznie rozpoznaje że cover/remix/acoustic/live to osobne utwory
- **📋 Kompatybilność z Navidrome** - Generuje playlisty M3U w formacie zgodnym z Navidrome
- **📊 Zarządzanie Jakością** - Przy duplikacie zachowuje wersję z lepszą jakością audio
- **📝 Szczegółowe Logowanie** - Pełne logi wszystkich operacji, duplikatów i zastąpień

## 🎯 Jak to działa?

Aplikacja wykorzystuje **Chromaprint** - profesjonalną bibliotekę audio fingerprinting (tę samą technologię co Shazam). Chromaprint analizuje spektrogram audio, wykrywa lokalne maksima (peaks) w czasie i częstotliwości, a następnie tworzy unikalny hash - "odcisk palca" nagrania.

**Przykład:**
- "Rick Astley - Never Gonna Give You Up" (videoId: ABC123) → fingerprint: `AQAAf0mUaEk...`
- "Rick Astley Never Gonna Give You Up Reupload" (videoId: XYZ789) → fingerprint: `AQAAf0mUaEk...` (identyczny!)
- "Rick Astley - Never Gonna Give You Up (Live)" → fingerprint: `BQBBg1nVbFm...` (inny!)

## 📋 Wymagania

### System
- **Node.js** >= 16.x
- **FFmpeg** (instalowany automatycznie przez aplikację)
- **Chromaprint** >= 1.4.3

### Instalacja Chromaprint

#### Linux/WSL (Ubuntu/Debian)
```

sudo apt-get update
sudo apt-get install libchromaprint-tools

```

#### macOS
```

brew install chromaprint

```

#### Weryfikacja
```

fpcalc --version

# Powinno wyświetlić: fpcalc version 1.5.1

```

## 🚀 Instalacja

### 1. Sklonuj repozytorium
```

git clone https://github.com/yourusername/youtube-music-downloader.git
cd youtube-music-downloader

```

### 2. Zainstaluj zależności
```

npm install

```

### 3. Struktura folderów zostanie utworzona automatycznie
```

youtube-music-downloader/
├── music/              \# Pobrane pliki MP3
├── playlists/          \# Playlisty M3U (Navidrome)
├── temp/               \# Tymczasowe fragmenty audio
├── data/               \# Baza danych tracks.json
└── logs/               \# Logi aplikacji

```

## ⚙️ Konfiguracja

### Plik `playlists.json`
Stwórz plik z linkami do playlist YouTube:

```

[
"https://www.youtube.com/playlist?list=PLxxxxxxxxxxxxxxxxx",
"https://www.youtube.com/playlist?list=PLyyyyyyyyyyyyyyyyy",
"https://www.youtube.com/playlist?list=PLzzzzzzzzzzzzzzzzz"
]

```

### Plik `config.json` (opcjonalny)
```

{
"musicDir": "./music",
"playlistsDir": "./playlists",
"dataDir": "./data",
"logsDir": "./logs",
"tempDir": "./temp",
"fingerprintLength": 60,
"audioQuality": 0
}

```

## 💻 Użycie

### Synchronizacja playlist
Pobiera wszystkie utwory z playlist i deduplikuje przez audio fingerprinting:

```

node app.js sync playlists.json

```

**Proces:**
1. Pobiera metadane z każdej playlisty (videoId, tytuł, jakość audio)
2. Dla każdego utworu:
   - Sprawdza czy videoId już istnieje w bazie → pomiń
   - Jeśli nie: pobiera 60s fragment do `/temp`
   - Generuje fingerprint audio przez Chromaprint
   - Sprawdza czy identyczny fingerprint istnieje w bazie
   - **Jeśli duplikat:**
     - Porównuje jakość audio (bitrate)
     - Zachowuje lepszą wersję, usuwa gorszą
   - **Jeśli nie duplikat:** pobiera pełny plik MP3
3. Generuje/aktualizuje pliki M3U

**Przykładowy output:**
```

🎵 Synchronizacja playlisty: "Moja Ulubiona Muzyka"
📊 Znaleziono 50 utworów

✓ Pobrano: Rick Astley - Never Gonna Give You Up (192kbps)
⊘ Duplikat: Rick Astley - Never Gonna Give You Up [Reupload] (fingerprint match, 128kbps < 192kbps)
✓ Pobrano: Daft Punk - Get Lucky (320kbps)
⚠ Zastąpiono: Rick Astley - Never Gonna Give You Up (192kbps → 320kbps)

📈 Podsumowanie:

- Nowe utwory: 42
- Pominięte duplikaty: 6
- Zastąpione lepszą jakością: 2
- Całkowity czas: 15m 32s

```

### Lista wszystkich utworów
```

node app.js list

```

**Output:**
```

📚 Twoja biblioteka muzyczna

╔════════════════════════════════════════════════════════════════╗
║ Tytuł                          │ Jakość │ Playlisty            ║
╠════════════════════════════════════════════════════════════════╣
║ Rick Astley - Never Gonna...   │ 320kbps│ Playlist 1, Best Hits║
║ Daft Punk - Get Lucky          │ 192kbps│ Playlist 1           ║
║ Queen - Bohemian Rhapsody      │ 256kbps│ Best Hits, Rock      ║
╚════════════════════════════════════════════════════════════════╝

Łącznie: 142 utwory │ 1.2 GB │ Średnia jakość: 245kbps

```

### Usuwanie utworu
Usuwa plik z dysku i wszystkich playlist:

```


# Po checksumie

node app.js remove a3f5e2b1c4d8

# Po videoId

node app.js remove dQw4w9WgXcQ

# Po tytule (częściowe dopasowanie)

node app.js remove "Never Gonna Give"

```

### Statystyki
```

node app.js stats

```

**Output:**
```

📊 Statystyki biblioteki

Utwory: 142
Playlisty: 5
Całkowity rozmiar: 1.2 GB
Średnia jakość: 245 kbps
Średni czas trwania: 3m 42s
Ostatnia synchronizacja: 2025-10-17 18:30:00

Top 3 playlisty:

1. Moja Ulubiona Muzyka (67 utworów)
2. Best Hits (45 utworów)
3. Rock Classics (30 utworów)
```

### Czyszczenie
Usuwa pliki, które nie występują na żadnej playliście:

```

node app.js cleanup

```

### Walidacja
Sprawdza integralność bazy danych i plików:

```

node app.js validate

```

**Sprawdza:**
- Czy wszystkie pliki w bazie danych istnieją na dysku
- Czy wszystkie pliki M3U są poprawne
- Czy referencje w playlistach są poprawne
- Czy checksumы są unikalne

## 📁 Struktura Projektu

```

youtube-music-downloader/
├── src/
│   ├── index.js              \# Entry point CLI (Commander)
│   ├── fingerprinter.js      \# Chromaprint fingerprinting
│   ├── sample-downloader.js  \# Pobieranie 60s fragmentów
│   ├── downloader.js         \# Pobieranie pełnych plików
│   ├── deduplicator.js       \# Logika deduplikacji
│   ├── database.js           \# CRUD dla tracks.json
│   ├── quality-comparator.js \# Porównywanie jakości
│   ├── m3u-generator.js      \# Generator playlist M3U
│   ├── metadata.js           \# Metadane z YouTube
│   └── logger.js             \# System logowania
├── music/                    \# Pliki MP3
├── playlists/                \# Playlisty M3U
├── temp/                     \# Fragmenty audio (automatycznie czyszczone)
├── data/
│   └── tracks.json           \# Baza danych
├── logs/
│   ├── app.log               \# Główny log
│   ├── duplicates.log        \# Log duplikatów
│   └── replaced.log          \# Log zastąpień
├── config.json               \# Konfiguracja
├── playlists.json            \# Linki do playlist YouTube
├── package.json
└── README.md

```

## 🗄️ Baza Danych (tracks.json)

```

{
"dQw4w9WgXcQ": {
"fingerprint": "AQAAf0mUaEkSRYnGL0mSI_wW_sfl6EdO5Yf-...",
"checksum": "a3f5e2b1c4d8",
"filename": "a3f5e2b1c4d8.mp3",
"title": "Rick Astley - Never Gonna Give You Up",
"artist": "Rick Astley",
"audioQuality": 320,
"duration": 213,
"downloadedAt": "2025-10-17T18:30:00Z",
"playlists": [
"Moja Ulubiona Muzyka",
"Best Hits 80s"
]
}
}

```

## 📋 Format Playlist M3U (Navidrome)

```

\#EXTM3U
\#EXTINF:213,Rick Astley - Never Gonna Give You Up
../music/a3f5e2b1c4d8.mp3
\#EXTINF:367,Daft Punk - Get Lucky
../music/b4g6f3c2e5a9.mp3

```

## 📊 Logi

### `logs/duplicates.log`
```

[2025-10-17 18:30:15] DUPLICATE_FOUND
Title: "Rick Astley - Never Gonna Give You Up (Reupload)"
VideoId: XYZ123
Fingerprint: AQAAf0mUaEk... (matches ABC456)
Audio Quality: 128kbps
Existing: "Rick Astley - Never Gonna Give You Up" (ABC456, 192kbps)
Action: SKIPPED (lower quality)

```

### `logs/replaced.log`
```

[2025-10-17 18:35:42] QUALITY_UPGRADE
Title: "Rick Astley - Never Gonna Give You Up"
Old VideoId: ABC456 (192kbps)
New VideoId: DEF789 (320kbps)
Fingerprint: AQAAf0mUaEk... (identical)
Action: REPLACED
Updated Playlists: ["Playlist 1", "Best Hits"]

```

## ❓ FAQ

### Czy cover i remix są traktowane jako duplikaty?
**Nie!** Chromaprint analizuje faktyczną zawartość audio. Cover przez innego artystę lub remix mają inny spektrogram audio, więc otrzymają inny fingerprint. Zostaną pobrane jako osobne utwory.

### Co jeśli zmienię tytuł filmu na YouTube?
Aplikacja używa **videoId** jako klucza głównego. Tytuł jest tylko metadaną. Jeśli videoId jest już w bazie, zostanie pominięty niezależnie od tytułu.

### Jak długo trwa synchronizacja?
Dla każdego nowego utworu aplikacja musi pobrać 60s fragment (około 1MB) do analizy fingerprint. Dla playlisty 50 utworów (25 nowych):
- Pobieranie fragmentów: ~2-3 minuty
- Generowanie fingerprintów: ~30 sekund
- Pobieranie pełnych plików: ~10 minut
- **Łącznie:** ~13-15 minut

### Czy mogę używać z Navidrome?
**Tak!** Playlisty są generowane w formacie M3U zgodnym z Navidrome. Wystarczy wskazać Navidrome na foldery `/music` i `/playlists`.

### Co się dzieje z plikami w /temp?
Fragmenty audio w `/temp` są automatycznie usuwane po wygenerowaniu fingerprint. Folder jest czyszczony po każdym `sync`.

## 🐛 Troubleshooting

### `Error: fpcalc not found`
Nie zainstalowałeś Chromaprint. Zobacz sekcję "Instalacja Chromaprint".

### `Error: FFmpeg not found`
Uruchom aplikację raz - automatycznie zainstaluje FFmpeg przez `ytdlp-nodejs`.

### Duplikaty nie są wykrywane
1. Sprawdź czy fingerprint jest zapisywany w `data/tracks.json`
2. Sprawdź logi w `logs/duplicates.log`
3. Upewnij się że Chromaprint >= 1.4.3

### Niska jakość audio pomimo ustawienia quality: 0
YouTube nie zawsze oferuje audio w najwyższej jakości. Sprawdź `audioQuality` w `tracks.json` - to rzeczywista jakość dostępna dla tego video.

## 🤝 Wkład

Pull requesty są mile widziane! Dla większych zmian, najpierw otwórz issue aby przedyskutować co chciałbyś zmienić.

## 📝 Licencja

[MIT](LICENSE)

## 🙏 Podziękowania

- **yt-dlp** - potężne narzędzie do pobierania z YouTube
- **Chromaprint/AcoustID** - audio fingerprinting
- **Navidrome** - open-source music server
- **Commander.js** - framework CLI

## 📧 Kontakt

Problemy i pytania: [GitHub Issues](https://github.com/yourusername/youtube-music-downloader/issues)

---

Zbudowane z ❤️ dla miłośników muzyki