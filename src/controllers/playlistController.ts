import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';

export const createPlaylist = async (req: Request, res: Response) => {
  try {
    const { name, userId } = req.body;
    const playlist = await prisma.playlist.create({
      data: { name, userId }
    });
    res.status(201).json({ playlist });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const addSongToPlaylist = async (req: Request, res: Response) => {
  try {
    const { playlistId, songId } = req.body;
    const playlistSong = await prisma.playlistSong.create({
      data: { playlistId, songId }
    });
    res.status(201).json({ playlistSong });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deletePlaylist = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.playlist.delete({
      where: { id }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
