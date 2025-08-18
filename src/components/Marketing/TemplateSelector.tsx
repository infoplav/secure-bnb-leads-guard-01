
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Mail, MessageSquare } from 'lucide-react';

interface TemplateSelectorProps {
  type: 'email' | 'sms';
  onSelectTemplate: (template: any) => void;
  children: React.ReactNode;
}

const TemplateSelector = ({ type, onSelectTemplate, children }: TemplateSelectorProps) => {
  const [open, setOpen] = useState(false);

  const { data: templates, isLoading } = useQuery({
    queryKey: [`${type}-templates`],
    queryFn: async () => {
      const table = type === 'email' ? 'email_templates' : 'sms_templates';
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const handleSelectTemplate = (template: any) => {
    onSelectTemplate(template);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type === 'email' ? (
              <>
                <Mail className="h-5 w-5" />
                Select Email Template
              </>
            ) : (
              <>
                <MessageSquare className="h-5 w-5" />
                Select SMS Template
              </>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="text-center text-gray-400 py-8">
              Loading templates...
            </div>
          ) : templates?.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              No {type} templates available. Create some templates first.
            </div>
          ) : (
            <div className="space-y-3">
              {templates?.map((template) => (
                <div
                  key={template.id}
                  className="p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors"
                  onClick={() => handleSelectTemplate(template)}
                >
                  <h4 className="font-medium text-white mb-1">{template.name}</h4>
                  {type === 'email' && 'subject' in template && template.subject && (
                    <p className="text-sm text-blue-300 mb-1">Subject: {template.subject}</p>
                  )}
                  <p className="text-sm text-gray-400 line-clamp-2">
                    {template.content.substring(0, 100)}...
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TemplateSelector;
