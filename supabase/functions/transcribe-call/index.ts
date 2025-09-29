import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Process base64 in chunks to prevent memory issues
function processBase64Chunks(base64String: string, chunkSize = 32768) {
  const chunks: Uint8Array[] = [];
  let position = 0;
  
  while (position < base64String.length) {
    const chunk = base64String.slice(position, position + chunkSize);
    const binaryChunk = atob(chunk);
    const bytes = new Uint8Array(binaryChunk.length);
    
    for (let i = 0; i < binaryChunk.length; i++) {
      bytes[i] = binaryChunk.charCodeAt(i);
    }
    
    chunks.push(bytes);
    position += chunkSize;
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { audio, commercial_id, phone_number, lead_id, call_duration } = await req.json();
    
    if (!audio || !commercial_id) {
      throw new Error('Audio data and commercial_id are required');
    }

    console.log('Starting call transcription for commercial:', commercial_id);

    // Create initial transcript record
    const { data: transcriptRecord, error: insertError } = await supabase
      .from('call_transcripts')
      .insert({
        commercial_id,
        phone_number,
        lead_id,
        call_duration: call_duration || 0,
        status: 'processing'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating transcript record:', insertError);
      throw insertError;
    }

    console.log('Created transcript record:', transcriptRecord.id);

    try {
      // Process audio in chunks to prevent memory issues
      const binaryAudio = processBase64Chunks(audio);
      console.log('Processed audio data, size:', binaryAudio.length, 'bytes');
      
      // Prepare form data for OpenAI Whisper
      const formData = new FormData();
      const blob = new Blob([binaryAudio], { type: 'audio/webm' });
      formData.append('file', blob, 'call-recording.webm');
      formData.append('model', 'whisper-1');
      formData.append('language', 'fr'); // Assuming French based on the system
      formData.append('response_format', 'verbose_json');

      console.log('Sending audio to OpenAI Whisper API...');

      // Send to OpenAI Whisper API
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error:', response.status, errorText);
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Transcription completed successfully');

      // Update transcript record with the result
      const { error: updateError } = await supabase
        .from('call_transcripts')
        .update({
          transcript_text: result.text,
          status: 'completed',
          call_end_time: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', transcriptRecord.id);

      if (updateError) {
        console.error('Error updating transcript:', updateError);
        throw updateError;
      }

      console.log('Transcript saved successfully');

      return new Response(
        JSON.stringify({ 
          success: true, 
          transcript_id: transcriptRecord.id,
          text: result.text 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (transcriptionError) {
      console.error('Transcription failed:', transcriptionError);
      
      // Update record to failed status
      await supabase
        .from('call_transcripts')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', transcriptRecord.id);

      throw transcriptionError;
    }

  } catch (error) {
    console.error('Error in transcribe-call function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});