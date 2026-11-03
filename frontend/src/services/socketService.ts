import { io, Socket } from 'socket.io-client';
import {
  CallRecord,
  CallStatusChangedEvent,
  CallRoutingUpdatedEvent,
  StaffAvailabilityChangedEvent,
  CallbackRequest,
} from '@call-screening/shared';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:5000';

class SocketService {
  private socket: Socket | null = null;
  private currentToken: string | null = null;

  /**
   * Connect to Socket.IO backend using the current in-memory JWT / session token
   */
  public connect(token: string): Socket {
    if (this.socket && this.currentToken === token && this.socket.connected) {
      return this.socket;
    }

    if (this.socket) {
      this.socket.disconnect();
    }

    this.currentToken = token;
    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    return this.socket;
  }

  /**
   * Disconnect the active socket connection
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.currentToken = null;
    }
  }

  /**
   * Subscribe to call created events
   */
  public onCallCreated(callback: (call: CallRecord) => void): () => void {
    if (!this.socket) return () => {};
    const handler = (data: { call: CallRecord }) => callback(data.call);
    this.socket.on('call:created', handler);
    return () => this.socket?.off('call:created', handler);
  }

  /**
   * Subscribe to call updated events
   */
  public onCallUpdated(callback: (call: CallRecord) => void): () => void {
    if (!this.socket) return () => {};
    const handler = (data: { call: CallRecord }) => callback(data.call);
    this.socket.on('call:updated', handler);
    return () => this.socket?.off('call:updated', handler);
  }

  /**
   * Subscribe to call status transitions
   */
  public onCallStatusChanged(callback: (event: CallStatusChangedEvent) => void): () => void {
    if (!this.socket) return () => {};
    this.socket.on('call:status_changed', callback);
    return () => this.socket?.off('call:status_changed', callback);
  }

  /**
   * Subscribe to intelligent routing updates
   */
  public onCallRoutingUpdated(callback: (event: CallRoutingUpdatedEvent) => void): () => void {
    if (!this.socket) return () => {};
    this.socket.on('call:routing_updated', callback);
    return () => this.socket?.off('call:routing_updated', callback);
  }

  /**
   * Subscribe to staff availability changes
   */
  public onStaffAvailabilityChanged(
    callback: (event: StaffAvailabilityChangedEvent) => void
  ): () => void {
    if (!this.socket) return () => {};
    this.socket.on('staff:availability_changed', callback);
    return () => this.socket?.off('staff:availability_changed', callback);
  }

  /**
   * Subscribe to new callback / voicemail queue items
   */
  public onCallbackCreated(callback: (callbackItem: CallbackRequest) => void): () => void {
    if (!this.socket) return () => {};
    const handler = (data: { callback: CallbackRequest }) => callback(data.callback);
    this.socket.on('callback:created', handler);
    return () => this.socket?.off('callback:created', handler);
  }

  public isConnected(): boolean {
    return !!this.socket?.connected;
  }
}

export const socketService = new SocketService();
