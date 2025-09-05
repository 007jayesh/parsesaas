interface ProcessingProgress {
  type: 'progress';
  stage: string;
  data: {
    stage_index?: number;
    progress?: number;
    pages_total?: number;
    current_page?: number;
    total_pages?: number;
    headers_detected?: number;
    transactions_found?: number;
    transactions_total?: number;
  };
}

interface DoclingOutput {
  type: 'docling_output';
  content: string;
  page?: number;
  timestamp: string;
}

interface ProcessingError {
  type: 'error';
  error: string;
}

interface ProcessingComplete {
  type: 'completion';
  result: {
    conversion_id: string;
    status: string;
    pages_processed: number;
    credits_used: number;
    processing_method: string;
    csv_data?: string;
    excel_data?: string;
    json_data?: any;
  };
}

type WebSocketMessage = ProcessingProgress | DoclingOutput | ProcessingError | ProcessingComplete;

interface WebSocketCallbacks {
  onProgress: (data: ProcessingProgress) => void;
  onDoclingOutput: (data: DoclingOutput) => void;
  onError: (error: string) => void;
  onComplete: (result: ProcessingComplete['result']) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export class ProcessingWebSocket {
  private ws: WebSocket | null = null;
  private sessionId: string;
  private callbacks: WebSocketCallbacks;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectDelay = 2000;

  constructor(callbacks: WebSocketCallbacks) {
    this.sessionId = this.generateSessionId();
    this.callbacks = callbacks;
  }

  private generateSessionId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//localhost:8000/ws/convert/${this.sessionId}`;
        
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          this.callbacks.onConnect?.();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          this.callbacks.onDisconnect?.();
          
          // Attempt to reconnect if not a normal closure
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            setTimeout(() => {
              this.reconnectAttempts++;
              console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
              this.connect();
            }, this.reconnectDelay);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

        // Connection timeout
        setTimeout(() => {
          if (this.ws?.readyState !== WebSocket.OPEN) {
            reject(new Error('WebSocket connection timeout'));
          }
        }, 10000);

      } catch (error) {
        reject(error);
      }
    });
  }

  private handleMessage(message: WebSocketMessage) {
    switch (message.type) {
      case 'progress':
        this.callbacks.onProgress(message);
        break;
      case 'docling_output':
        this.callbacks.onDoclingOutput(message);
        break;
      case 'error':
        this.callbacks.onError(message.error);
        break;
      case 'completion':
        this.callbacks.onComplete(message.result);
        break;
      default:
        console.log('Unknown message type:', message);
    }
  }

  async startProcessing(file: File, outputFormats: string[] = ['csv'], token: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    // Convert file to base64
    const fileBase64 = await this.fileToBase64(file);

    const request = {
      type: 'start_conversion',
      token: token,
      file_data: fileBase64,
      output_formats: outputFormats
    };

    this.ws.send(JSON.stringify(request));
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix (data:application/pdf;base64,)
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'User disconnected');
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export type { WebSocketCallbacks, ProcessingProgress, DoclingOutput, ProcessingError, ProcessingComplete };