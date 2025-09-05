interface StreamingCallbacks {
  onProgress: (data: { stage: string; progress?: number; stage_index?: number; [key: string]: any }) => void;
  onDoclingOutput: (data: { content: string; page?: number; timestamp: string }) => void;
  onError: (error: string) => void;
  onComplete: (result: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export class StreamingProcessor {
  private eventSource: EventSource | null = null;
  private callbacks: StreamingCallbacks;

  constructor(callbacks: StreamingCallbacks) {
    this.callbacks = callbacks;
  }

  async startProcessing(file: File, outputFormats: string[] = ['csv']) {
    const token = localStorage.getItem('access_token');
    if (!token) {
      this.callbacks.onError('Authentication token not found');
      return;
    }

    try {
      // Create FormData for the streaming request
      const formData = new FormData();
      formData.append('file', file);
      formData.append('output_formats', outputFormats.join(','));

      // Start the streaming request
      const response = await fetch('http://localhost:8000/streaming/convert', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Read the streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      this.callbacks.onConnect?.();

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          this.callbacks.onDisconnect?.();
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        
        // Process complete lines
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.trim().startsWith('data: ')) {
            try {
              const jsonStr = line.trim().substring(6); // Remove 'data: '
              const data = JSON.parse(jsonStr);
              this.handleMessage(data);
            } catch (e) {
              console.error('Failed to parse SSE message:', e, line);
            }
          }
        }
      }

    } catch (error) {
      console.error('Streaming error:', error);
      this.callbacks.onError(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private handleMessage(message: any) {
    switch (message.type) {
      case 'progress':
        this.callbacks.onProgress({
          stage: message.stage,
          progress: message.progress,
          stage_index: message.stage_index,
          ...message
        });
        break;
      case 'docling_output':
        this.callbacks.onDoclingOutput({
          content: message.content,
          page: message.page,
          timestamp: message.timestamp
        });
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

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
}

export type { StreamingCallbacks };