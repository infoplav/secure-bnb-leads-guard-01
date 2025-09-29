-- Create call transcripts table
CREATE TABLE public.call_transcripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  commercial_id UUID REFERENCES commercials(id) ON DELETE CASCADE,
  lead_id UUID,
  phone_number TEXT,
  transcript_text TEXT,
  call_duration INTEGER DEFAULT 0,
  call_start_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
  call_end_time TIMESTAMP WITH TIME ZONE,
  audio_file_url TEXT,
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.call_transcripts ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Admins can manage call transcripts" 
ON public.call_transcripts 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Create policy for commercials to view their own transcripts
CREATE POLICY "Commercials can view their own call transcripts" 
ON public.call_transcripts 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM commercials 
  WHERE commercials.id = call_transcripts.commercial_id 
  AND commercials.user_id = auth.uid()
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_call_transcripts_updated_at
BEFORE UPDATE ON public.call_transcripts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_call_transcripts_commercial_id ON public.call_transcripts(commercial_id);
CREATE INDEX idx_call_transcripts_created_at ON public.call_transcripts(created_at DESC);