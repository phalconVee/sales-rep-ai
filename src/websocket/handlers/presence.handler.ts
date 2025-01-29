import { Server, Socket } from 'socket.io';
import { logger } from '../../utils/logger';
import { ChatEvents, PresenceEvent, PresenceStatus } from '../events/types';

const userPresence = new Map<string, PresenceEvent>();

export function handlePresenceEvents(io: Server, socket: Socket): void {
  const userId = socket.handshake.auth.userId;

  const updatePresence = (status: PresenceStatus) => {
    const presenceData: PresenceEvent = {
      userId,
      status,
      lastSeen: status === PresenceStatus.OFFLINE ? new Date() : undefined
    };
    userPresence.set(userId, presenceData);
    socket.broadcast.emit(ChatEvents.PRESENCE, presenceData);
  };

  socket.on('connect', () => {
    updatePresence(PresenceStatus.ONLINE);
    logger.info(`User ${userId} connected`);
  });

  socket.on(ChatEvents.PRESENCE, (status: PresenceStatus) => {
    updatePresence(status);
  });

  socket.on('disconnect', () => {
    updatePresence(PresenceStatus.OFFLINE);
    logger.info(`User ${userId} disconnected`);
  });

  socket.on('error', (error: Error) => {
    logger.error(`WebSocket error for user ${userId}:`, error);
  });
}

export function getOnlineUsers(): PresenceEvent[] {
  return Array.from(userPresence.values()).filter(
    presence => presence.status !== PresenceStatus.OFFLINE
  );
}