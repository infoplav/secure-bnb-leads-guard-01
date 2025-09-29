// Audio recording utilities for call transcription

export class AudioRecorder {
  private stream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private onDataAvailable: ((audioData: Blob) => void) | null = null;

  constructor(onDataAvailable?: (audioData: Blob) => void) {
    this.onDataAvailable = onDataAvailable || null;
  }

  async start(): Promise<void> {
    try {
      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Create MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      this.audioChunks = [];

      // Handle data available
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
          if (this.onDataAvailable) {
            this.onDataAvailable(event.data);
          }
        }
      };

      // Start recording
      this.mediaRecorder.start(1000); // Collect data every 1 second
      console.log('Audio recording started');

    } catch (error) {
      console.error('Error starting audio recording:', error);
      throw error;
    }
  }

  async stop(): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        // Combine all chunks into final blob
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        
        // Clean up
        this.cleanup();
        
        console.log('Audio recording stopped, blob size:', audioBlob.size);
        resolve(audioBlob);
      };

      if (this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.stop();
      } else {
        resolve(null);
      }
    });
  }

  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
    this.audioChunks = [];
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }
}

// Convert audio blob to base64 for API transmission
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data:audio/webm;base64, prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Transcribe audio using Supabase edge function
export const transcribeAudio = async (
  audioBlob: Blob, 
  commercialId: string, 
  phoneNumber?: string,
  leadId?: string,
  callDuration?: number
): Promise<{ success: boolean; transcript_id?: string; text?: string; error?: string }> => {
  try {
    const base64Audio = await blobToBase64(audioBlob);
    
    const { supabase } = await import('@/integrations/supabase/client');
    
    const { data, error } = await supabase.functions.invoke('transcribe-call', {
      body: {
        audio: base64Audio,
        commercial_id: commercialId,
        phone_number: phoneNumber,
        lead_id: leadId,
        call_duration: callDuration
      }
    });

    if (error) {
      console.error('Transcription error:', error);
      return { success: false, error: error.message };
    }

    return data;
  } catch (error) {
    console.error('Error transcribing audio:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};