import { Server as SocketIOServer, Socket } from 'socket.io';
import { redisService } from '../services/redisService';
import { prisma } from '../utils/prisma';

interface SyncPayload {
  roomId: string;
  songId: string;
  currentTime: number;
  isPlaying: boolean;
  timestamp: number;
}

// Utility function to verify if user has control permissions (is host OR guest control is enabled)
async function checkControlPermission(roomId: string, socket: Socket): Promise<boolean> {
  try {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { hostId: true }
    });
    if (!room) return false;

    // Host always has permission
    if (room.hostId === (socket as any).userId) return true;

    // Guests have permission only if allowGuestControl is enabled
    const session = await prisma.watchSession.findUnique({
      where: { roomId }
    });
    return !!(session && session.allowGuestControl);
  } catch (err) {
    console.error('Error checking control permission in syncSocket:', err);
    return false;
  }
}

export function setupSyncSockets(io: SocketIOServer) {
  io.on('connection', (socket: Socket) => {

    // Play Music
    socket.on('music-play', async (data: Omit<SyncPayload, 'timestamp' | 'isPlaying'>) => {
      const hasPermission = await checkControlPermission(data.roomId, socket);
      if (!hasPermission) {
        console.warn(`Unauthorized music-play attempt by socket ${socket.id} in room ${data.roomId}`);
        return;
      }

      const payload: SyncPayload = {
        ...data,
        isPlaying: true,
        timestamp: Date.now(),
      };
      
      await redisService.setRoomState(data.roomId, {
        songId: data.songId,
        currentTime: data.currentTime,
        isPlaying: true,
        timestamp: payload.timestamp,
      });

      socket.to(data.roomId).emit('music-state-update', payload);
    });

    // Pause Music
    socket.on('music-pause', async (data: Omit<SyncPayload, 'timestamp' | 'isPlaying'>) => {
      const hasPermission = await checkControlPermission(data.roomId, socket);
      if (!hasPermission) {
        console.warn(`Unauthorized music-pause attempt by socket ${socket.id} in room ${data.roomId}`);
        return;
      }

      const payload: SyncPayload = {
        ...data,
        isPlaying: false,
        timestamp: Date.now(),
      };
      
      await redisService.setRoomState(data.roomId, {
        songId: data.songId,
        currentTime: data.currentTime,
        isPlaying: false,
        timestamp: payload.timestamp,
      });

      socket.to(data.roomId).emit('music-state-update', payload);
    });

    // Sync Seek (Drift Correction & Manual Seek)
    socket.on('seek-update', async (data: Omit<SyncPayload, 'timestamp' | 'isPlaying'>) => {
      const hasPermission = await checkControlPermission(data.roomId, socket);
      if (!hasPermission) {
        // We do not log warning for seek-update since it is also emitted as heartbeat
        return;
      }

      const state = await redisService.getRoomState(data.roomId);
      if (state) {
        const payload: SyncPayload = {
          roomId: data.roomId,
          songId: data.songId,
          currentTime: data.currentTime,
          isPlaying: state.isPlaying || false,
          timestamp: Date.now(),
        };

        await redisService.setRoomState(data.roomId, {
          currentTime: data.currentTime,
          timestamp: payload.timestamp,
        });

        socket.to(data.roomId).emit('music-state-update', payload);
      }
    });

    // Change Song
    socket.on('change-song', async (data: Omit<SyncPayload, 'timestamp' | 'isPlaying' | 'currentTime'>) => {
      const hasPermission = await checkControlPermission(data.roomId, socket);
      if (!hasPermission) {
        console.warn(`Unauthorized change-song attempt by socket ${socket.id} in room ${data.roomId}`);
        return;
      }

      const payload: SyncPayload = {
        ...data,
        currentTime: 0,
        isPlaying: true,
        timestamp: Date.now(),
      };
      
      await redisService.setRoomState(data.roomId, {
        songId: data.songId,
        currentTime: 0,
        isPlaying: true,
        timestamp: payload.timestamp,
      });

      socket.to(data.roomId).emit('music-state-update', payload);
    });

    // Request State (For new joins to get latest state & drift correct)
    socket.on('sync:request-state', async (data: { roomId: string }) => {
      const state = await redisService.getRoomState(data.roomId);
      if (state && state.songId) {
        const payload: SyncPayload = {
          roomId: data.roomId,
          songId: state.songId,
          currentTime: state.currentTime || 0,
          isPlaying: state.isPlaying || false,
          timestamp: state.timestamp || Date.now(),
        };
        socket.emit('music-state-update', payload);
      }
    });

    // Queue updates
    socket.on('queue-update', async (data: { roomId: string, queue: any[] }) => {
      const hasPermission = await checkControlPermission(data.roomId, socket);
      if (!hasPermission) return;

      await redisService.setQueue(data.roomId, data.queue);
      socket.to(data.roomId).emit('queue-update', data.queue);
    });
  });
}
