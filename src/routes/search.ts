import { Router, Request, Response } from 'express';
import { prisma } from '../utils/prisma';

export const searchRouter = Router();

searchRouter.get('/', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    if (!query) {
      return res.json({ songs: [], playlists: [], artists: [] });
    }

    const songs = await prisma.song.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { artist: { contains: query, mode: 'insensitive' } }
        ]
      },
      take: 20
    });

    const playlists = await prisma.playlist.findMany({
      where: { name: { contains: query, mode: 'insensitive' } },
      take: 10
    });

    res.json({ songs, playlists });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
