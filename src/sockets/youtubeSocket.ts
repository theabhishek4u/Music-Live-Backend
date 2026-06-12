import { Server as SocketIOServer, Socket } from 'socket.io';
import { prisma } from '../utils/prisma';

interface VideoStatePayload {
  roomId: string;
  videoId: string;
  currentTime: number;
  isPlaying: boolean;
  allowGuestControl: boolean;
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
    console.error('Error checking control permission:', err);
    return false;
  }
}

export function setupYoutubeSockets(io: SocketIOServer) {
  io.on('connection', (socket: Socket) => {

    // 1. Video Change
    socket.on('video-change', async (data: { roomId: string; videoId: string }) => {
      const { roomId, videoId } = data;
      const now = new Date();

      try {
        const hasPermission = await checkControlPermission(roomId, socket);
        if (!hasPermission) {
          console.warn(`Unauthorized video-change by socket ${socket.id} in room ${roomId}`);
          return;
        }

        const session = await prisma.watchSession.upsert({
          where: { roomId },
          update: {
            videoId,
            currentTime: 0,
            isPlaying: true,
            updatedAt: now,
          },
          create: {
            roomId,
            videoId,
            currentTime: 0,
            isPlaying: true,
            allowGuestControl: false,
            updatedAt: now,
          },
        });

        const payload: VideoStatePayload = {
          roomId,
          videoId: session.videoId,
          currentTime: 0,
          isPlaying: true,
          allowGuestControl: session.allowGuestControl,
          timestamp: Date.now(),
        };

        // Broadcast to everyone else
        socket.to(roomId).emit('video-state-update', payload);
        console.log(`📹 Video changed in room ${roomId} to ${videoId}`);
      } catch (err) {
        console.error('Error in video-change socket handler:', err);
      }
    });

    // 2. Video Play
    socket.on('video-play', async (data: { roomId: string; videoId: string; currentTime: number }) => {
      const { roomId, videoId, currentTime } = data;
      const now = new Date();

      try {
        const hasPermission = await checkControlPermission(roomId, socket);
        if (!hasPermission) {
          console.warn(`Unauthorized video-play by socket ${socket.id} in room ${roomId}`);
          return;
        }

        const session = await prisma.watchSession.upsert({
          where: { roomId },
          update: {
            videoId,
            currentTime,
            isPlaying: true,
            updatedAt: now,
          },
          create: {
            roomId,
            videoId,
            currentTime,
            isPlaying: true,
            allowGuestControl: false,
            updatedAt: now,
          },
        });

        const payload: VideoStatePayload = {
          roomId,
          videoId: session.videoId,
          currentTime: session.currentTime,
          isPlaying: true,
          allowGuestControl: session.allowGuestControl,
          timestamp: Date.now(),
        };

        socket.to(roomId).emit('video-state-update', payload);
      } catch (err) {
        console.error('Error in video-play socket handler:', err);
      }
    });

    // 3. Video Pause
    socket.on('video-pause', async (data: { roomId: string; videoId: string; currentTime: number }) => {
      const { roomId, videoId, currentTime } = data;
      const now = new Date();

      try {
        const hasPermission = await checkControlPermission(roomId, socket);
        if (!hasPermission) {
          console.warn(`Unauthorized video-pause by socket ${socket.id} in room ${roomId}`);
          return;
        }

        const session = await prisma.watchSession.upsert({
          where: { roomId },
          update: {
            videoId,
            currentTime,
            isPlaying: false,
            updatedAt: now,
          },
          create: {
            roomId,
            videoId,
            currentTime,
            isPlaying: false,
            allowGuestControl: false,
            updatedAt: now,
          },
        });

        const payload: VideoStatePayload = {
          roomId,
          videoId: session.videoId,
          currentTime: session.currentTime,
          isPlaying: false,
          allowGuestControl: session.allowGuestControl,
          timestamp: Date.now(),
        };

        socket.to(roomId).emit('video-state-update', payload);
      } catch (err) {
        console.error('Error in video-pause socket handler:', err);
      }
    });

    // 4. Video Seek
    socket.on('video-seek', async (data: { roomId: string; videoId: string; currentTime: number }) => {
      const { roomId, videoId, currentTime } = data;
      const now = new Date();

      try {
        const hasPermission = await checkControlPermission(roomId, socket);
        if (!hasPermission) {
          console.warn(`Unauthorized video-seek by socket ${socket.id} in room ${roomId}`);
          return;
        }

        const session = await prisma.watchSession.upsert({
          where: { roomId },
          update: {
            videoId,
            currentTime,
            updatedAt: now,
          },
          create: {
            roomId,
            videoId,
            currentTime,
            isPlaying: false,
            allowGuestControl: false,
            updatedAt: now,
          },
        });

        const payload: VideoStatePayload = {
          roomId,
          videoId: session.videoId,
          currentTime: session.currentTime,
          isPlaying: session.isPlaying,
          allowGuestControl: session.allowGuestControl,
          timestamp: Date.now(),
        };

        socket.to(roomId).emit('video-state-update', payload);
      } catch (err) {
        console.error('Error in video-seek socket handler:', err);
      }
    });

    // 5. Video Sync Request (for new/reconnecting users)
    socket.on('video-sync', async (data: { roomId: string }) => {
      const { roomId } = data;

      try {
        const session = await prisma.watchSession.findUnique({
          where: { roomId },
        });

        if (session) {
          let actualTime = session.currentTime;
          if (session.isPlaying) {
            // Calculate progress since last update
            const elapsed = (Date.now() - new Date(session.updatedAt).getTime()) / 1000;
            actualTime += elapsed;
          }

          const payload: VideoStatePayload = {
            roomId,
            videoId: session.videoId,
            currentTime: actualTime,
            isPlaying: session.isPlaying,
            allowGuestControl: session.allowGuestControl,
            timestamp: Date.now(),
          };

          socket.emit('video-state-update', payload);
        }
      } catch (err) {
        console.error('Error in video-sync socket handler:', err);
      }
    });

    // 6. Toggle Guest Control (Host-only event)
    socket.on('video-toggle-control', async (data: { roomId: string; allowGuestControl: boolean }) => {
      const { roomId, allowGuestControl } = data;
      const now = new Date();

      try {
        const room = await prisma.room.findUnique({
          where: { id: roomId },
          select: { hostId: true }
        });
        const isHost = room && room.hostId === (socket as any).userId;
        if (!isHost) {
          console.warn(`Unauthorized video-toggle-control attempt by user ${(socket as any).userId} in room ${roomId}`);
          return;
        }

        const session = await prisma.watchSession.upsert({
          where: { roomId },
          update: {
            allowGuestControl,
            updatedAt: now,
          },
          create: {
            roomId,
            videoId: '',
            currentTime: 0,
            isPlaying: false,
            allowGuestControl,
            updatedAt: now,
          },
        });

        const payload: VideoStatePayload = {
          roomId,
          videoId: session.videoId,
          currentTime: session.currentTime,
          isPlaying: session.isPlaying,
          allowGuestControl: session.allowGuestControl,
          timestamp: Date.now(),
        };

        // Broadcast to everyone in the room (including host to keep local state synced)
        io.to(roomId).emit('video-state-update', payload);
        console.log(`📹 Guest control toggled to ${allowGuestControl} in room ${roomId}`);
      } catch (err) {
        console.error('Error in video-toggle-control socket handler:', err);
      }
    });
  });
}
