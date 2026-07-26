type EventHandler = (data: any) => void;

class SignalWebSocket {
  private ws: WebSocket | null = null;
  private token: string | null = null;
  private listeners: Map<string, Set<EventHandler>> = new Map();
  private reconnectInterval: number = 3000;
  private shouldReconnect: boolean = true;

  public connect(token: string) {
    if (this.token === token && this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.token = token;
    this.shouldReconnect = true;

    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
    }

    let baseUrl = process.env.NEXT_PUBLIC_WS_BASE_URL || (typeof window !== 'undefined' ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}` : 'ws://127.0.0.1:8000');
    baseUrl = baseUrl.replace(/\/+$/, '');
    if (baseUrl.startsWith('http://')) baseUrl = baseUrl.replace('http://', 'ws://');
    if (baseUrl.startsWith('https://')) baseUrl = baseUrl.replace('https://', 'wss://');
    const wsUrl = `${baseUrl}/ws?token=${token}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('[WebSocket] Connected to Signal server');
      this.emit('connection_status', { connected: true });
    };

    this.ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type) {
          this.emit(payload.type, payload);
        }
        this.emit('*', payload);
      } catch (err) {
        console.error('[WebSocket] Failed to parse message', err);
      }
    };

    this.ws.onclose = () => {
      console.log('[WebSocket] Disconnected');
      this.emit('connection_status', { connected: false });
      if (this.shouldReconnect) {
        setTimeout(() => {
          if (this.token && this.shouldReconnect) {
            this.connect(this.token);
          }
        }, this.reconnectInterval);
      }
    };

    this.ws.onerror = (err) => {
      console.warn('[WebSocket] Connection state change:', err);
    };
  }

  public disconnect() {
    this.shouldReconnect = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  public send(data: object) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  public sendTyping(conversationId: string, isTyping: boolean) {
    this.send({
      type: 'typing',
      conversation_id: conversationId,
      is_typing: isTyping,
    });
  }

  public on(event: string, handler: EventHandler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  public off(event: string, handler: EventHandler) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.delete(handler);
    }
  }

  private emit(event: string, data: any) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach((handler) => handler(data));
    }
  }
}

export const wsClient = new SignalWebSocket();
