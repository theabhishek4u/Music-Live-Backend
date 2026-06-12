import { Server as SocketIOServer, Socket } from 'socket.io';

export function setupSignaling(io: SocketIOServer) {
  io.on('connection', (socket: Socket) => {

    // Peer discovery
    socket.on('room:request-voice-peers', async (data: { roomId: string }) => {
      const sockets = await io.in(data.roomId).fetchSockets();
      // Filter out self, and only include sockets that might be in the room
      const peerSocketIds = sockets.map(s => s.id).filter(id => id !== socket.id);
      socket.emit('webrtc:voice-peers', { peerSocketIds });
    });

    // WebRTC signaling for voice chat
    socket.on('webrtc:offer', (data: { roomId: string; targetSocketId: string; offer: any }) => {
      const { targetSocketId, offer } = data;
      io.to(targetSocketId).emit('webrtc:offer', {
        fromSocketId: socket.id,
        offer,
      });
    });

    socket.on('webrtc:answer', (data: { roomId: string; targetSocketId: string; answer: any }) => {
      const { targetSocketId, answer } = data;
      io.to(targetSocketId).emit('webrtc:answer', {
        fromSocketId: socket.id,
        answer,
      });
    });

    socket.on('webrtc:ice-candidate', (data: { roomId: string; targetSocketId: string; candidate: any }) => {
      const { targetSocketId, candidate } = data;
      io.to(targetSocketId).emit('webrtc:ice-candidate', {
        fromSocketId: socket.id,
        candidate,
      });
    });

    socket.on('webrtc:leave', (data: { roomId: string }) => {
      socket.to(data.roomId).emit('webrtc:peer-left', {
        socketId: socket.id,
      });
    });
  });
}
