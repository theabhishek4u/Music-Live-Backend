import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { redisService } from '../services/redisService';

export const createRoom = async (req: Request, res: Response) => {
  try {
    const { roomName, type, hostId } = req.body;
    
    if (!hostId) {
      return res.status(400).json({ error: 'hostId is required' });
    }

    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const room = await prisma.room.create({
      data: {
        roomName,
        roomType: type || 'private',
        roomCode,
        hostId,
      },
    });

    // Initialize Redis state
    await redisService.setRoomState(room.id, {
      roomId: room.id,
      hostId: room.hostId,
      isPlaying: false,
    });

    res.status(201).json({ room });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const joinRoom = async (req: Request, res: Response) => {
  try {
    const { roomCode, userId } = req.body;

    const room = await prisma.room.findUnique({
      where: { roomCode },
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Add participant to DB (upsert to handle reconnects cleanly)
    await prisma.roomParticipant.upsert({
      where: {
        roomId_userId: { roomId: room.id, userId }
      },
      update: { isMuted: true },
      create: {
        roomId: room.id,
        userId,
        isMuted: true
      }
    });

    // Add to Redis participants
    await redisService.addParticipant(room.id, userId);

    res.json({ room });
  } catch (error) {
    console.error('Join room error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const leaveRoom = async (req: Request, res: Response) => {
  try {
    const { roomId, userId } = req.body;

    await prisma.roomParticipant.deleteMany({
      where: { roomId, userId }
    });

    await redisService.removeParticipant(roomId, userId);

    res.json({ success: true });
  } catch (error) {
    console.error('Leave room error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getRoomDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const room = await prisma.room.findUnique({
      where: { id: id as string },
      include: {
        host: true,
        participants: {
          include: { user: true }
        },
        queue: {
          include: { song: true },
          orderBy: { orderNumber: 'asc' }
        }
      }
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const state = await redisService.getRoomState(room.id);

    res.json({ room, state });
  } catch (error) {
    console.error('Get room details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
