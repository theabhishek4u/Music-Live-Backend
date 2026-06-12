/**
 * Mock Redis Service using in-memory Maps.
 * In a real production environment, this would use ioredis to connect to a Redis cluster.
 */

interface RoomState {
  roomId: string;
  songId?: string;
  currentTime?: number;
  isPlaying?: boolean;
  timestamp?: number;
  hostId?: string;
}

class RedisServiceMock {
  private rooms: Map<string, RoomState> = new Map();
  private queues: Map<string, any[]> = new Map();
  private participants: Map<string, string[]> = new Map();

  // --- Room State ---
  async getRoomState(roomId: string): Promise<RoomState | null> {
    return this.rooms.get(roomId) || null;
  }

  async setRoomState(roomId: string, state: Partial<RoomState>): Promise<void> {
    const existing = this.rooms.get(roomId) || { roomId };
    this.rooms.set(roomId, { ...existing, ...state });
  }

  async deleteRoomState(roomId: string): Promise<void> {
    this.rooms.delete(roomId);
  }

  // --- Queue State ---
  async getQueue(roomId: string): Promise<any[]> {
    return this.queues.get(roomId) || [];
  }

  async setQueue(roomId: string, queue: any[]): Promise<void> {
    this.queues.set(roomId, queue);
  }

  async addToQueue(roomId: string, item: any): Promise<void> {
    const q = await this.getQueue(roomId);
    q.push(item);
    this.queues.set(roomId, q);
  }

  // --- Live Participants ---
  async addParticipant(roomId: string, userId: string): Promise<void> {
    const p = this.participants.get(roomId) || [];
    if (!p.includes(userId)) {
      p.push(userId);
      this.participants.set(roomId, p);
    }
  }

  async removeParticipant(roomId: string, userId: string): Promise<void> {
    const p = this.participants.get(roomId) || [];
    this.participants.set(roomId, p.filter((id) => id !== userId));
  }

  async getParticipants(roomId: string): Promise<string[]> {
    return this.participants.get(roomId) || [];
  }
}

export const redisService = new RedisServiceMock();
