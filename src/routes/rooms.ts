import { Router } from 'express';
import { createRoom, joinRoom, leaveRoom, getRoomDetails } from '../controllers/roomController';

export const roomRouter = Router();

roomRouter.post('/create', createRoom);
roomRouter.post('/join', joinRoom);
roomRouter.post('/leave', leaveRoom);
roomRouter.get('/:id', getRoomDetails);
