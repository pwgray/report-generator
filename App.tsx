import React, { useState, useEffect } from 'react';
import { DataSource, ReportConfig, User } from './types';
import { DataSourceView } from './components/DataSourceView';
import { ReportBuilder } from './components/ReportBuilder';
import { ReportViewer } from './components/ReportViewer';
import { listDatasources, createDatasource, updateDatasource, deleteDatasource } from './services/datasourceService';
import { listReports, createReport, updateReport, deleteReport } from './services/reportService';
import { LayoutDashboard, Database, FileText, Settings, Plus, BarChart3, Users, LogOut, Lock, Globe } from 'lucide-react';

const MOCK_USERS: User[] = [
    { id: 'u1', name: 'Alice Admin', email: 'alice@dataflow.com', role: 'admin' },
    { id: 'u2', name: 'Bob Analyst', email: 'bob@dataflow.com', role: 'user' },
    { id: 'u3', name: 'Charlie Viewer', email: 'charlie@dataflow.com', role: 'user' },
];

const App = () => {
  // Navigation State
  const [currentView, setCurrentView] = useState<'dashboard' | 'datasources' | 'reports' | 'builder' | 'viewer'>('dashboard');
  
  // User State
  const [currentUser, setCurrentUser] = useState<User>(MOCK_USERS[0]);

  // Data State (fetch from backend)
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [reports, setReports] = useState<ReportConfig[]>([]);

  // Report Filter Tab State
  const [reportFilter, setReportFilter] = useState<'all' | 'mine'>('all');

  // Load datasources and reports from backend on mount
  useEffect(() => {
      (async () => {
          // Load datasources
          try {
              const dsList = await listDatasources();
              setDataSources(dsList);
              console.debug('[App] loaded datasources from API', { count: dsList.length });
          } catch (e) {
              console.error('[App] failed to load datasources from API', e);
              alert('Failed to load datasources. Please ensure the server is running.');
          }

          // Load reports
          try {
              const reportsList = await listReports();
              setReports(reportsList);
              console.debug('[App] loaded reports from API', { count: reportsList.length });
          } catch (e) {
              console.error('[App] failed to load reports from API', e);
              alert('Failed to load reports. Please ensure the server is running.');
          }
      })();
  }, []);


  // Selection State
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  // Handlers
  const handleAddDataSource = async (ds: DataSource) => {
      try {
          const saved = await createDatasource(ds);
          setDataSources(prev => [...prev, saved]);
          return saved;
      } catch (e) {
          console.error('[App] create datasource failed', e);
          alert('Failed to persist datasource to server.');
          throw e;
      }
  };

  const handleUpdateDataSource = async (ds: DataSource) => {
      try {
          const updated = await updateDatasource(ds.id, ds);
          setDataSources(prev => prev.map(d => d.id === updated.id ? updated : d));
          return updated;
      } catch (e) {
          console.error('[App] update datasource failed', e);
          alert('Failed to update datasource on server.');
          throw e;
      }
  };

  const handleDeleteDataSource = async (id: string) => {
      try {
          await deleteDatasource(id);
          setDataSources(prev => prev.filter(d => d.id !== id));
      } catch (e) {
          console.error('[App] delete datasource failed', e);
          alert('Failed to delete datasource on server.');
          throw e;
      }
  };

  const handleSaveReport = async (report: ReportConfig) => {
    // If it's a new report or I am the owner, I can save
    const existing = reports.find(r => r.id === report.id);
    
    // Safety check (should be handled by UI visibility)
    if (existing && existing.ownerId !== currentUser.id && currentUser.role !== 'admin') {
        alert("You do not have permission to modify this report.");
        return;
    }

    const reportToSave = {
        ...report,
        ownerId: existing ? existing.ownerId : currentUser.id, // Ensure owner persists or is set
        created_at: existing ? existing.created_at : new Date().toISOString()
    };

    try {
        if (existing) {
            const updated = await updateReport(report.id, reportToSave);
            setReports(reports.map(r => r.id === report.id ? updated : r));
        } else {
            const created = await createReport(reportToSave);
            setReports([...reports, created]);
        }
        setCurrentView('reports');
    } catch (e) {
        console.error('[App] save report failed', e);
        alert('Failed to save report to server.');
        throw e;
    }
  };

  const handleViewReport = (id: string) => {
    setSelectedReportId(id);
    setCurrentView('viewer');
  };

  const handleEditReport = (id: string) => {
      setSelectedReportId(id);
      setCurrentView('builder');
  };

  const handleDeleteReport = async (id: string) => {
      const report = reports.find(r => r.id === id);
      if (report && (report.ownerId === currentUser.id || currentUser.role === 'admin')) {
          if (confirm('Are you sure you want to delete this report?')) {
            try {
                await deleteReport(id);
                setReports(reports.filter(r => r.id !== id));
            } catch (e) {
                console.error('[App] delete report failed', e);
                alert('Failed to delete report from server.');
                throw e;
            }
          }
      } else {
          alert('You do not have permission to delete this report.');
      }
  };

  // Helper to check if user can modify a report
  const canModifyReport = (report: ReportConfig) => {
      return report.ownerId === currentUser.id || currentUser.role === 'admin';
  };

  // Render Views
  const renderContent = () => {
    switch(currentView) {
      case 'dashboard':
        const myReports = reports.filter(r => r.ownerId === currentUser.id);
        const scheduled = reports.filter(r => r.schedule.enabled);

        return (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-3xl font-bold text-gray-800">Welcome, {currentUser.name.split(' ')[0]}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-700">My Reports</h3>
                        <FileText className="text-blue-500 w-6 h-6" />
                    </div>
                    <p className="text-4xl font-bold text-gray-900">{myReports.length}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-700">Data Sources</h3>
                        <Database className="text-green-500 w-6 h-6" />
                    </div>
                    <p className="text-4xl font-bold text-gray-900">{dataSources.length}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-700">Scheduled Jobs</h3>
                        <Settings className="text-purple-500 w-6 h-6" />
                    </div>
                    <p className="text-4xl font-bold text-gray-900">{scheduled.length}</p>
                </div>
            </div>

            <div className="mt-8">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Recent Reports</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {reports
                        .filter(r => r.visibility === 'public' || r.ownerId === currentUser.id)
                        .slice(0, 3)
                        .map(r => (
                         <div key={r.id} onClick={() => handleViewReport(r.id)} className="bg-white p-4 rounded-lg border border-gray-200 cursor-pointer hover:shadow-md transition-all">
                             <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-blue-50 rounded">
                                        <BarChart3 className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <span className="font-medium text-gray-900">{r.name}</span>
                                </div>
                                {r.visibility === 'private' ? <Lock className="w-3 h-3 text-gray-400" /> : <Globe className="w-3 h-3 text-gray-400" />}
                             </div>
                             <p className="text-xs text-gray-500 line-clamp-2">{r.description || 'No description'}</p>
                         </div>
                    ))}
                    {reports.length === 0 && (
                        <div className="col-span-full py-8 text-center text-gray-500 italic">No recent reports found.</div>
                    )}
                </div>
            </div>
          </div>
        );
      case 'datasources':
        return <DataSourceView 
            dataSources={dataSources} 
            onAdd={handleAddDataSource} 
            onUpdate={handleUpdateDataSource} 
            onDelete={handleDeleteDataSource} 
            isReadOnly={currentUser.role !== 'admin'}
        />;
      case 'builder':
        return <ReportBuilder 
            dataSources={dataSources} 
            onSave={handleSaveReport} 
            onCancel={() => setCurrentView('reports')} 
            initialReport={selectedReportId ? reports.find(r => r.id === selectedReportId) : undefined}
        />;
      case 'viewer':
          const r = reports.find(r => r.id === selectedReportId);
          if (!r) return <div>Report not found</div>;

          const handleSaveDataSourceFromViewer = async (ds: DataSource) => {
              // Persist the ephemeral datasource via API and attach to the current report
              try {
                  const toSave = {
                      ...ds,
                      name: ds.name || 'Untitled Source',
                      description: ds.description || '',
                      type: (ds.type as any) || 'postgres',
                      tables: ds.tables || [],
                      created_at: new Date().toISOString()
                  } as DataSource;

                  const saved = await handleAddDataSource(toSave as DataSource);
                  if (saved && saved.id) {
                      setReports(prev => prev.map(rep => rep.id === r.id ? { ...rep, dataSourceId: saved.id } : rep));
                  }
              } catch (e) {
                  console.error('Failed to save datasource from viewer', e);
                  alert('Failed to persist datasource to the server.');
              }
          };

          return <ReportViewer report={r} dataSource={dataSources.find(d => d.id === r.dataSourceId)} onBack={() => setCurrentView('reports')} onSaveDataSource={handleSaveDataSourceFromViewer} />;
      case 'reports':
      default:
        // Filter logic
        const filteredReports = reports.filter(r => {
            if (reportFilter === 'mine') return r.ownerId === currentUser.id;
            // 'all' means all public + my private
            return r.visibility === 'public' || r.ownerId === currentUser.id;
        });

        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-800">Reports</h2>
                    <button 
                        onClick={() => { setSelectedReportId(null); setCurrentView('builder'); }}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        <Plus className="w-4 h-4 mr-2" /> Create Report
                    </button>
                </div>

                {/* Filter Tabs */}
                <div className="flex border-b border-gray-200 space-x-6">
                    <button 
                        onClick={() => setReportFilter('all')}
                        className={`pb-3 text-sm font-medium ${reportFilter === 'all' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        All Shared Reports
                    </button>
                    <button 
                        onClick={() => setReportFilter('mine')}
                        className={`pb-3 text-sm font-medium ${reportFilter === 'mine' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        My Reports
                    </button>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Access</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Schedule</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredReports.map(report => {
                                const ds = dataSources.find(d => d.id === report.dataSourceId);
                                const owner = MOCK_USERS.find(u => u.id === report.ownerId);
                                const canEdit = canModifyReport(report);
                                
                                return (
                                    <tr key={report.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap cursor-pointer" onClick={() => handleViewReport(report.id)}>
                                            <div className="font-medium text-gray-900">{report.name}</div>
                                            <div className="text-xs text-gray-500">{ds?.name || 'Unknown Source'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {report.ownerId === currentUser.id ? <span className="text-blue-600 font-medium">Me</span> : (owner?.name || 'Unknown')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {report.visibility === 'public' ? 
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800"><Globe className="w-3 h-3 mr-1"/> Public</span> : 
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"><Lock className="w-3 h-3 mr-1"/> Private</span>
                                            }
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {report.schedule.enabled ? <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">{report.schedule.frequency}</span> : <span className="text-gray-400">-</span>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button onClick={() => handleViewReport(report.id)} className="text-blue-600 hover:text-blue-900 mr-3">Run</button>
                                            {canEdit && (
                                                <>
                                                    <button onClick={() => handleEditReport(report.id)} className="text-gray-600 hover:text-gray-900 mr-3">Edit</button>
                                                    <button onClick={() => handleDeleteReport(report.id)} className="text-red-600 hover:text-red-900">Delete</button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                            {filteredReports.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center text-gray-500">No reports found in this view.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-gray-100">
            <h1 className="text-xl font-bold text-blue-600 flex items-center">
                <BarChart3 className="w-6 h-6 mr-2" /> DataFlow
            </h1>
        </div>
        
        {/* User Switcher (Mock Auth) */}
        <div className="px-4 pt-4">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Switch User</label>
            <div className="relative">
                <select 
                    value={currentUser.id}
                    onChange={(e) => {
                        const user = MOCK_USERS.find(u => u.id === e.target.value);
                        if(user) setCurrentUser(user);
                    }}
                    className="w-full appearance-none bg-gray-50 border border-gray-200 text-gray-700 py-2 px-3 pr-8 rounded leading-tight focus:outline-none focus:bg-white focus:border-gray-500 text-sm"
                >
                    {MOCK_USERS.map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <Users className="h-4 w-4" />
                </div>
            </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 mt-2">
            <button onClick={() => setCurrentView('dashboard')} className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg ${currentView === 'dashboard' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                <LayoutDashboard className="w-5 h-5 mr-3" /> Dashboard
            </button>
            <button onClick={() => setCurrentView('datasources')} className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg ${currentView === 'datasources' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                <Database className="w-5 h-5 mr-3" /> Data Sources
            </button>
            <button onClick={() => setCurrentView('reports')} className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg ${currentView === 'reports' || currentView === 'builder' || currentView === 'viewer' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                <FileText className="w-5 h-5 mr-3" /> Reports
            </button>
        </nav>
        <div className="p-4 border-t border-gray-100">
            <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                    {currentUser.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="ml-3 overflow-hidden">
                    <p className="text-sm font-medium text-gray-700 truncate">{currentUser.name}</p>
                    <p className="text-xs text-gray-500 truncate">{currentUser.role === 'admin' ? 'Administrator' : 'Standard User'}</p>
                </div>
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-7xl mx-auto">
            {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;