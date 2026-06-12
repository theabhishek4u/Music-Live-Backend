import { Server as SocketIOServer, Socket } from 'socket.io';
import { redisService } from '../services/redisService';
import { prisma } from '../utils/prisma';

export function setupRoomSockets(io: SocketIOServer) {
  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Join room
    socket.on('join-room', async (data: { roomId: string; userId: string; userName: string; userImage: string }) => {
      const { roomId, userId, userName, userImage } = data;

      socket.join(roomId);
      
      // Ensure the room exists in the database so that relation constraints (like WatchSession) succeed
      try {
        const roomExists = await prisma.room.findUnique({
          where: { id: roomId }
        });
        if (!roomExists) {
          const hostUser = await prisma.user.findFirst({
            where: {
              OR: [
                { id: userId },
                { email: userId }
              ]
            }
          });
          const actualHostId = hostUser ? hostUser.id : userId;
          
          let finalHostId = actualHostId;
          if (!hostUser) {
            const anyUser = await prisma.user.findFirst();
            if (anyUser) {
              finalHostId = anyUser.id;
            } else {
              const fallbackUser = await prisma.user.create({
                data: {
                  name: 'System User',
                  email: 'system@musiclive.com',
                  role: 'USER',
                  plan: 'FREE'
                }
              });
              finalHostId = fallbackUser.id;
            }
          }

          await prisma.room.create({
            data: {
              id: roomId,
              roomCode: roomId.replace('room-', '').substring(0, 8).toUpperCase(),
              hostId: finalHostId,
              roomName: userName ? `${userName}'s Party` : 'Watch Party',
              roomType: 'private',
              isActive: true,
            }
          });
          console.log(`🏠 Auto-created Room record in DB for room ID: ${roomId} with Host: ${finalHostId}`);
        }
      } catch (err) {
        console.error('Error auto-creating Room record:', err);
      }
      
      // Store socket to userId mapping for disconnects
      (socket as any).userId = userId;
      (socket as any).roomId = roomId;
      (socket as any).userName = userName;
      (socket as any).userImage = userImage;

      await redisService.addParticipant(roomId, userId);

      // Notify all room members
      socket.to(roomId).emit('user-joined', { userId, userName, userImage });

      console.log(`👤 ${userName} joined room ${roomId}`);

      // Send the current list of members to the joined user
      const sockets = await io.in(roomId).fetchSockets();
      const members = sockets.map(s => ({
        userId: (s as any).userId,
        userName: (s as any).userName,
        userImage: (s as any).userImage,
        isMuted: false,
        isHost: false,
        isSpeaking: false
      })).filter(m => m.userId);
      
      socket.emit('room:members', members);
    });

    // Leave room
    socket.on('leave-room', async (data: { roomId: string; userId: string }) => {
      const { roomId, userId } = data;

      socket.leave(roomId);
      await redisService.removeParticipant(roomId, userId);
      socket.to(roomId).emit('user-left', { userId });
      
      // Auto Cleanup if room is empty (simplified for MVP)
      const participants = await redisService.getParticipants(roomId);
      if (participants.length === 0) {
        // In full scale, this would be a 5-minute delayed job
        await redisService.deleteRoomState(roomId);
        await prisma.room.update({
          where: { id: roomId },
          data: { isActive: false }
        }).catch(() => {});
      }
    });

    // Speaking Animation Trigger
    socket.on('speaking', (data: { roomId: string; userId: string; isSpeaking: boolean }) => {
      const { roomId, userId, isSpeaking } = data;
      socket.to(roomId).emit('speaking', { userId, isSpeaking });
    });

    // Real-time Chat Messages
    socket.on('chat:message', (data: { roomId: string; message: any }) => {
      io.to(data.roomId).emit('chat:message', data.message);
    });

    // Real-time Typing Indicator
    socket.on('chat:typing', (data: { roomId: string; userId: string; userName: string; isTyping: boolean }) => {
      socket.to(data.roomId).emit('chat:typing', data);
    });

    // Disconnect handler
    socket.on('disconnect', async () => {
      const userId = (socket as any).userId;
      const roomId = (socket as any).roomId;
      
      if (userId && roomId) {
        await redisService.removeParticipant(roomId, userId);
        io.to(roomId).emit('user-left', { userId });
        
        const participants = await redisService.getParticipants(roomId);
        if (participants.length === 0) {
          await redisService.deleteRoomState(roomId);
          await prisma.room.update({
            where: { id: roomId },
            data: { isActive: false }
          }).catch(() => {});
        }
      }
      console.log(`❌ Client disconnected: ${socket.id}`);
    });
  });
}
