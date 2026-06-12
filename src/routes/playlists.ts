import { Router } from 'express';
import { createPlaylist, addSongToPlaylist, deletePlaylist } from '../controllers/playlistController';

export const playlistRouter = Router();

playlistRouter.post('/', createPlaylist);
playlistRouter.post('/song', addSongToPlaylist);
playlistRouter.delete('/:id', deletePlaylist);
