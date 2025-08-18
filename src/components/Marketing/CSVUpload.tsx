import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface CSVUploadProps {
  onUploadSuccess: () => void;
}

interface ColumnMapping {
  name: string;
  first_name: string;
  email: string;
  phone: string;
  source: string;
}

const CSVUpload = ({ onUploadSuccess }: CSVUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    name: 'skip',
    first_name: 'skip',
    email: 'skip',
    phone: 'skip',
    source: 'skip'
  });
  const [selectedCommercial, setSelectedCommercial] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [showColumnMapping, setShowColumnMapping] = useState(false);
  const [newCommercialName, setNewCommercialName] = useState('');
  const [newCommercialUsername, setNewCommercialUsername] = useState('');
  const [showAddCommercial, setShowAddCommercial] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch commercials
  const { data: commercials } = useQuery({
    queryKey: ['commercials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commercials')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  // Add commercial mutation
  const addCommercialMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('commercials')
        .insert({
          name: newCommercialName,
          username: newCommercialUsername,
          user_id: '00000000-0000-0000-0000-000000000000' // Dummy user_id since auth is removed
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['commercials'] });
      setSelectedCommercial(data.id);
      setNewCommercialName('');
      setNewCommercialUsername('');
      setShowAddCommercial(false);
      toast({
        title: "Success!",
        description: "Commercial added successfully",
      });
    },
    onError: (error) => {
      console.error('Add commercial error:', error);
      toast({
        title: "Error",
        description: "Failed to add commercial",
        variant: "destructive",
      });
    }
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('File selection started...');
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      console.log('Valid CSV file selected:', selectedFile.name);
      setFile(selectedFile);
      parseCSVHeaders(selectedFile);
    } else {
      console.log('Invalid file type selected:', selectedFile?.type);
      toast({
        title: "Invalid file type",
        description: "Please select a CSV file",
        variant: "destructive",
      });
    }
  };

  const parseCSVHeaders = async (csvFile: File) => {
    console.log('Parsing CSV headers...');
    try {
      const csvText = await csvFile.text();
      console.log('CSV text length:', csvText.length);
      const lines = csvText.split('\n');
      console.log('Number of lines:', lines.length);
      
      if (lines.length > 0) {
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        console.log('Parsed headers:', headers);
        setCsvHeaders(headers);
        setShowColumnMapping(true);
        
        // Auto-map common column names
        const autoMapping: ColumnMapping = {
          name: 'skip',
          first_name: 'skip',
          email: 'skip',
          phone: 'skip',
          source: 'skip'
        };
        
        headers.forEach(header => {
          const lowerHeader = header.toLowerCase();
          if (lowerHeader.includes('last') || (lowerHeader.includes('name') && !lowerHeader.includes('first'))) {
            autoMapping.name = header;
          } else if (lowerHeader.includes('first')) {
            autoMapping.first_name = header;
          } else if (lowerHeader.includes('email')) {
            autoMapping.email = header;
          } else if (lowerHeader.includes('phone') || lowerHeader.includes('tel')) {
            autoMapping.phone = header;
          } else if (lowerHeader.includes('source')) {
            autoMapping.source = header;
          }
        });
        
        console.log('Auto-mapped columns:', autoMapping);
        setColumnMapping(autoMapping);
      }
    } catch (error) {
      console.error('Error parsing CSV headers:', error);
      toast({
        title: "Error",
        description: "Failed to parse CSV headers",
        variant: "destructive",
      });
    }
  };

  const parseCSVWithMapping = (csvText: string) => {
    console.log('Parsing CSV with mapping...');
    console.log('Column mapping:', columnMapping);
    
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    const nameIndex = columnMapping.name !== 'skip' ? headers.indexOf(columnMapping.name) : -1;
    const firstNameIndex = columnMapping.first_name !== 'skip' ? headers.indexOf(columnMapping.first_name) : -1;
    const emailIndex = columnMapping.email !== 'skip' ? headers.indexOf(columnMapping.email) : -1;
    const phoneIndex = columnMapping.phone !== 'skip' ? headers.indexOf(columnMapping.phone) : -1;
    const sourceIndex = columnMapping.source !== 'skip' ? headers.indexOf(columnMapping.source) : -1;

    console.log('Column indexes:', { nameIndex, firstNameIndex, emailIndex, phoneIndex, sourceIndex });

    const contacts = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      
      if (values.length >= headers.length) {
        const contact = {
          name: nameIndex >= 0 ? values[nameIndex] || '' : '',
          first_name: firstNameIndex >= 0 ? values[firstNameIndex] || '' : '',
          email: emailIndex >= 0 ? values[emailIndex] || '' : '',
          phone: phoneIndex >= 0 ? values[phoneIndex] || '' : '',
          source: sourceIndex >= 0 ? values[sourceIndex] || '' : '',
        };
        
        // Only add if at least one field has data
        if (contact.name || contact.first_name || contact.email || contact.phone) {
          contacts.push(contact);
        }
      }
    }
    
    console.log('Parsed contacts count:', contacts.length);
    console.log('Sample contact:', contacts[0]);
    return contacts;
  };

  const handleUpload = async () => {
    console.log('Upload started...');
    if (!file) {
      console.log('No file selected');
      return;
    }

    // Validate column mapping - at least one field should not be "skip"
    const hasValidMapping = Object.values(columnMapping).some(value => value !== 'skip' && value !== '');
    console.log('Has valid mapping:', hasValidMapping);
    
    if (!hasValidMapping) {
      console.log('Invalid mapping detected');
      toast({
        title: "Invalid mapping",
        description: "Please map at least one column",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      console.log('Reading CSV file...');
      const csvText = await file.text();
      const contacts = parseCSVWithMapping(csvText);
      
      if (contacts.length === 0) {
        throw new Error('No valid contacts found in CSV');
      }

      console.log('Preparing contacts for database insert...');
      const contactsWithMetadata = contacts.map(contact => ({
        ...contact,
        user_id: '00000000-0000-0000-0000-000000000000', // Dummy user_id since auth is removed
        commercial_id: selectedCommercial || null,
      }));

      console.log('Sample contact with metadata:', contactsWithMetadata[0]);
      console.log('Inserting contacts into database...');

      const { error } = await supabase
        .from('marketing_contacts')
        .insert(contactsWithMetadata);

      if (error) {
        console.error('Database insert error:', error);
        throw error;
      }

      console.log('Upload successful!');
      toast({
        title: "Success!",
        description: `Uploaded ${contacts.length} contacts successfully`,
      });

      setFile(null);
      setSelectedCommercial('');
      setShowColumnMapping(false);
      setCsvHeaders([]);
      setColumnMapping({ name: 'skip', first_name: 'skip', email: 'skip', phone: 'skip', source: 'skip' });
      onUploadSuccess();
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload CSV",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddCommercial = () => {
    if (!newCommercialName.trim() || !newCommercialUsername.trim()) {
      toast({
        title: "Invalid input",
        description: "Please enter both name and username",
        variant: "destructive",
      });
      return;
    }
    addCommercialMutation.mutate();
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Upload className="h-5 w-5" />
          Upload CSV
        </CardTitle>
        <CardDescription className="text-gray-400">
          Upload a CSV file and map columns to contact fields
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-300 mb-2 block">
            Assign to Commercial
          </label>
          <div className="flex gap-2">
            <Select value={selectedCommercial} onValueChange={setSelectedCommercial}>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white flex-1">
                <SelectValue placeholder="Select a commercial" />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                {commercials?.map((commercial) => (
                  <SelectItem key={commercial.id} value={commercial.id} className="text-white">
                    {commercial.name} ({commercial.username})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => setShowAddCommercial(!showAddCommercial)}
              variant="outline"
              size="sm"
              className="border-gray-600 text-gray-300 hover:bg-gray-600"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {showAddCommercial && (
          <div className="space-y-2 p-3 bg-gray-700 rounded-lg">
            <h4 className="text-sm font-medium text-white">Add New Commercial</h4>
            <Input
              placeholder="Commercial Name"
              value={newCommercialName}
              onChange={(e) => setNewCommercialName(e.target.value)}
              className="bg-gray-600 border-gray-500 text-white"
            />
            <Input
              placeholder="Username"
              value={newCommercialUsername}
              onChange={(e) => setNewCommercialUsername(e.target.value)}
              className="bg-gray-600 border-gray-500 text-white"
            />
            <div className="flex gap-2">
              <Button
                onClick={handleAddCommercial}
                disabled={addCommercialMutation.isPending}
                size="sm"
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                {addCommercialMutation.isPending ? 'Adding...' : 'Add'}
              </Button>
              <Button
                onClick={() => setShowAddCommercial(false)}
                variant="outline"
                size="sm"
                className="border-gray-600 text-gray-300 hover:bg-gray-600"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-4">
          <Input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="bg-gray-700 border-gray-600 text-white"
          />
        </div>
        
        {file && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <FileText className="h-4 w-4" />
            <span>{file.name}</span>
          </div>
        )}

        {showColumnMapping && csvHeaders.length > 0 && (
          <div className="space-y-3 p-3 bg-gray-700 rounded-lg">
            <h4 className="text-sm font-medium text-white">Map CSV Columns</h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Last Name</label>
                <Select value={columnMapping.name} onValueChange={(value) => setColumnMapping({...columnMapping, name: value})}>
                  <SelectTrigger className="bg-gray-600 border-gray-500 text-white h-8">
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-600 border-gray-500">
                    <SelectItem value="skip" className="text-white">-- Skip --</SelectItem>
                    {csvHeaders.map((header) => (
                      <SelectItem key={header} value={header} className="text-white">
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">First Name</label>
                <Select value={columnMapping.first_name} onValueChange={(value) => setColumnMapping({...columnMapping, first_name: value})}>
                  <SelectTrigger className="bg-gray-600 border-gray-500 text-white h-8">
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-600 border-gray-500">
                    <SelectItem value="skip" className="text-white">-- Skip --</SelectItem>
                    {csvHeaders.map((header) => (
                      <SelectItem key={header} value={header} className="text-white">
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Email</label>
                <Select value={columnMapping.email} onValueChange={(value) => setColumnMapping({...columnMapping, email: value})}>
                  <SelectTrigger className="bg-gray-600 border-gray-500 text-white h-8">
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-600 border-gray-500">
                    <SelectItem value="skip" className="text-white">-- Skip --</SelectItem>
                    {csvHeaders.map((header) => (
                      <SelectItem key={header} value={header} className="text-white">
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Phone</label>
                <Select value={columnMapping.phone} onValueChange={(value) => setColumnMapping({...columnMapping, phone: value})}>
                  <SelectTrigger className="bg-gray-600 border-gray-500 text-white h-8">
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-600 border-gray-500">
                    <SelectItem value="skip" className="text-white">-- Skip --</SelectItem>
                    {csvHeaders.map((header) => (
                      <SelectItem key={header} value={header} className="text-white">
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Source</label>
                <Select value={columnMapping.source} onValueChange={(value) => setColumnMapping({...columnMapping, source: value})}>
                  <SelectTrigger className="bg-gray-600 border-gray-500 text-white h-8">
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-600 border-gray-500">
                    <SelectItem value="skip" className="text-white">-- Skip --</SelectItem>
                    {csvHeaders.map((header) => (
                      <SelectItem key={header} value={header} className="text-white">
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        <Button
          onClick={handleUpload}
          disabled={!file || isUploading || !showColumnMapping}
          className="w-full bg-yellow-500 hover:bg-yellow-600 text-black"
        >
          {isUploading ? 'Uploading...' : 'Upload CSV'}
        </Button>

        <div className="text-xs text-gray-500">
          <p>CSV format example:</p>
          <code className="bg-gray-700 p-2 rounded text-xs block mt-1">
            name,first_name,email,phone,source<br />
            Doe,John,john@example.com,1234567890,Website
          </code>
        </div>
      </CardContent>
    </Card>
  );
};

export default CSVUpload;
