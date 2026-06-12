import { Router } from 'express';

const router = Router();

// Mock music data for MVP UI development
const mockTracks = [
  {
    id: 'track_1',
    title: 'SoundHelix Song 1',
    artist: 'T. Schürger',
    album: 'SoundHelix',
    duration: 372, // ~6:12
    thumbnail: 'https://picsum.photos/seed/track1/300/300',
    audioUrl: 'http://localhost:3001/music/song-1.mp3',
  },
  {
    id: 'track_2',
    title: 'SoundHelix Song 2',
    artist: 'T. Schürger',
    album: 'SoundHelix',
    duration: 425, // ~7:05
    thumbnail: 'https://picsum.photos/seed/track2/300/300',
    audioUrl: 'http://localhost:3001/music/song-2.mp3',
  },
  {
    id: 'track_3',
    title: 'SoundHelix Song 3',
    artist: 'T. Schürger',
    album: 'SoundHelix',
    duration: 344, // ~5:44
    thumbnail: 'https://picsum.photos/seed/track3/300/300',
    audioUrl: 'http://localhost:3001/music/song-3.mp3',
  },
  {
    id: 'track_4',
    title: 'SoundHelix Song 4',
    artist: 'T. Schürger',
    album: 'SoundHelix',
    duration: 302, // ~5:02
    thumbnail: 'https://picsum.photos/seed/track4/300/300',
    audioUrl: 'http://localhost:3001/music/song-4.mp3',
  },
  {
    id: 'track_5',
    title: 'Stay',
    artist: 'The Kid LAROI & Justin Bieber',
    album: 'F*CK LOVE 3',
    duration: 141,
    thumbnail: 'https://picsum.photos/seed/track5/300/300',
    audioUrl: 'http://localhost:3001/music/song-1.mp3', // Fallback
  },
  {
    id: 'track_6',
    title: 'Montero',
    artist: 'Lil Nas X',
    album: 'Montero',
    duration: 137,
    thumbnail: 'https://picsum.photos/seed/track6/300/300',
  },
  {
    id: 'track_7',
    title: 'Kiss Me More',
    artist: 'Doja Cat ft. SZA',
    album: 'Planet Her',
    duration: 208,
    thumbnail: 'https://picsum.photos/seed/track7/300/300',
  },
  {
    id: 'track_8',
    title: 'Good 4 U',
    artist: 'Olivia Rodrigo',
    album: 'SOUR',
    duration: 178,
    thumbnail: 'https://picsum.photos/seed/track8/300/300',
  },
];

// Search music
router.get('/search', (req, res) => {
  const query = (req.query.q as string || '').toLowerCase();
  if (!query) {
    return res.json({ tracks: [] });
  }
  const results = mockTracks.filter(
    t =>
      t.title.toLowerCase().includes(query) ||
      t.artist.toLowerCase().includes(query) ||
      t.album.toLowerCase().includes(query)
  );
  res.json({ tracks: results });
});

// Get trending/popular tracks
router.get('/trending', (_req, res) => {
  res.json({ tracks: mockTracks });
});

// Get track by ID
router.get('/track/:id', (req, res) => {
  const track = mockTracks.find(t => t.id === req.params.id);
  if (!track) {
    return res.status(404).json({ error: 'Track not found' });
  }
  res.json(track);
});

export { router as musicRouter };
