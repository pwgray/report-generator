import React, { useState, useEffect } from 'react';
import { DataSource, ReportConfig, TableDef, ColumnDef, ReportColumn, FilterCondition, SortCondition, VisualizationType, FormattingConfig, ColumnType } from '../types';
import { Button, Input, Select, Card, CardHeader, CardContent } from './UIComponents';
import { ChevronRight, Save, Play, Plus, Trash2, BarChart2, Table as TableIcon, PieChart, TrendingUp, Filter, ArrowUpDown, Lock, Globe, Settings } from 'lucide-react';

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
        const colType = getColumnType(tableId, columnId) as ColumnType;
        const defaultFormatting = getDefaultFormatting(colType);
        setConfig({
            ...config,
            selectedColumns: [...config.selectedColumns, { tableId, columnId, formatting: defaultFormatting }]
        });
    }
  };

  const updateColumnFormatting = (tableId: string, columnId: string, formatting: FormattingConfig) => {
    const newColumns = config.selectedColumns.map(col => {
        if (col.tableId === tableId && col.columnId === columnId) {
            return { ...col, formatting };
        }
        return col;
    });
    setConfig({ ...config, selectedColumns: newColumns });
  };

  const getDefaultFormatting = (columnType: ColumnType): FormattingConfig => {
    switch (columnType) {
        case 'date':
            return { type: 'date', config: { format: 'MM/DD/YYYY' } };
        case 'number':
            return { type: 'number', config: { decimalPlaces: 2, thousandSeparator: true } };
        case 'currency':
            return { type: 'currency', config: { symbol: '$', decimalPlaces: 2, thousandSeparator: true, symbolPosition: 'before' } };
        case 'boolean':
            return { type: 'boolean', config: { style: 'true/false' } };
        case 'string':
        default:
            return { type: 'string', config: { case: 'none' } };
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

  // Helper to get column data type
  const getColumnType = (tableId: string, colId: string): string => {
      const t = allTablesAndViews.find(t => t.id === tableId);
      const c = t?.columns.find(c => c.id === colId);
      return c?.type || 'string';
  };

  // Get operators based on column data type
  const getOperatorsForType = (columnType: string) => {
      switch (columnType) {
          case 'string':
              return [
                  { value: 'equals', label: 'Equals' },
                  { value: 'not_equals', label: 'Not Equals' },
                  { value: 'contains', label: 'Contains' },
                  { value: 'not_contains', label: 'Does Not Contain' },
                  { value: 'starts_with', label: 'Starts With' },
                  { value: 'ends_with', label: 'Ends With' },
                  { value: 'is_empty', label: 'Is Empty' },
                  { value: 'is_not_empty', label: 'Is Not Empty' },
                  { value: 'in', label: 'In List' }
              ];
          case 'number':
          case 'currency':
              return [
                  { value: 'equals', label: 'Equals' },
                  { value: 'not_equals', label: 'Not Equals' },
                  { value: 'gt', label: 'Greater Than' },
                  { value: 'gte', label: 'Greater Than or Equal' },
                  { value: 'lt', label: 'Less Than' },
                  { value: 'lte', label: 'Less Than or Equal' },
                  { value: 'between', label: 'Between' },
                  { value: 'is_null', label: 'Is Null' },
                  { value: 'is_not_null', label: 'Is Not Null' }
              ];
          case 'date':
              return [
                  { value: 'equals', label: 'On Date' },
                  { value: 'not_equals', label: 'Not On Date' },
                  { value: 'gt', label: 'After' },
                  { value: 'gte', label: 'On or After' },
                  { value: 'lt', label: 'Before' },
                  { value: 'lte', label: 'On or Before' },
                  { value: 'between', label: 'Between Dates' },
                  { value: 'is_null', label: 'Is Null' },
                  { value: 'is_not_null', label: 'Is Not Null' },
                  { value: 'today', label: 'Is Today' },
                  { value: 'this_week', label: 'This Week' },
                  { value: 'this_month', label: 'This Month' },
                  { value: 'this_year', label: 'This Year' }
              ];
          case 'boolean':
              return [
                  { value: 'equals', label: 'Is' },
                  { value: 'is_null', label: 'Is Null' },
                  { value: 'is_not_null', label: 'Is Not Null' }
              ];
          default:
              return [
                  { value: 'equals', label: 'Equals' },
                  { value: 'not_equals', label: 'Not Equals' },
                  { value: 'contains', label: 'Contains' },
                  { value: 'is_null', label: 'Is Null' },
                  { value: 'is_not_null', label: 'Is Not Null' }
              ];
      }
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

                        {/* Selected Columns & Formatting */}
                        {config.selectedColumns.length > 0 && (
                            <div className="space-y-4 border-t pt-4 mt-4">
                                <h3 className="font-medium text-gray-900 flex items-center">
                                    <Settings className="w-4 h-4 mr-2" />
                                    Column Formatting ({config.selectedColumns.length})
                                </h3>
                                <div className="space-y-2">
                                    {config.selectedColumns.map((col, idx) => {
                                        const colType = getColumnType(col.tableId, col.columnId) as ColumnType;
                                        const colName = getColName(col.tableId, col.columnId);
                                        const formatting = col.formatting || getDefaultFormatting(colType);
                                        
                                        return (
                                            <div key={`${col.tableId}-${col.columnId}`} className="p-3 bg-white border border-gray-200 rounded-md space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium text-gray-900">{colName}</span>
                                                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">{colType}</span>
                                                </div>
                                                
                                                {/* Date Formatting */}
                                                {colType === 'date' && formatting.type === 'date' && (
                                                    <select 
                                                        className="w-full text-xs border-gray-300 rounded"
                                                        value={formatting.config.format}
                                                        onChange={(e) => updateColumnFormatting(col.tableId, col.columnId, {
                                                            type: 'date',
                                                            config: { format: e.target.value as any }
                                                        })}
                                                    >
                                                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                                                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                                                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                                                        <option value="MMM DD, YYYY">MMM DD, YYYY</option>
                                                        <option value="MMMM DD, YYYY">MMMM DD, YYYY</option>
                                                        <option value="relative">Relative (e.g., "2 days ago")</option>
                                                        <option value="iso">ISO 8601</option>
                                                    </select>
                                                )}
                                                
                                                {/* Number Formatting */}
                                                {colType === 'number' && formatting.type === 'number' && (
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <label className="text-xs text-gray-500">Decimals</label>
                                                            <input 
                                                                type="number"
                                                                min="0"
                                                                max="10"
                                                                className="w-full text-xs border-gray-300 rounded"
                                                                value={formatting.config.decimalPlaces}
                                                                onChange={(e) => updateColumnFormatting(col.tableId, col.columnId, {
                                                                    type: 'number',
                                                                    config: { ...formatting.config, decimalPlaces: parseInt(e.target.value) || 0 }
                                                                })}
                                                            />
                                                        </div>
                                                        <div className="flex items-end">
                                                            <label className="flex items-center space-x-1 text-xs text-gray-600 cursor-pointer">
                                                                <input 
                                                                    type="checkbox"
                                                                    checked={formatting.config.thousandSeparator}
                                                                    onChange={(e) => updateColumnFormatting(col.tableId, col.columnId, {
                                                                        type: 'number',
                                                                        config: { ...formatting.config, thousandSeparator: e.target.checked }
                                                                    })}
                                                                    className="rounded text-blue-600"
                                                                />
                                                                <span>Thousands</span>
                                                            </label>
                                                        </div>
                                                        <div>
                                                            <label className="text-xs text-gray-500">Prefix</label>
                                                            <input 
                                                                type="text"
                                                                placeholder="e.g., #"
                                                                className="w-full text-xs border-gray-300 rounded"
                                                                value={formatting.config.prefix || ''}
                                                                onChange={(e) => updateColumnFormatting(col.tableId, col.columnId, {
                                                                    type: 'number',
                                                                    config: { ...formatting.config, prefix: e.target.value }
                                                                })}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs text-gray-500">Suffix</label>
                                                            <input 
                                                                type="text"
                                                                placeholder="e.g., %"
                                                                className="w-full text-xs border-gray-300 rounded"
                                                                value={formatting.config.suffix || ''}
                                                                onChange={(e) => updateColumnFormatting(col.tableId, col.columnId, {
                                                                    type: 'number',
                                                                    config: { ...formatting.config, suffix: e.target.value }
                                                                })}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                {/* Currency Formatting */}
                                                {colType === 'currency' && formatting.type === 'currency' && (
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <label className="text-xs text-gray-500">Symbol</label>
                                                            <input 
                                                                type="text"
                                                                className="w-full text-xs border-gray-300 rounded"
                                                                value={formatting.config.symbol}
                                                                onChange={(e) => updateColumnFormatting(col.tableId, col.columnId, {
                                                                    type: 'currency',
                                                                    config: { ...formatting.config, symbol: e.target.value }
                                                                })}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs text-gray-500">Position</label>
                                                            <select 
                                                                className="w-full text-xs border-gray-300 rounded"
                                                                value={formatting.config.symbolPosition}
                                                                onChange={(e) => updateColumnFormatting(col.tableId, col.columnId, {
                                                                    type: 'currency',
                                                                    config: { ...formatting.config, symbolPosition: e.target.value as 'before' | 'after' }
                                                                })}
                                                            >
                                                                <option value="before">Before</option>
                                                                <option value="after">After</option>
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="text-xs text-gray-500">Decimals</label>
                                                            <input 
                                                                type="number"
                                                                min="0"
                                                                max="10"
                                                                className="w-full text-xs border-gray-300 rounded"
                                                                value={formatting.config.decimalPlaces}
                                                                onChange={(e) => updateColumnFormatting(col.tableId, col.columnId, {
                                                                    type: 'currency',
                                                                    config: { ...formatting.config, decimalPlaces: parseInt(e.target.value) || 0 }
                                                                })}
                                                            />
                                                        </div>
                                                        <div className="flex items-end">
                                                            <label className="flex items-center space-x-1 text-xs text-gray-600 cursor-pointer">
                                                                <input 
                                                                    type="checkbox"
                                                                    checked={formatting.config.thousandSeparator}
                                                                    onChange={(e) => updateColumnFormatting(col.tableId, col.columnId, {
                                                                        type: 'currency',
                                                                        config: { ...formatting.config, thousandSeparator: e.target.checked }
                                                                    })}
                                                                    className="rounded text-blue-600"
                                                                />
                                                                <span>Thousands</span>
                                                            </label>
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                {/* Boolean Formatting */}
                                                {colType === 'boolean' && formatting.type === 'boolean' && (
                                                    <select 
                                                        className="w-full text-xs border-gray-300 rounded"
                                                        value={formatting.config.style}
                                                        onChange={(e) => updateColumnFormatting(col.tableId, col.columnId, {
                                                            type: 'boolean',
                                                            config: { style: e.target.value as any }
                                                        })}
                                                    >
                                                        <option value="true/false">true / false</option>
                                                        <option value="yes/no">Yes / No</option>
                                                        <option value="1/0">1 / 0</option>
                                                        <option value="check/x">✓ / ✗</option>
                                                        <option value="enabled/disabled">Enabled / Disabled</option>
                                                    </select>
                                                )}
                                                
                                                {/* String Formatting */}
                                                {colType === 'string' && formatting.type === 'string' && (
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <label className="text-xs text-gray-500">Case</label>
                                                            <select 
                                                                className="w-full text-xs border-gray-300 rounded"
                                                                value={formatting.config.case || 'none'}
                                                                onChange={(e) => updateColumnFormatting(col.tableId, col.columnId, {
                                                                    type: 'string',
                                                                    config: { ...formatting.config, case: e.target.value as any }
                                                                })}
                                                            >
                                                                <option value="none">No Change</option>
                                                                <option value="uppercase">UPPERCASE</option>
                                                                <option value="lowercase">lowercase</option>
                                                                <option value="capitalize">Capitalize</option>
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="text-xs text-gray-500">Max Length</label>
                                                            <input 
                                                                type="number"
                                                                min="0"
                                                                placeholder="No limit"
                                                                className="w-full text-xs border-gray-300 rounded"
                                                                value={formatting.config.truncate || ''}
                                                                onChange={(e) => updateColumnFormatting(col.tableId, col.columnId, {
                                                                    type: 'string',
                                                                    config: { ...formatting.config, truncate: e.target.value ? parseInt(e.target.value) : undefined }
                                                                })}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
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
                                {config.filters.map((filter, idx) => {
                                    const columnType = getColumnType(filter.tableId, filter.columnId);
                                    const operators = getOperatorsForType(columnType);
                                    const needsValueInput = !['is_null', 'is_not_null', 'is_empty', 'is_not_empty', 'today', 'this_week', 'this_month', 'this_year'].includes(filter.operator);
                                    const needsTwoValues = filter.operator === 'between';
                                    
                                    return (
                                    <div key={filter.id} className="p-3 bg-gray-50 rounded-md border border-gray-200 space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-semibold text-gray-500">Filter #{idx + 1}</span>
                                            <div className="flex items-center space-x-2">
                                                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">{columnType}</span>
                                                <button onClick={() => removeFilter(idx)} className="text-red-500 hover:text-red-700"><Trash2 className="w-3 h-3" /></button>
                                            </div>
                                        </div>
                                        
                                        {/* Column Selection */}
                                        <select 
                                            className="w-full text-sm border-gray-300 rounded-md"
                                            value={filter.columnId}
                                            onChange={(e) => {
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
                                        
                                        {/* Operator Selection */}
                                        <div className={needsValueInput ? "flex space-x-2" : ""}>
                                            <select 
                                                className={`text-sm border-gray-300 rounded-md ${needsValueInput ? 'w-1/3' : 'w-full'}`}
                                                value={filter.operator}
                                                onChange={(e) => updateFilter(idx, 'operator', e.target.value)}
                                            >
                                                {operators.map(op => (
                                                    <option key={op.value} value={op.value}>{op.label}</option>
                                                ))}
                                            </select>
                                            
                                            {/* Value Input - Type-specific */}
                                            {needsValueInput && (
                                                <>
                                                    {columnType === 'date' && (
                                                        <input 
                                                            type="date"
                                                            className="w-2/3 text-sm border-gray-300 rounded-md p-1"
                                                            value={filter.value}
                                                            onChange={(e) => updateFilter(idx, 'value', e.target.value)}
                                                        />
                                                    )}
                                                    {(columnType === 'number' || columnType === 'currency') && (
                                                        <input 
                                                            type="number"
                                                            className="w-2/3 text-sm border-gray-300 rounded-md p-1"
                                                            placeholder={columnType === 'currency' ? 'Amount...' : 'Number...'}
                                                            value={filter.value}
                                                            onChange={(e) => updateFilter(idx, 'value', e.target.value)}
                                                            step={columnType === 'currency' ? '0.01' : 'any'}
                                                        />
                                                    )}
                                                    {columnType === 'boolean' && (
                                                        <select
                                                            className="w-2/3 text-sm border-gray-300 rounded-md p-1"
                                                            value={filter.value}
                                                            onChange={(e) => updateFilter(idx, 'value', e.target.value)}
                                                        >
                                                            <option value="true">True</option>
                                                            <option value="false">False</option>
                                                        </select>
                                                    )}
                                                    {columnType === 'string' && (
                                                        <input 
                                                            type="text"
                                                            className="w-2/3 text-sm border-gray-300 rounded-md p-1"
                                                            placeholder={filter.operator === 'in' ? 'value1,value2,value3...' : 'Value...'}
                                                            value={filter.value}
                                                            onChange={(e) => updateFilter(idx, 'value', e.target.value)}
                                                        />
                                                    )}
                                                </>
                                            )}
                                        </div>
                                        
                                        {/* Second value for BETWEEN operator */}
                                        {needsTwoValues && (
                                            <div className="flex items-center space-x-2">
                                                <span className="text-xs text-gray-500">and</span>
                                                {columnType === 'date' && (
                                                    <input 
                                                        type="date"
                                                        className="flex-1 text-sm border-gray-300 rounded-md p-1"
                                                        value={filter.value2 || ''}
                                                        onChange={(e) => {
                                                            const newFilters = [...config.filters];
                                                            newFilters[idx] = { ...newFilters[idx], value2: e.target.value };
                                                            setConfig({...config, filters: newFilters});
                                                        }}
                                                    />
                                                )}
                                                {(columnType === 'number' || columnType === 'currency') && (
                                                    <input 
                                                        type="number"
                                                        className="flex-1 text-sm border-gray-300 rounded-md p-1"
                                                        placeholder="Upper bound..."
                                                        value={filter.value2 || ''}
                                                        onChange={(e) => {
                                                            const newFilters = [...config.filters];
                                                            newFilters[idx] = { ...newFilters[idx], value2: e.target.value };
                                                            setConfig({...config, filters: newFilters});
                                                        }}
                                                        step={columnType === 'currency' ? '0.01' : 'any'}
                                                    />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )})}
                                {config.filters.length === 0 && <p className="text-sm text-gray-500 italic">No filters defined. Add filters to refine your report data.</p>}
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