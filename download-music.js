const fs = require('fs');
const https = require('https');
const path = require('path');

const musicDir = path.join(__dirname, 'public', 'music');

if (!fs.existsSync(musicDir)) {
  fs.mkdirSync(musicDir, { recursive: true });
}

const tracks = [
  { url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', filename: 'song-1.mp3' },
  { url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', filename: 'song-2.mp3' },
  { url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', filename: 'song-3.mp3' },
  { url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', filename: 'song-4.mp3' },
];

tracks.forEach(track => {
  const file = fs.createWriteStream(path.join(musicDir, track.filename));
  https.get(track.url, response => {
    response.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log(`Downloaded ${track.filename}`);
    });
  }).on('error', err => {
    fs.unlink(path.join(musicDir, track.filename), () => {});
    console.error(`Error downloading ${track.filename}:`, err.message);
  });
});
