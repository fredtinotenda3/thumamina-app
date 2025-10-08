// lib/websocket.ts
class RideWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(rideId: number, onStatusUpdate: (status: string) => void) {
    try {
      this.ws = new WebSocket(`ws://your-websocket-server/rides/${rideId}`);

      this.ws.onopen = () => {
        console.log("🚀 WebSocket connected for ride:", rideId);
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "status_update") {
          onStatusUpdate(data.status);
        }
      };

      this.ws.onclose = () => {
        console.log("WebSocket disconnected");
        this.attemptReconnect(rideId, onStatusUpdate);
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
    } catch (error) {
      console.error("Failed to connect WebSocket:", error);
    }
  }

  private attemptReconnect(
    rideId: number,
    onStatusUpdate: (status: string) => void
  ) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        this.connect(rideId, onStatusUpdate);
      }, 2000 * this.reconnectAttempts);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const rideWebSocket = new RideWebSocket();
