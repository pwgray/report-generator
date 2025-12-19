import React, { useEffect, useState } from 'react';
import { DataSource, ReportConfig } from '../types';
import { generateReportData } from '../services/geminiService';
import { fetchTableData } from '../services/datasourceService';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Button, Card } from './UIComponents';
import { ArrowLeft, RefreshCw, Calendar, Download } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

interface ReportViewerProps {
  report: ReportConfig;
  dataSource?: DataSource;
  onBack: () => void;
  onSaveDataSource?: (ds: DataSource) => Promise<any>;
}

export const ReportViewer: React.FC<ReportViewerProps> = ({ report, dataSource, onBack, onSaveDataSource }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);
  const [dataOrigin, setDataOrigin] = useState<'live' | 'ai' | null>(null);
  const [recordsCount, setRecordsCount] = useState<number | null>(null);
  const [executionMs, setExecutionMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setRecordsCount(null);
    setExecutionMs(null);

    const start = performance.now();

    try {
        console.log('[ReportViewer] Starting fetchData');
        console.log('[ReportViewer] DataSource:', dataSource ? { id: dataSource.id, name: dataSource.name, type: dataSource.type, tablesCount: (dataSource.tables || []).length, viewsCount: (dataSource.views || []).length } : 'NO DATASOURCE');
        console.log('[ReportViewer] Report:', { id: report.id, name: report.name, selectedColumnsCount: report.selectedColumns?.length || 0 });
        
        // If datasource is an AI datasource (custom), use AI only
        const isAiDatasource = dataSource?.type === 'custom';

        if (isAiDatasource) {
            // Use AI-generated data only
            const result = await generateReportData(dataSource!, report, 100);
            setData(result || []);
            setDataOrigin('ai');
            setLastRun(new Date());
            setRecordsCount((result || []).length);
            setExecutionMs(Math.round(performance.now() - start));
            return;
        }

        // For non-AI datasources, require live data only
        if (!dataSource) {
            setError('No data source configured for this report.');
            setData([]);
            return;
        }

        if (!report.selectedColumns || report.selectedColumns.length === 0) {
            setError('No columns selected for this report.');
            setData([]);
            return;
        }

        const tableIds = Array.from(new Set(report.selectedColumns.map(c => c.tableId)));
        console.log('[ReportViewer] Detected table/view IDs:', tableIds);
        console.log('[ReportViewer] Selected columns:', report.selectedColumns);
        
        // Group columns by tableId to see which columns belong to which ID
        const columnsByTableId = report.selectedColumns.reduce((acc, col) => {
            if (!acc[col.tableId]) acc[col.tableId] = [];
            acc[col.tableId].push(col.columnId);
            return acc;
        }, {} as Record<string, string[]>);
        console.log('[ReportViewer] Columns grouped by table/view ID:', columnsByTableId);
        
        if (tableIds.length !== 1) {
            console.error('[ReportViewer] Multiple tables/views detected:', tableIds);
            
            // Check if all IDs point to the same view (by name)
            const allTableViewNames = tableIds.map(id => {
                let item = (dataSource.tables || []).find(t => t.id === id);
                if (!item) item = (dataSource.views || []).find(v => v.id === id);
                return item ? item.name : 'UNKNOWN';
            });
            console.log('[ReportViewer] Table/View names for these IDs:', allTableViewNames);
            
            // If all names are the same, it's a duplicate ID issue - try to fix it
            const uniqueNames = Array.from(new Set(allTableViewNames));
            if (uniqueNames.length === 1 && uniqueNames[0] !== 'UNKNOWN') {
                console.warn('[ReportViewer] All columns are from the same view but have different IDs. Attempting to use the first valid ID...');
                // Continue with just the first ID - we'll handle this below
            } else {
                setError(`Live data fetch supports reports which select columns from a single table or view only. Found ${tableIds.length} different sources: ${allTableViewNames.join(', ')}`);
                setData([]);
                return;
            }
        }

        console.log('[ReportViewer] Available tables:', (dataSource.tables || []).map(t => ({ id: t.id, name: t.name })));
        console.log('[ReportViewer] Available views:', (dataSource.views || []).map(v => ({ id: v.id, name: v.name })));
        
        // Try to find the table/view using any of the IDs (in case of duplicate IDs from same view)
        let table = null;
        let isView = false;
        let foundTableId = null;
        
        for (const tableId of tableIds) {
            console.log('[ReportViewer] Looking for table/view with ID:', tableId);
            table = (dataSource.tables || []).find(t => t.id === tableId || t.name === tableId);
            if (!table) {
                table = (dataSource.views || []).find(v => v.id === tableId || v.name === tableId);
                isView = !!table;
            }
            if (table) {
                foundTableId = tableId;
                console.log('[ReportViewer] Found table/view:', { id: table.id, name: table.name, isView });
                break;
            }
        }
        
        if (!table || table.exposed === false) {
            setError(`Target ${isView ? 'view' : 'table'} not found or not exposed in datasource. Looking for IDs: ${tableIds.join(', ')}`);
            setData([]);
            return;
        }

        // Resolve column names
        const cols: string[] = [];
        for (const rc of report.selectedColumns) {
            const col = (table.columns || []).find((cc: any) => cc.id === rc.columnId || cc.name === rc.columnId);
            if (!col) {
                console.warn(`[ReportViewer] Column ${rc.columnId} not found on ${isView ? 'view' : 'table'} ${table.name} (trying by column name)`);
                // Try to find by column name from the report
                const colByName = (table.columns || []).find((cc: any) => cc.name === rc.columnId);
                if (colByName) {
                    console.log(`[ReportViewer] Found column by name: ${colByName.name}`);
                    cols.push(colByName.name);
                    continue;
                }
                setError(`Column ${rc.columnId} not found on ${isView ? 'view' : 'table'} ${table.name}.`);
                setData([]);
                return;
            }
            cols.push(col.name);
        }
        
        console.log('[ReportViewer] Resolved column names:', cols);

        // Prepare filters for backend
        const filters = report.filters || [];
        console.log('[ReportViewer] Applying filters:', filters);

        // Execute live fetch
        // Always send the full datasource object so the server can run ad-hoc queries
        const dsArg = dataSource;
        const rows = await fetchTableData(dsArg, table.name, cols, 1000000, filters);
        setData(rows || []);
        setDataOrigin('live');
        setLastRun(new Date());
        setRecordsCount((rows || []).length);
        setExecutionMs(Math.round(performance.now() - start));

    } catch (err) {
        console.error('Live fetch failed', (err as any)?.message || err);
        setError('Failed to fetch live data for this report.');
        setData([]);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [report.id, dataSource?.id]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  // Helper to find numeric key for charts
  const getNumericKey = () => {
      if (data.length === 0) return '';
      const keys = Object.keys(data[0]);
      // Heuristic: find key with number values
      return keys.find(k => typeof data[0][k] === 'number') || keys[1] || keys[0];
  };

  const getLabelKey = () => {
      if (data.length === 0) return '';
      const keys = Object.keys(data[0]);
      return keys.find(k => typeof data[0][k] === 'string') || keys[0];
  };

  // Map a raw field name to a human-friendly alias using report/datasource metadata when available
  const getAliasForField = (fieldName: string) => {
      // If AI returned a dotted key like `table.column`, use the suffix
      const simpleName = fieldName.includes('.') ? fieldName.split('.').pop() as string : fieldName;

      // Prefer report-level alias (report.selectedColumns may include alias)
      const reportCol = report.selectedColumns?.find(rc => rc.columnId === simpleName || rc.columnId === fieldName);
      if (reportCol?.alias) return reportCol.alias;

      // Search the current datasource schema (tables and views)
      const tableIds = Array.from(new Set(report.selectedColumns.map(c => c.tableId)));
      const tableId = tableIds.length === 1 ? tableIds[0] : undefined;
      let table = dataSource && tableId ? (dataSource.tables || []).find(t => t.id === tableId || t.name === tableId) : undefined;
      if (!table && dataSource && tableId) {
          table = (dataSource.views || []).find(v => v.id === tableId || v.name === tableId);
      }
      if (table) {
          const col = (table.columns || []).find((cc: any) => cc.name === simpleName || cc.id === simpleName || (`${table.name}.${cc.name}`) === fieldName);
          if (col && col.alias) return col.alias;
      }

      // Fallback to the original simple name (or full fieldName if that makes sense)
      return simpleName || fieldName;
  };

  const numericKey = getNumericKey();
  const labelKey = getLabelKey();

  // Whether the datasource is ephemeral (unsaved) - used to show a UI hint
  const isEphemeral = !!dataSource && !dataSource.id;

  // Export data to Excel
  const handleExportToExcel = () => {
    if (!data || data.length === 0) {
      alert('No data available to export');
      return;
    }

    try {
      // Prepare data with human-friendly column names
      const exportData = data.map(row => {
        const formattedRow: any = {};
        Object.keys(row).forEach(key => {
          const alias = getAliasForField(key);
          const value = row[key];
          // Handle different data types
          if (typeof value === 'object' && value !== null) {
            formattedRow[alias] = JSON.stringify(value);
          } else if (value === null || value === undefined) {
            formattedRow[alias] = '';
          } else {
            formattedRow[alias] = value;
          }
        });
        return formattedRow;
      });

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Auto-size columns (approximate)
      const colWidths = Object.keys(exportData[0] || {}).map(key => {
        const maxLength = Math.max(
          key.length,
          ...exportData.slice(0, 100).map(row => String(row[key] || '').length)
        );
        return { wch: Math.min(maxLength + 2, 50) }; // Cap at 50 characters
      });
      ws['!cols'] = colWidths;

      // Add worksheet to workbook
      const sheetName = report.name.substring(0, 31).replace(/[\\/?*[\]]/g, '_'); // Excel sheet name limit
      XLSX.utils.book_append_sheet(wb, ws, sheetName);

      // Generate filename with timestamp
      const timestamp = format(new Date(), 'yyyy-MM-dd_HHmmss');
      const filename = `${report.name.replace(/[\\/?*[\]]/g, '_')}_${timestamp}.xlsx`;

      // Download file
      XLSX.writeFile(wb, filename);

      console.log(`[ReportViewer] Exported ${exportData.length} rows to ${filename}`);
    } catch (error) {
      console.error('[ReportViewer] Export failed', error);
      alert('Failed to export data. Please try again.');
    }
  };

  const renderVisuals = () => {
      if (loading) return <div className="h-96 flex items-center justify-center">{dataOrigin === 'ai' ? 'Generating Report Data...' : 'Fetching Live Data...'}</div>;
      if (data.length === 0) return <div className="h-96 flex items-center justify-center text-gray-500">{error ? error : 'No Data Available'}</div>;

      switch(report.visualization) {
          case 'bar':
              return (
                  <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={data} margin={{top: 20, right: 30, left: 20, bottom: 5}}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey={labelKey} label={{ value: getAliasForField(labelKey), position: 'bottom' }} />
                          <YAxis label={{ value: getAliasForField(numericKey), angle: -90, position: 'insideLeft' }} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey={numericKey} fill="#3b82f6" />
                      </BarChart>
                  </ResponsiveContainer>
              );
          case 'line':
              return (
                  <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={data} margin={{top: 20, right: 30, left: 20, bottom: 5}}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey={labelKey} label={{ value: getAliasForField(labelKey), position: 'bottom' }} />
                          <YAxis label={{ value: getAliasForField(numericKey), angle: -90, position: 'insideLeft' }} />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey={numericKey} stroke="#3b82f6" activeDot={{ r: 8 }} />
                      </LineChart>
                  </ResponsiveContainer>
              );
          case 'pie':
                return (
                    <ResponsiveContainer width="100%" height={400}>
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${getAliasForField(String(name))}: ${(percent * 100).toFixed(0)}%`}
                                outerRadius={150}
                                fill="#8884d8"
                                dataKey={numericKey}
                                nameKey={labelKey}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                );
          default: // table
              return (
                <div className="overflow-x-auto custom-scrollbar border rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                {Object.keys(data[0] || {}).map(key => (
                                    <th key={key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        {getAliasForField(key)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {data.map((row, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                    {Object.values(row).map((val: any, i) => (
                                        <td key={i} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
              );
      }
  };

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
                <Button variant="ghost" onClick={onBack}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">{report.name}</h2>
                    <p className="text-sm text-gray-500 flex items-center space-x-3">
                        <span className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          Last run: {lastRun ? format(lastRun, 'MMM d, yyyy HH:mm:ss') : 'Never'}
                        </span>
                        <span className="text-sm text-gray-500">Rows: {recordsCount ?? '-'}</span>
                        <span className="text-sm text-gray-500">Exec: {executionMs !== null ? `${executionMs} ms` : '-'}</span>
                        {dataOrigin && (
                            <span className="ml-3 text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">{dataOrigin === 'live' ? 'Live' : 'AI'}</span>
                        )}
                        {dataSource && (
                            <>
                              <span
                                  title={isEphemeral ? 'Unsaved (ephemeral) datasource' : 'Saved datasource'}
                                  className={`ml-3 text-xs px-2 py-1 rounded ${isEphemeral ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-700'}`}
                              >
                                  {isEphemeral ? 'Unsaved' : 'Saved'}
                              </span>
                              {isEphemeral && onSaveDataSource && (
                                  <button
                                      onClick={async (e) => {
                                          e.preventDefault();
                                          try {
                                              setLoading(true);
                                              await onSaveDataSource(dataSource);
                                              alert('Datasource saved');
                                          } catch (e) {
                                              console.error('Failed to save datasource', e);
                                              alert('Failed to save datasource');
                                          } finally {
                                              setLoading(false);
                                          }
                                      } }
                                      className="ml-3 inline-flex items-center px-3 py-1 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700"
                                  >
                                      Save Datasource
                                  </button>
                              )}
                            </>
                        )}
                    </p>
                </div>
            </div>
            <div className="flex space-x-2">
                <Button variant="outline" onClick={fetchData} loading={loading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
                </Button>
                <Button 
                    variant="secondary" 
                    onClick={handleExportToExcel}
                    disabled={!data || data.length === 0 || loading}
                >
                    <Download className="w-4 h-4 mr-2" /> Export to Excel
                </Button>
            </div>
        </div>

        {report.visualization !== 'table' && (
             <Card>
                <div className="p-6">
                    <h3 className="text-lg font-medium mb-4">Visual Analysis</h3>
                    {renderVisuals()}
                </div>
            </Card>
        )}

        <Card>
            <div className="p-6">
                 <h3 className="text-lg font-medium mb-4">Source Data</h3>
                 {report.visualization === 'table' ? renderVisuals() : (
                      <div className="overflow-x-auto custom-scrollbar border rounded-lg max-h-96">
                      <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                              <tr>
                                  {Object.keys(data[0] || {}).map(key => (
                                      <th key={key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50">
                                          {getAliasForField(key)}
                                      </th>
                                  ))}
                              </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                              {data.map((row, idx) => (
                                  <tr key={idx} className="hover:bg-gray-50">
                                      {Object.values(row).map((val: any, i) => (
                                          <td key={i} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                              {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                          </td>
                                      ))}
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
                 )}
            </div>
        </Card>
    </div>
  );
};
