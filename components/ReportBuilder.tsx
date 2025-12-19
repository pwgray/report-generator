import React, { useState, useEffect } from 'react';
import { DataSource, ReportConfig, TableDef, ColumnDef, ReportColumn, FilterCondition, SortCondition, VisualizationType } from '../types';
import { Button, Input, Select, Card, CardHeader, CardContent } from './UIComponents';
import { ChevronRight, Save, Play, Plus, Trash2, BarChart2, Table as TableIcon, PieChart, TrendingUp, Filter, ArrowUpDown, Lock, Globe } from 'lucide-react';

interface ReportBuilderProps {
  dataSources: DataSource[];
  onSave: (report: ReportConfig) => void;
  onCancel: () => void;
  initialReport?: ReportConfig;
}

export const ReportBuilder: React.FC<ReportBuilderProps> = ({ dataSources, onSave, onCancel, initialReport }) => {
  const [config, setConfig] = useState<ReportConfig>(initialReport || {
    id: crypto.randomUUID(),
    dataSourceId: dataSources[0]?.id || '',
    name: 'New Report',
    description: '',
    ownerId: '', // Set by parent on save
    visibility: 'private',
    selectedColumns: [],
    filters: [],
    sorts: [],
    visualization: 'table',
    schedule: { enabled: false, frequency: 'weekly', time: '09:00' },
    created_at: new Date().toISOString()
  });

  const [activeTab, setActiveTab] = useState<'data' | 'filter' | 'visual'>('data');

  const selectedDs = dataSources.find(d => d.id === config.dataSourceId);

  // Combine tables and views for selection (views are treated like read-only tables)
  const allTablesAndViews = selectedDs ? [
    ...(selectedDs.tables || []),
    ...(selectedDs.views || [])
  ] : [];

  // If data source changes, clear selections
  const handleDsChange = (dsId: string) => {
    setConfig({
        ...config,
        dataSourceId: dsId,
        selectedColumns: [],
        filters: [],
        sorts: []
    });
  };

  const toggleColumn = (tableId: string, columnId: string) => {
    const exists = config.selectedColumns.find(c => c.tableId === tableId && c.columnId === columnId);
    if (exists) {
        setConfig({
            ...config,
            selectedColumns: config.selectedColumns.filter(c => c !== exists)
        });
    } else {
        setConfig({
            ...config,
            selectedColumns: [...config.selectedColumns, { tableId, columnId }]
        });
    }
  };

  const addFilter = () => {
    if (!selectedDs) return;
    const firstTable = allTablesAndViews.find(t => t.exposed);
    if (!firstTable) return;
    
    setConfig({
        ...config,
        filters: [...config.filters, {
            id: crypto.randomUUID(),
            tableId: firstTable.id,
            columnId: firstTable.columns[0].id,
            operator: 'equals',
            value: ''
        }]
    });
  };

  const updateFilter = (index: number, field: keyof FilterCondition, value: string) => {
      const newFilters = [...config.filters];
      // @ts-ignore - dynamic assignment
      newFilters[index][field] = value;
      setConfig({...config, filters: newFilters});
  };

  const removeFilter = (index: number) => {
      const newFilters = [...config.filters];
      newFilters.splice(index, 1);
      setConfig({...config, filters: newFilters});
  };

  // Helper to find column name (use aliases when available)
  const getColName = (tableId: string, colId: string) => {
      const t = allTablesAndViews.find(t => t.id === tableId);
      const c = t?.columns.find(c => c.id === colId);
      const tableLabel = t ? (t.alias || t.name) : tableId;
      const colLabel = c ? (c.alias || c.name) : colId;
      return `${tableLabel}.${colLabel}`;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)]">
      {/* Header */}
      <div className="flex justify-between items-start mb-6 border-b pb-4">
        <div className="flex-1 mr-4">
            <input 
                value={config.name}
                onChange={(e) => setConfig({...config, name: e.target.value})}
                className="text-2xl font-bold bg-transparent border-none focus:ring-0 placeholder-gray-400 w-full p-0"
                placeholder="Report Name"
            />
            <p className="text-sm text-gray-500 mt-1">Configure your data and visualization</p>
        </div>
        <div className="flex items-center space-x-3">
            <div className="flex items-center bg-gray-100 rounded-md p-1">
                <button 
                    onClick={() => setConfig({...config, visibility: 'private'})}
                    className={`flex items-center px-3 py-1.5 text-sm rounded-sm transition-colors ${config.visibility === 'private' ? 'bg-white shadow-sm text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-900'}`}
                >
                    <Lock className="w-3 h-3 mr-2" /> Private
                </button>
                <button 
                    onClick={() => setConfig({...config, visibility: 'public'})}
                    className={`flex items-center px-3 py-1.5 text-sm rounded-sm transition-colors ${config.visibility === 'public' ? 'bg-white shadow-sm text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-900'}`}
                >
                    <Globe className="w-3 h-3 mr-2" /> Public
                </button>
            </div>
            <div className="h-6 w-px bg-gray-300 mx-2"></div>
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
            <Button onClick={() => onSave(config)}>
                <Save className="w-4 h-4 mr-2" /> Save Report
            </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden gap-6">
        {/* Left Sidebar: Settings */}
        <div className="w-1/3 bg-white border border-gray-200 rounded-lg flex flex-col overflow-hidden">
            <div className="flex border-b border-gray-200">
                <button 
                    className={`flex-1 py-3 text-sm font-medium ${activeTab === 'data' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('data')}
                >
                    Data
                </button>
                <button 
                    className={`flex-1 py-3 text-sm font-medium ${activeTab === 'filter' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('filter')}
                >
                    Filters & Sort
                </button>
                <button 
                    className={`flex-1 py-3 text-sm font-medium ${activeTab === 'visual' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('visual')}
                >
                    Visualize
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                {activeTab === 'data' && (
                    <div className="space-y-6">
                        <Select 
                            label="Data Source"
                            value={config.dataSourceId}
                            onChange={(e) => handleDsChange(e.target.value)}
                            options={dataSources.map(ds => ({ label: ds.name, value: ds.id }))}
                        />

                        {selectedDs && (
                            <div className="space-y-4">
                                <h3 className="font-medium text-gray-900">Available Tables & Views</h3>
                                {allTablesAndViews.filter(t => t.exposed).map(table => {
                                    const isView = selectedDs.views?.some(v => v.id === table.id);
                                    return (
                                    <div key={table.id} className={`border rounded-md overflow-hidden ${isView ? 'border-blue-300' : ''}`}>
                                        <div className={`px-3 py-2 text-sm font-semibold border-b flex items-center justify-between ${isView ? 'bg-blue-50 text-blue-900' : 'bg-gray-50 text-gray-700'}`}>
                                            <span>{table.name}</span>
                                            {isView && <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded">VIEW</span>}
                                        </div>
                                        <div className="p-2 space-y-1">
                                            {table.columns.map(col => {
                                                const isSelected = config.selectedColumns.some(c => c.tableId === table.id && c.columnId === col.id);
                                                return (
                                                    <label key={col.id} className="flex items-center space-x-2 text-sm text-gray-600 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={isSelected}
                                                            onChange={() => toggleColumn(table.id, col.id)}
                                                            className="rounded text-blue-600 focus:ring-blue-500"
                                                        />
                                                        <span>{col.alias || col.name}</span>
                                                        <span className="text-xs text-gray-400 ml-auto">{col.type}</span>
                                                    </label>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )})}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'filter' && (
                    <div className="space-y-6">
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-medium text-gray-900">Filters</h3>
                                <Button variant="ghost" className="text-xs" onClick={addFilter}>
                                    <Plus className="w-3 h-3 mr-1" /> Add Filter
                                </Button>
                            </div>
                            <div className="space-y-3">
                                {config.filters.map((filter, idx) => (
                                    <div key={filter.id} className="p-3 bg-gray-50 rounded-md border border-gray-200 space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-xs font-semibold text-gray-500">Filter #{idx + 1}</span>
                                            <button onClick={() => removeFilter(idx)} className="text-red-500 hover:text-red-700"><Trash2 className="w-3 h-3" /></button>
                                        </div>
                                        <select 
                                            className="w-full text-sm border-gray-300 rounded-md"
                                            value={filter.columnId}
                                            onChange={(e) => {
                                                // Find table id from column id (simplified, assumes unique col ids or look up)
                                                // In real app, we need to know the table context. 
                                                // For MVP, we iterate tables to find the col.
                                                let tid = filter.tableId;
                                                allTablesAndViews.forEach(t => {
                                                    if(t.columns.find(c => c.id === e.target.value)) tid = t.id;
                                                });
                                                const newFilters = [...config.filters];
                                                newFilters[idx] = { ...newFilters[idx], columnId: e.target.value, tableId: tid };
                                                setConfig({...config, filters: newFilters});
                                            }}
                                        >
                                            {allTablesAndViews.filter(t => t.exposed).flatMap(t => 
                                                t.columns.map(c => <option key={c.id} value={c.id}>{(t.alias || t.name)}.{(c.alias || c.name)}</option>)
                                            )}
                                        </select>
                                        <div className="flex space-x-2">
                                            <select 
                                                className="w-1/3 text-sm border-gray-300 rounded-md"
                                                value={filter.operator}
                                                onChange={(e) => updateFilter(idx, 'operator', e.target.value)}
                                            >
                                                <option value="equals">Equals</option>
                                                <option value="contains">Contains</option>
                                                <option value="gt">Greater Than</option>
                                                <option value="lt">Less Than</option>
                                            </select>
                                            <input 
                                                className="w-2/3 text-sm border-gray-300 rounded-md p-1"
                                                placeholder="Value..."
                                                value={filter.value}
                                                onChange={(e) => updateFilter(idx, 'value', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                ))}
                                {config.filters.length === 0 && <p className="text-sm text-gray-500 italic">No filters defined.</p>}
                            </div>
                        </div>

                        <div className="border-t pt-4">
                             <h3 className="font-medium text-gray-900 mb-2">Sorting</h3>
                             {/* Simplified Sorting UI for MVP */}
                             <div className="p-3 bg-gray-50 rounded text-sm text-gray-600">
                                Sorting configuration not implemented in MVP demo.
                             </div>
                        </div>
                    </div>
                )}

                {activeTab === 'visual' && (
                    <div className="space-y-6">
                        <div>
                            <label className="mb-2 text-sm font-medium text-gray-700 block">Chart Type</label>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { id: 'table', icon: TableIcon, label: 'Table' },
                                    { id: 'bar', icon: BarChart2, label: 'Bar' },
                                    { id: 'line', icon: TrendingUp, label: 'Line' },
                                    { id: 'pie', icon: PieChart, label: 'Pie' }
                                ].map((type) => (
                                    <button
                                        key={type.id}
                                        onClick={() => setConfig({...config, visualization: type.id as VisualizationType})}
                                        className={`flex flex-col items-center justify-center p-3 rounded-lg border text-sm transition-colors ${config.visualization === type.id ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        <type.icon className="w-5 h-5 mb-1" />
                                        {type.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        <div>
                            <label className="mb-2 text-sm font-medium text-gray-700 block">Schedule Snapshot</label>
                            <div className="flex items-center space-x-2 mb-2">
                                <input 
                                    type="checkbox" 
                                    id="schedule-toggle"
                                    checked={config.schedule.enabled}
                                    onChange={(e) => setConfig({...config, schedule: {...config.schedule, enabled: e.target.checked}})}
                                    className="rounded text-blue-600"
                                />
                                <label htmlFor="schedule-toggle" className="text-sm text-gray-600">Enable Schedule</label>
                            </div>
                            {config.schedule.enabled && (
                                <select 
                                    className="w-full text-sm border-gray-300 rounded-md"
                                    value={config.schedule.frequency}
                                    onChange={(e) => setConfig({...config, schedule: {...config.schedule, frequency: e.target.value as any}})}
                                >
                                    <option value="daily">Daily</option>
                                    <option value="weekly">Weekly</option>
                                    <option value="monthly">Monthly</option>
                                </select>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* Right Preview Area */}
        <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg flex flex-col items-center justify-center text-gray-400">
            <div className="text-center p-6 max-w-sm">
                <BarChart2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900">Preview Mode</h3>
                <p className="mb-4">Configure your report on the left. Save the report to view live data and generated charts.</p>
                <div className="text-sm bg-white p-4 rounded shadow-sm text-left w-full">
                    <strong>Summary:</strong>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li>Source: {selectedDs?.name || 'None'}</li>
                        <li>Columns: {config.selectedColumns.length}</li>
                        <li>Filters: {config.filters.length}</li>
                        <li>Type: {config.visualization.toUpperCase()}</li>
                    </ul>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};