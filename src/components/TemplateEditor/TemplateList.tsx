
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Template {
  id: string;
  name: string;
  subject?: string;
  content: string;
  variables?: string[];
  created_at: string;
}

interface TemplateListProps {
  templates: Template[];
  type: 'email' | 'sms';
  onEdit: (template: Template) => void;
}

const TemplateList = ({ templates, type, onEdit }: TemplateListProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const table = type === 'email' ? 'email_templates' : 'sms_templates';
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', templateId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`${type}-templates`] });
      toast({
        title: "Success",
        description: "Template deleted successfully",
      });
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (templateId: string) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      deleteTemplateMutation.mutate(templateId);
    }
  };

  if (templates.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        No {type} templates created yet. Click "Create New" to get started.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {templates.map((template) => (
        <div
          key={template.id}
          className="p-4 bg-gray-700 rounded-lg"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-medium text-white mb-2">
                {template.name}
              </h3>
              {type === 'email' && template.subject && (
                <p className="text-sm text-gray-300 mb-2">
                  Subject: {template.subject}
                </p>
              )}
              <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                {template.content.substring(0, 150)}...
              </p>
              <div className="flex flex-wrap gap-2 mb-2">
                {template.variables?.map((variable) => (
                  <Badge
                    key={variable}
                    variant="outline"
                    className="text-xs border-gray-500 text-gray-300"
                  >
                    {variable}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-gray-500">
                Created: {new Date(template.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-2 ml-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEdit(template)}
                className="border-gray-600 text-gray-300 hover:bg-gray-600"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleDelete(template.id)}
                disabled={deleteTemplateMutation.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TemplateList;
