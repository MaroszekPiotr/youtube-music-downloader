# Struktura Projektu
```

youtube-music-downloader/
├── src/
│   ├── index.js              \# Entry point CLI
│   ├── fingerprinter.js      \# NOWE: Chromaprint fingerprinting
│   ├── sample-downloader.js  \# NOWE: Pobieranie fragmentów 60s
│   ├── downloader.js         \# Pobieranie pełnych plików
│   ├── deduplicator.js       \# Logika deduplikacji przez fingerprint
│   ├── database.js           \# CRUD dla tracks.json (+ fingerprints)
│   ├── quality-comparator.js \# Porównywanie jakości audio
│   ├── m3u-generator.js      \# Generator playlist M3U
│   └── metadata.js           \# Pobieranie info z YouTube
├── music/                    \# Pełne pliki MP3
├── playlists/                \# Pliki M3U (Navidrome)
├── temp/                     \# Fragmenty audio (60s) do fingerprinting
├── data/
│   └── tracks.json           \# Baza z fingerprintami
├── logs/
│   ├── duplicates.log
│   ├── replaced.log
│   └── app.log
├── config.json
└── playlists.json

```