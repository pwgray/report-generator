import React, { useEffect, useState } from 'react';
import { DataSource, ReportConfig } from '../types';
import { generateReportData } from '../services/geminiService';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Button, Card } from './UIComponents';
import { ArrowLeft, RefreshCw, Calendar, Download } from 'lucide-react';
import { format } from 'date-fns';

interface ReportViewerProps {
  report: ReportConfig;
  dataSource?: DataSource;
  onBack: () => void;
}

export const ReportViewer: React.FC<ReportViewerProps> = ({ report, dataSource, onBack }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  const fetchData = async () => {
    if (!dataSource) return;
    setLoading(true);
    try {
        const result = await generateReportData(dataSource, report);
        setData(result);
        setLastRun(new Date());
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [report.id]);

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

  const numericKey = getNumericKey();
  const labelKey = getLabelKey();

  const renderVisuals = () => {
      if (loading) return <div className="h-96 flex items-center justify-center">Generating Report Data...</div>;
      if (data.length === 0) return <div className="h-96 flex items-center justify-center text-gray-500">No Data Available</div>;

      switch(report.visualization) {
          case 'bar':
              return (
                  <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={data} margin={{top: 20, right: 30, left: 20, bottom: 5}}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey={labelKey} />
                          <YAxis />
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
                          <XAxis dataKey={labelKey} />
                          <YAxis />
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
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
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
                                        {key}
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
                    <p className="text-sm text-gray-500 flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        Last run: {lastRun ? format(lastRun, 'MMM d, yyyy HH:mm:ss') : 'Never'}
                    </p>
                </div>
            </div>
            <div className="flex space-x-2">
                <Button variant="outline" onClick={fetchData} loading={loading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
                </Button>
                <Button variant="secondary">
                    <Download className="w-4 h-4 mr-2" /> Export
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
                                          {key}
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
