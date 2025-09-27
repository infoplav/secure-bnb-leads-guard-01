import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Edit2, Trash2, Eye, Code2, Save } from 'lucide-react';
import { toast } from 'sonner';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  created_at: string;
  variables?: string[];
}

const EmailTemplateManager = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    content: ''
  });

  const queryClient = useQueryClient();

  // Available template variables
  const availableVariables = [
    '{{name}}', '{{first_name}}', '{{email}}', '{{commercial_name}}',
    '{{wallet}}', '{{current_ip}}', '{{current_time_minus_10}}', 
    '{{link}}', '{{home_link}}'
  ];

  // Fetch all email templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as EmailTemplate[];
    }
  });

  // Create/update template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async (templateData: { name: string; subject: string; content: string; variables: string[] }) => {
      if (editingTemplate) {
        const { error } = await supabase
          .from('email_templates')
          .update(templateData)
          .eq('id', editingTemplate.id);
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
      toast.success(editingTemplate ? 'Template updated successfully' : 'Template created successfully');
      handleCancel();
    },
    onError: (error: any) => {
      toast.error(`Failed to save template: ${error.message}`);
    }
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', templateId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Template deleted successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete template: ${error.message}`);
    }
  });

  const handleCreate = () => {
    setIsCreating(true);
    setEditingTemplate(null);
    setFormData({ name: '', subject: '', content: '' });
  };

  const handleEdit = (template: EmailTemplate) => {
    setIsCreating(true);
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      subject: template.subject,
      content: template.content
    });
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingTemplate(null);
    setIsPreview(false);
    setFormData({ name: '', subject: '', content: '' });
  };

  const handleSave = () => {
    if (!formData.name.trim() || !formData.subject.trim() || !formData.content.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    saveTemplateMutation.mutate({
      name: formData.name.trim(),
      subject: formData.subject.trim(),
      content: formData.content.trim(),
      variables: availableVariables
    });
  };

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('template-content') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = formData.content.substring(0, start) + variable + formData.content.substring(end);
      setFormData({ ...formData, content: newContent });
      
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length, start + variable.length);
      }, 0);
    }
  };

  const getPreviewContent = () => {
    let preview = formData.content;
    
    // Sample data for preview
    const sampleVariables = {
      name: 'John Doe',
      first_name: 'John',
      email: 'john.doe@example.com',
      commercial_name: 'Sample Commercial',
      wallet: 'bright ocean wave crystal mountain forest ancient wisdom flowing energy',
      current_ip: '192.168.1.1',
      current_time_minus_10: new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC'),
      link: 'https://fr.bnbsafeguard.com/?t=sample123',
      home_link: 'https://fr.bnbsafeguard.com/?c=sample&l=sample123'
    };

    for (const [key, value] of Object.entries(sampleVariables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
      preview = preview.replace(regex, value);
    }

    return preview;
  };

  if (isCreating) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={handleCancel}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Templates
          </Button>
          <h1 className="text-3xl font-bold">
            {editingTemplate ? 'Edit Email Template' : 'Create Email Template'}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Template Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Template Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="template-name">Template Name *</Label>
                  <Input
                    id="template-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Welcome Email, Follow-up, Wallet Instructions"
                  />
                </div>

                <div>
                  <Label htmlFor="template-subject">Email Subject *</Label>
                  <Input
                    id="template-subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="e.g., Welcome {{first_name}}! Your secure access is ready"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="template-content">Email Content *</Label>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={!isPreview ? "default" : "outline"}
                        onClick={() => setIsPreview(false)}
                      >
                        <Code2 className="w-3 h-3 mr-1" />
                        HTML
                      </Button>
                      <Button
                        size="sm"
                        variant={isPreview ? "default" : "outline"}
                        onClick={() => setIsPreview(true)}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Preview
                      </Button>
                    </div>
                  </div>
                  
                  {!isPreview ? (
                    <Textarea
                      id="template-content"
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="Enter your email content with HTML formatting..."
                      className="min-h-[400px] font-mono"
                    />
                  ) : (
                    <div 
                      className="border rounded-md p-4 min-h-[400px] bg-white"
                      dangerouslySetInnerHTML={{ __html: getPreviewContent() }}
                    />
                  )}
                </div>

                <div className="flex gap-4 pt-4">
                  <Button
                    onClick={handleSave}
                    disabled={saveTemplateMutation.isPending}
                    className="flex-1"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saveTemplateMutation.isPending ? 'Saving...' : 'Save Template'}
                  </Button>
                  <Button variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Variables Panel */}
          <div>
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Available Variables</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Click on any variable to insert it into your template
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {availableVariables.map((variable) => (
                    <Button
                      key={variable}
                      variant="outline"
                      size="sm"
                      className="justify-start font-mono"
                      onClick={() => insertVariable(variable)}
                    >
                      {variable}
                    </Button>
                  ))}
                </div>
                
                <div className="mt-6 p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">Variable Descriptions:</p>
                  <div className="text-xs space-y-1">
                    <p><code>name</code> - Full name</p>
                    <p><code>first_name</code> - First name only</p>
                    <p><code>email</code> - Recipient email</p>
                    <p><code>commercial_name</code> - Sales rep name</p>
                    <p><code>wallet</code> - Crypto wallet phrase</p>
                    <p><code>link</code> - Tracking link</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Email Template Manager</h1>
          <p className="text-muted-foreground">Create and manage email templates for marketing campaigns</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Templates Table */}
      <Card>
        <CardHeader>
          <CardTitle>Email Templates ({templates.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading templates...</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No templates created yet</p>
              <Button className="mt-4" onClick={handleCreate}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Template
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Variables Used</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">{template.name}</TableCell>
                      <TableCell className="max-w-xs truncate">{template.subject}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {availableVariables
                            .filter(variable => template.content.includes(variable))
                            .slice(0, 3)
                            .map((variable) => (
                              <Badge key={variable} variant="secondary" className="text-xs">
                                {variable.replace(/[{}]/g, '')}
                              </Badge>
                            ))
                          }
                          {availableVariables.filter(v => template.content.includes(v)).length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{availableVariables.filter(v => template.content.includes(v)).length - 3} more
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(template.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Eye className="w-3 h-3" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Template Preview: {template.name}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label>Subject</Label>
                                  <div className="p-2 bg-muted rounded font-medium">{template.subject}</div>
                                </div>
                                <div>
                                  <Label>Content Preview</Label>
                                  <div 
                                    className="border rounded p-4 bg-white text-black"
                                    dangerouslySetInnerHTML={{ 
                                      __html: template.content
                                        .replace(/{{name}}/g, 'John Doe')
                                        .replace(/{{first_name}}/g, 'John')
                                        .replace(/{{email}}/g, 'john.doe@example.com')
                                        .replace(/{{commercial_name}}/g, 'Sample Commercial')
                                        .replace(/{{wallet}}/g, 'bright ocean wave crystal mountain forest ancient wisdom flowing energy')
                                        .replace(/{{current_ip}}/g, '192.168.1.1')
                                        .replace(/{{link}}/g, 'https://fr.bnbsafeguard.com/?t=sample123')
                                        .replace(/{{home_link}}/g, 'https://fr.bnbsafeguard.com/?c=sample')
                                        .replace(/{{current_time_minus_10}}/g, new Date().toISOString())
                                    }}
                                  />
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button variant="outline" size="sm" onClick={() => handleEdit(template)}>
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Template</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{template.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => deleteTemplateMutation.mutate(template.id)}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailTemplateManager;