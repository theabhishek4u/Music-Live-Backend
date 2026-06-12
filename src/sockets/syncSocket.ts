import { Server as SocketIOServer, Socket } from 'socket.io';
import { redisService } from '../services/redisService';

interface SyncPayload {
  roomId: string;
  songId: string;
  currentTime: number;
  isPlaying: boolean;
  timestamp: number;
}

export function setupSyncSockets(io: SocketIOServer) {
  io.on('connection', (socket: Socket) => {

    // Play Music
    socket.on('music-play', async (data: Omit<SyncPayload, 'timestamp' | 'isPlaying'>) => {
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
      await redisService.setQueue(data.roomId, data.queue);
      socket.to(data.roomId).emit('queue-update', data.queue);
    });
  });
}
