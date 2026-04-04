import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;

  connect(userId: string): Socket {
    if (this.socket?.connected) return this.socket;

    this.socket = io('/', {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      console.log('🔌 Socket connected:', this.socket?.id);
      this.socket?.emit('user:online', userId);
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
    });

    this.socket.on('connect_error', (err) => {
      console.error('Socket error:', err.message);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  // ── Messaging ───────────────────────────────────────────────
  sendMessage(message: Record<string, unknown>) {
    this.socket?.emit('message:send', message);
  }

  onMessage(callback: (msg: Record<string, unknown>) => void) {
    this.socket?.on('message:receive', callback);
  }

  offMessage() {
    this.socket?.off('message:receive');
  }

  // ── Typing ──────────────────────────────────────────────────
  startTyping(senderId: string, receiverId: string) {
    this.socket?.emit('typing:start', { senderId, receiverId });
  }

  stopTyping(senderId: string, receiverId: string) {
    this.socket?.emit('typing:stop', { senderId, receiverId });
  }

  onTypingStart(callback: (data: { senderId: string }) => void) {
    this.socket?.on('typing:start', callback);
  }

  onTypingStop(callback: (data: { senderId: string }) => void) {
    this.socket?.on('typing:stop', callback);
  }

  offTyping() {
    this.socket?.off('typing:start');
    this.socket?.off('typing:stop');
  }

  // ── Read receipts ───────────────────────────────────────────
  emitRead(senderId: string, receiverId: string) {
    this.socket?.emit('message:read', { senderId, receiverId });
  }

  onRead(callback: (data: { receiverId: string }) => void) {
    this.socket?.on('message:read', callback);
  }

  // ── Online status ───────────────────────────────────────────
  onUserStatus(callback: (data: { userId: string; isOnline: boolean; lastSeen?: Date }) => void) {
    this.socket?.on('user:status', callback);
  }

  offUserStatus() {
    this.socket?.off('user:status');
  }

  // ── Friend notifications ────────────────────────────────────
  emitFriendRequest(to: string, request: Record<string, unknown>) {
    this.socket?.emit('friend:request', { to, request });
  }

  onFriendRequest(callback: (req: Record<string, unknown>) => void) {
    this.socket?.on('friend:request', callback);
  }

  emitFriendAccepted(to: string, friend: Record<string, unknown>) {
    this.socket?.emit('friend:accepted', { to, friend });
  }

  onFriendAccepted(callback: (friend: Record<string, unknown>) => void) {
    this.socket?.on('friend:accepted', callback);
  }

  // ── WebRTC Calls ─────────────────────────────────────────────
  initiateCall(data: {
    to: string;
    from: string;
    callType: 'voice' | 'video';
    offer: RTCSessionDescriptionInit;
    callerInfo: Record<string, unknown>;
  }) {
    this.socket?.emit('call:initiate', data);
  }

  answerCall(data: { to: string; from: string; answer: RTCSessionDescriptionInit }) {
    this.socket?.emit('call:answer', data);
  }

  rejectCall(data: { to: string; from: string }) {
    this.socket?.emit('call:reject', data);
  }

  endCall(to: string) {
    this.socket?.emit('call:end', { to });
  }

  sendIceCandidate(to: string, candidate: RTCIceCandidate) {
    this.socket?.emit('call:ice-candidate', { to, candidate });
  }

  onIncomingCall(callback: (data: {
    from: string;
    callType: 'voice' | 'video';
    offer: RTCSessionDescriptionInit;
    callerInfo: Record<string, unknown>;
  }) => void) {
    this.socket?.on('call:incoming', callback);
  }

  onCallAnswered(callback: (data: { from: string; answer: RTCSessionDescriptionInit }) => void) {
    this.socket?.on('call:answered', callback);
  }

  onCallRejected(callback: (data: { from: string }) => void) {
    this.socket?.on('call:rejected', callback);
  }

  onCallEnded(callback: () => void) {
    this.socket?.on('call:ended', callback);
  }

  onIceCandidate(callback: (data: { candidate: RTCIceCandidate }) => void) {
    this.socket?.on('call:ice-candidate', callback);
  }

  onCallUnavailable(callback: (data: { to: string }) => void) {
    this.socket?.on('call:unavailable', callback);
  }

  offCallEvents() {
    this.socket?.off('call:incoming');
    this.socket?.off('call:answered');
    this.socket?.off('call:rejected');
    this.socket?.off('call:ended');
    this.socket?.off('call:ice-candidate');
    this.socket?.off('call:unavailable');
  }
}

const socketService = new SocketService();
export default socketService;
