
import React, { useState } from 'react';
import { DataSource, TableDef, ColumnDef, ConnectionDetails } from '../types';
import { Plus, Database, Edit2, Trash2, Check, Sparkles, ChevronRight, ChevronDown, Table as TableIcon, Server, RefreshCw, Eye, EyeOff, Info } from 'lucide-react';
import { Button, Input, Card, CardHeader, CardContent, Badge } from './UIComponents';
import { discoverSchema } from '../services/geminiService';
import { testConnectionAndFetchSchema } from '../services/datasourceService';

interface DataSourceViewProps {
  dataSources: DataSource[];
  onAdd: (ds: DataSource) => Promise<any>;
  onUpdate: (ds: DataSource) => Promise<any>;
  onDelete: (id: string) => Promise<void>;
  isReadOnly?: boolean;
}

export const DataSourceView: React.FC<DataSourceViewProps> = ({ dataSources, onAdd, onUpdate, onDelete, isReadOnly = false }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState<Partial<DataSource>>({
    name: '',
    description: '',
    type: 'sql',
    tables: []
  });
  const [connectionDetails, setConnectionDetails] = useState<ConnectionDetails>({
      host: 'localhost',
      port: '1433',
      database: 'Northwind',
      username: 'sa',
      password: ''
  });
  const [aiPrompt, setAiPrompt] = useState('');
  
  // UI State
  const [activeTab, setActiveTab] = useState<'connection' | 'schema'>('connection');
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [expandedTableId, setExpandedTableId] = useState<string | null>(null);

  const startEdit = (ds?: DataSource) => {
    if (ds) {
      setEditingId(ds.id);
      setFormData({ ...ds });
      setConnectionDetails(ds.connectionDetails || { host: '', port: '', database: '', username: '', password: '' });
      setActiveTab('schema'); // If editing, go straight to schema
    } else {
      setEditingId(null);
      setFormData({ name: '', description: '', type: 'sql', tables: [] });
      setConnectionDetails({ host: 'localhost', port: '1433', database: 'Northwind', username: 'sa', password: '' });
      setActiveTab('connection');
    }
    setIsEditing(true);
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!formData.name) return;
    
    const ds: DataSource = {
      id: editingId || crypto.randomUUID(),
      name: formData.name,
      description: formData.description || '',
      type: formData.type || 'custom',
      connectionDetails: formData.type !== 'custom' ? connectionDetails : undefined,
      tables: formData.tables || [],
      created_at: editingId ? (formData.created_at || new Date().toISOString()) : new Date().toISOString()
    };

    setIsSaving(true);
    try {
      if (editingId) {
        await onUpdate(ds);
      } else {
        await onAdd(ds);
      }
      setIsEditing(false);
    } catch (e) {
      console.error('Failed to save datasource', e);
      alert('Failed to save datasource to server');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscoverSchema = async () => {
    const dbName = formData.type === 'custom' ? 'CustomDB' : connectionDetails.database;
    const context = formData.type === 'custom' ? aiPrompt : `Host: ${connectionDetails.host}`;
    
    if (!dbName && formData.type !== 'custom') {
        alert("Please enter a database name");
        return;
    }

    setIsDiscovering(true);
    try {
      if (formData.type === 'custom') {
        const newTables = await discoverSchema('custom', dbName, context);
        setFormData(prev => ({ ...prev, tables: newTables }));
        setActiveTab('schema');
      } else {
        // Call backend to test connection and fetch real schema
        try {
          const fetched = await testConnectionAndFetchSchema(formData.type || 'sql', connectionDetails);
          setFormData(prev => ({ ...prev, tables: fetched }));
          setActiveTab('schema');
        } catch (err) {
          console.error('Test connection failed', err);
          alert('Failed to connect and fetch schema. Confirm connection details and try again.');
        }
      }
    } catch (e) {
        console.error(e);
        alert("Failed to discover schema. Please try again.");
    } finally {
        setIsDiscovering(false);
    }
  };

  const toggleTableExposure = (tableId: string) => {
      const newTables = formData.tables?.map(t => 
          t.id === tableId ? { ...t, exposed: !t.exposed } : t
      );
      setFormData({...formData, tables: newTables});
  }

  const updateTableMetadata = (id: string, field: 'alias' | 'description', value: string) => {
      const newTables = formData.tables?.map(t => 
          t.id === id ? { ...t, [field]: value } : t
      );
      setFormData({...formData, tables: newTables});
  }

  const updateColumnMetadata = (tableId: string, colId: string, field: 'alias' | 'description' | 'sampleValue', value: string) => {
    const newTables = formData.tables?.map(t => {
        if (t.id !== tableId) return t;
        return {
            ...t,
            columns: t.columns.map(c => c.id === colId ? { ...c, [field]: value } : c)
        }
    });
    setFormData({...formData, tables: newTables});
  }

  if (isEditing) {
    return (
      <div className="space-y-6 animate-fade-in pb-10">
        <div className="flex items-center justify-between border-b pb-4">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">{editingId ? 'Edit Data Source' : 'New Data Source'}</h2>
                <p className="text-sm text-gray-500">Configure connection and schema metadata</p>
            </div>
            <div className="flex space-x-2">
                <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                <Button onClick={handleSave} loading={isSaving}>
                    <Check className="w-4 h-4 mr-2" /> Save Configuration
                </Button>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Basic Info & Tabs */}
            <div className="lg:col-span-3 space-y-4">
                <Card>
                    <CardHeader title="General Settings" />
                    <CardContent className="space-y-4">
                        <Input label="Name" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g., Sales DB" />
                        <Input label="Description" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Internal use only..." />
                        <div className="flex flex-col">
                            <label className="mb-1 text-sm font-medium text-gray-700">Source Type</label>
                            <select 
                                className="px-3 py-2 border border-gray-300 rounded-md bg-white"
                                value={formData.type} 
                                onChange={(e: any) => setFormData({...formData, type: e.target.value})}
                            >
                                <option value="postgres">PostgreSQL</option>
                                <option value="sql">Microsoft SQL</option>
                                <option value="custom">Custom / AI Generated</option>
                            </select>
                        </div>
                    </CardContent>
                </Card>

                <nav className="flex flex-col space-y-1">
                    <button 
                        onClick={() => setActiveTab('connection')}
                        className={`px-4 py-3 text-sm font-medium rounded-lg text-left flex items-center ${activeTab === 'connection' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <Server className="w-4 h-4 mr-3" /> Connection Details
                    </button>
                    <button 
                         onClick={() => setActiveTab('schema')}
                        className={`px-4 py-3 text-sm font-medium rounded-lg text-left flex items-center ${activeTab === 'schema' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <TableIcon className="w-4 h-4 mr-3" /> Schema & Metadata
                        {formData.tables && formData.tables.length > 0 && (
                            <Badge color="blue" className="ml-auto">{formData.tables.length}</Badge>
                        )}
                    </button>
                </nav>
            </div>

            {/* Right Column: Tab Content */}
            <div className="lg:col-span-9">
                {activeTab === 'connection' && (
                    <Card className="h-full">
                        <CardHeader title={formData.type === 'custom' ? "Describe Data" : "Database Connection"} />
                        <CardContent>
                            {formData.type === 'custom' ? (
                                <div className="space-y-4 max-w-xl">
                                    <p className="text-sm text-gray-500">Since you chose Custom, describe the data you want to simulate.</p>
                                    <textarea 
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm h-32" 
                                        placeholder="e.g. HR system with employees, departments, and payroll history..."
                                        value={aiPrompt}
                                        onChange={(e) => setAiPrompt(e.target.value)}
                                    />
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
                                    <Input label="Host" value={connectionDetails.host} onChange={e => setConnectionDetails({...connectionDetails, host: e.target.value})} placeholder="localhost" />
                                    <Input label="Port" value={connectionDetails.port} onChange={e => setConnectionDetails({...connectionDetails, port: e.target.value})} placeholder="5432" />
                                    <Input label="Database Name" value={connectionDetails.database} onChange={e => setConnectionDetails({...connectionDetails, database: e.target.value})} placeholder="my_database" />
                                    <Input label="Username" value={connectionDetails.username} onChange={e => setConnectionDetails({...connectionDetails, username: e.target.value})} placeholder="user" />
                                    <Input label="Password" type="password" value={connectionDetails.password || ''} onChange={e => setConnectionDetails({...connectionDetails, password: e.target.value})} placeholder="••••••" />
                                </div>
                            )}

                            <div className="mt-8 border-t pt-6">
                                <Button onClick={handleDiscoverSchema} loading={isDiscovering} className="w-full md:w-auto">
                                    <RefreshCw className="w-4 h-4 mr-2" /> 
                                    {formData.type === 'custom' ? 'Generate Schema' : 'Test Connection & Fetch Schema'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {activeTab === 'schema' && (
                    <Card className="min-h-[500px]">
                        <CardHeader title="Schema Definition">
                             <div className="text-sm text-gray-500">
                                {formData.tables?.length || 0} tables discovered. Review and enrich metadata.
                             </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {formData.tables && formData.tables.length > 0 ? (
                                <div className="space-y-4">
                                    {formData.tables.map((table, idx) => (
                                        <div key={table.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                                            {/* Table Header */}
                                            <div className="p-4 bg-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                <div className="flex items-center flex-1 cursor-pointer" onClick={() => setExpandedTableId(expandedTableId === table.id ? null : table.id)}>
                                                    {expandedTableId === table.id ? <ChevronDown className="w-5 h-5 text-gray-500 mr-2" /> : <ChevronRight className="w-5 h-5 text-gray-500 mr-2" />}
                                                    <div className="flex items-center space-x-2">
                                                        <TableIcon className="w-4 h-4 text-blue-600" />
                                                        <span className="font-semibold text-gray-900 text-lg">{table.name}</span>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-3 w-full md:w-auto">
                                                     <div className="flex-1 md:w-48">
                                                        <input 
                                                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded" 
                                                            placeholder="Friendly Alias" 
                                                            value={table.alias || ''}
                                                            onChange={(e) => updateTableMetadata(table.id, 'alias', e.target.value)}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                     </div>
                                                     <Button 
                                                        variant={table.exposed ? 'secondary' : 'outline'} 
                                                        className={`text-xs ${table.exposed ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'text-gray-500'}`}
                                                        onClick={(e) => { e.stopPropagation(); toggleTableExposure(table.id); }}
                                                     >
                                                        {table.exposed ? <Eye className="w-3 h-3 mr-1"/> : <EyeOff className="w-3 h-3 mr-1"/>}
                                                        {table.exposed ? 'Exposed' : 'Hidden'}
                                                     </Button>
                                                </div>
                                            </div>

                                            {/* Table Body (Columns) */}
                                            {expandedTableId === table.id && (
                                                <div className="p-4 border-t border-gray-200">
                                                    <div className="mb-4">
                                                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Description</label>
                                                        <input 
                                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded" 
                                                            placeholder="Description for report users..." 
                                                            value={table.description || ''}
                                                            onChange={(e) => updateTableMetadata(table.id, 'description', e.target.value)}
                                                        />
                                                    </div>

                                                    <div className="overflow-x-auto">
                                                        <table className="min-w-full divide-y divide-gray-200">
                                                            <thead className="bg-gray-50">
                                                                <tr>
                                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Field Name</th>
                                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-48">Alias</th>
                                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-64">Description</th>
                                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sample</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="bg-white divide-y divide-gray-200">
                                                                {table.columns.map(col => (
                                                                    <tr key={col.id}>
                                                                        <td className="px-3 py-2 text-sm font-medium text-gray-900">{col.name}</td>
                                                                        <td className="px-3 py-2 text-xs text-gray-500 font-mono">{col.type}</td>
                                                                        <td className="px-3 py-2">
                                                                            <input 
                                                                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500" 
                                                                                value={col.alias || ''}
                                                                                placeholder={col.name}
                                                                                onChange={(e) => updateColumnMetadata(table.id, col.id, 'alias', e.target.value)}
                                                                            />
                                                                        </td>
                                                                        <td className="px-3 py-2">
                                                                            <input 
                                                                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500" 
                                                                                value={col.description || ''}
                                                                                placeholder="Description..."
                                                                                onChange={(e) => updateColumnMetadata(table.id, col.id, 'description', e.target.value)}
                                                                            />
                                                                        </td>
                                                                        <td className="px-3 py-2 text-xs text-gray-500 italic truncate max-w-[150px]">
                                                                            <input
                                                                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 italic text-xs"
                                                                                value={col.sampleValue || ''}
                                                                                placeholder="sample..."
                                                                                onChange={(e) => updateColumnMetadata(table.id, col.id, 'sampleValue', e.target.value)}
                                                                                onClick={(e) => e.stopPropagation()}
                                                                            />
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-20 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                                    <Database className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900">No Schema Defined</h3>
                                    <p className="text-gray-500 mb-4">Go to the "Connection Details" tab to fetch schema information.</p>
                                    <Button variant="outline" onClick={() => setActiveTab('connection')}>Go to Connection</Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Data Sources</h2>
        {!isReadOnly && (
            <Button onClick={() => startEdit()}>
                <Plus className="w-4 h-4 mr-2" /> Connect New Source
            </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dataSources.map(ds => (
          <Card key={ds.id} className="hover:shadow-md transition-shadow group">
            <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                        <Database className="w-6 h-6 text-blue-600" />
                    </div>
                    {!isReadOnly && (
                        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => startEdit(ds)} className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-blue-600" title="Edit">
                                <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={async () => { if (confirm('Delete this data source?')) { try { await onDelete(ds.id); } catch(e) { console.error(e); alert('Failed to delete datasource'); } } }} className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-red-600" title="Delete">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{ds.name}</h3>
                <p className="text-sm text-gray-500 mb-4 h-10 line-clamp-2">{ds.description || "No description provided."}</p>
                
                <div className="space-y-2">
                     <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
                        <span className="flex items-center"><Server className="w-3 h-3 mr-1"/> {ds.type.toUpperCase()}</span>
                        <span>{ds.tables.length} Tables</span>
                    </div>
                    {ds.connectionDetails && ds.type !== 'custom' && (
                         <div className="text-xs text-gray-400 font-mono bg-gray-50 p-1.5 rounded truncate">
                            {ds.connectionDetails.username}@{ds.connectionDetails.host}:{ds.connectionDetails.port}/{ds.connectionDetails.database}
                         </div>
                    )}
                </div>
            </div>
          </Card>
        ))}
        {dataSources.length === 0 && (
            <div className="col-span-full text-center py-20 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                <Database className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No Data Sources</h3>
                <p className="text-gray-500 mb-4">Connect a database or create a schema to get started.</p>
                {!isReadOnly && <Button onClick={() => startEdit()}>Connect Source</Button>}
            </div>
        )}
      </div>
    </div>
  );
};
