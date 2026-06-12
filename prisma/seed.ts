import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultSongs = [
  {
    id: 'track_1',
    title: 'SoundHelix Song 1',
    artist: 'T. Schürger',
    duration: 372,
    coverImage: 'https://picsum.photos/seed/track1/300/300',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  },
  {
    id: 'track_2',
    title: 'SoundHelix Song 2',
    artist: 'T. Schürger',
    duration: 425,
    coverImage: 'https://picsum.photos/seed/track2/300/300',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  },
  {
    id: 'track_3',
    title: 'SoundHelix Song 3',
    artist: 'T. Schürger',
    duration: 344,
    coverImage: 'https://picsum.photos/seed/track3/300/300',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  },
  {
    id: 'track_4',
    title: 'SoundHelix Song 4',
    artist: 'T. Schürger',
    duration: 302,
    coverImage: 'https://picsum.photos/seed/track4/300/300',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
  },
  {
    id: 'track_5',
    title: 'SoundHelix Song 8',
    artist: 'T. Schürger',
    duration: 327,
    coverImage: 'https://picsum.photos/seed/track5/300/300',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
  },
  {
    id: 'track_6',
    title: 'Stay',
    artist: 'The Kid LAROI & Justin Bieber',
    duration: 141,
    coverImage: 'https://picsum.photos/seed/track6/300/300',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  },
  {
    id: 'track_7',
    title: 'Montero',
    artist: 'Lil Nas X',
    duration: 137,
    coverImage: 'https://picsum.photos/seed/track7/300/300',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  },
  {
    id: 'track_8',
    title: 'Kiss Me More',
    artist: 'Doja Cat ft. SZA',
    duration: 208,
    coverImage: 'https://picsum.photos/seed/track8/300/300',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  },
  {
    id: 'track_9',
    title: 'Good 4 U',
    artist: 'Olivia Rodrigo',
    duration: 178,
    coverImage: 'https://picsum.photos/seed/track9/300/300',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
  }
];

async function main() {
  console.log('🌱 Starting database seeding...');
  
  for (const song of defaultSongs) {
    const upserted = await prisma.song.upsert({
      where: { id: song.id },
      update: {
        title: song.title,
        artist: song.artist,
        duration: song.duration,
        coverImage: song.coverImage,
        audioUrl: song.audioUrl,
      },
      create: song,
    });
    console.log(`✅ Upserted song: ${upserted.title} by ${upserted.artist}`);
  }

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
