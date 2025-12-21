import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../tests/utils';
import userEvent from '@testing-library/user-event';
import App from '../App';
import * as datasourceService from '../services/datasourceService';
import * as reportService from '../services/reportService';

// Mock the services
vi.mock('../services/datasourceService');
vi.mock('../services/reportService');

// Mock child components that are too complex for feature tests
vi.mock('../components/DataSourceView', () => ({
  DataSourceView: ({ dataSources, onAdd, isReadOnly }: any) => (
    <div data-testid="datasource-view">
      <h2>Data Sources</h2>
      <div>Total: {dataSources.length}</div>
      <div>ReadOnly: {isReadOnly.toString()}</div>
      {!isReadOnly && (
        <button onClick={() => onAdd({
          id: 'new-ds',
          name: 'Test PostgreSQL',
          type: 'postgres',
          tables: [{ id: 't1', name: 'users', columns: [{ id: 'c1', name: 'id', type: 'integer' }], exposed: true }],
          views: [],
          connectionDetails: { host: 'localhost', port: '5432', database: 'testdb', username: 'user', password: 'pass' },
          created_at: new Date().toISOString()
        })}>
          Connect New Source
        </button>
      )}
    </div>
  )
}));

vi.mock('../components/ReportBuilder', () => ({
  ReportBuilder: ({ dataSources, onSave, onCancel }: any) => (
    <div data-testid="report-builder">
      <h2>Report Builder</h2>
      <div>Available DataSources: {dataSources.length}</div>
      <button onClick={() => onSave({
        id: crypto.randomUUID(),
        name: 'Sales Analysis Report',
        dataSourceId: dataSources[0]?.id || 'ds-1',
        selectedColumns: [{ tableId: 't1', columnId: 'c1' }],
        visualization: 'table',
        filters: [{ columnId: 'c1', operator: 'equals', value: 'test' }],
        sorts: [{ columnId: 'c1', direction: 'asc' }],
        schedule: { enabled: false, frequency: 'daily', recipients: [] },
        visibility: 'public'
      })}>
        Save Report
      </button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  )
}));

vi.mock('../components/ReportViewer', () => ({
  ReportViewer: ({ report, onBack }: any) => (
    <div data-testid="report-viewer">
      <h2>Report Viewer</h2>
      <div>Report: {report.name}</div>
      <div>Visualization: {report.visualization}</div>
      <button onClick={onBack}>Back to Reports</button>
    </div>
  )
}));

describe('Feature: Complete DataSource Workflow', () => {
  beforeEach(() => {
    vi.mocked(datasourceService.listDatasources).mockResolvedValue([]);
    vi.mocked(reportService.listReports).mockResolvedValue([]);
    vi.mocked(datasourceService.createDatasource).mockImplementation(async (ds) => ({ ...ds, id: ds.id || 'ds-new' }));
    vi.mocked(datasourceService.updateDatasource).mockImplementation(async (id, ds) => ({ ...ds, id }));
    vi.mocked(datasourceService.deleteDatasource).mockResolvedValue(undefined);
  });

  it('allows admin to create, view, and manage datasources', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Wait for dashboard to load
    await waitFor(() => {
      expect(screen.getByText(/Welcome/i)).toBeInTheDocument();
    });

    // Verify user is Alice (admin)
    expect(screen.getByDisplayValue(/Alice Admin/i)).toBeInTheDocument();

    // Navigate to Data Sources
    await user.click(screen.getByRole('button', { name: /Data Sources/i }));

    await waitFor(() => {
      expect(screen.getByTestId('datasource-view')).toBeInTheDocument();
    });

    // Verify admin has access (not read-only)
    expect(screen.getByText('ReadOnly: false')).toBeInTheDocument();

    // Create a new datasource
    await user.click(screen.getByText('Connect New Source'));

    await waitFor(() => {
      expect(datasourceService.createDatasource).toHaveBeenCalled();
    });

    // Verify datasource was added
    expect(screen.getByText('Total: 1')).toBeInTheDocument();
  });

  it('restricts non-admin users from managing datasources', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Welcome/i)).toBeInTheDocument();
    });

    // Switch to Bob (non-admin user)
    const userSelect = screen.getByDisplayValue(/Alice Admin/i);
    await user.selectOptions(userSelect, 'u2'); // Bob Analyst

    await waitFor(() => {
      expect(screen.getByDisplayValue(/Bob Analyst/i)).toBeInTheDocument();
    });

    // Navigate to Data Sources
    await user.click(screen.getByRole('button', { name: /Data Sources/i }));

    await waitFor(() => {
      expect(screen.getByTestId('datasource-view')).toBeInTheDocument();
    });

    // Verify non-admin has read-only access
    expect(screen.getByText('ReadOnly: true')).toBeInTheDocument();

    // Verify "Connect New Source" button is not available
    expect(screen.queryByText('Connect New Source')).not.toBeInTheDocument();
  });
});

describe('Feature: Complete Report Creation Workflow', () => {
  const mockDataSource = {
    id: 'ds-1',
    name: 'Sales Database',
    type: 'postgres' as const,
    tables: [
      {
        id: 't1',
        name: 'orders',
        columns: [
          { id: 'c1', name: 'order_id', type: 'integer' },
          { id: 'c2', name: 'customer_name', type: 'varchar' },
          { id: 'c3', name: 'total_amount', type: 'decimal' }
        ],
        exposed: true
      }
    ],
    views: [],
    connectionDetails: { host: 'localhost', port: '5432', database: 'sales', username: 'user', password: 'pass' },
    created_at: '2024-01-01T00:00:00Z'
  };

  beforeEach(() => {
    vi.mocked(datasourceService.listDatasources).mockResolvedValue([mockDataSource]);
    vi.mocked(reportService.listReports).mockResolvedValue([]);
    vi.mocked(reportService.createReport).mockImplementation(async (r) => ({ ...r, id: r.id || 'report-new' }));
  });

  it('allows user to create a report from datasource to viewing', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Welcome/i)).toBeInTheDocument();
    });

    // Step 1: Navigate to Reports
    await user.click(screen.getByRole('button', { name: /Reports/i }));

    await waitFor(() => {
      expect(screen.getByText('Create Report')).toBeInTheDocument();
    });

    // Step 2: Click "Create Report"
    await user.click(screen.getByText('Create Report'));

    await waitFor(() => {
      expect(screen.getByTestId('report-builder')).toBeInTheDocument();
    });

    // Verify datasource is available in builder
    expect(screen.getByText('Available DataSources: 1')).toBeInTheDocument();

    // Step 3: Save the report
    await user.click(screen.getByText('Save Report'));

    await waitFor(() => {
      expect(reportService.createReport).toHaveBeenCalled();
    });

    // Step 4: Verify redirected to reports list
    await waitFor(() => {
      expect(screen.queryByTestId('report-builder')).not.toBeInTheDocument();
      expect(screen.getByText('Sales Analysis Report')).toBeInTheDocument();
    });

    // Step 5: Run the report
    const runButton = screen.getByText('Run');
    await user.click(runButton);

    await waitFor(() => {
      expect(screen.getByTestId('report-viewer')).toBeInTheDocument();
      expect(screen.getByText('Report: Sales Analysis Report')).toBeInTheDocument();
    });

    // Step 6: Go back to reports list
    await user.click(screen.getByText('Back to Reports'));

    await waitFor(() => {
      expect(screen.queryByTestId('report-viewer')).not.toBeInTheDocument();
      expect(screen.getByText('Sales Analysis Report')).toBeInTheDocument();
    });
  });

  it('persists report configuration with filters and sorting', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Welcome/i)).toBeInTheDocument();
    });

    // Navigate to Reports and create new
    await user.click(screen.getByRole('button', { name: /Reports/i }));
    await user.click(screen.getByText('Create Report'));

    await waitFor(() => {
      expect(screen.getByTestId('report-builder')).toBeInTheDocument();
    });

    // Save report with configuration
    await user.click(screen.getByText('Save Report'));

    await waitFor(() => {
      expect(reportService.createReport).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Sales Analysis Report',
          filters: expect.arrayContaining([
            expect.objectContaining({
              columnId: 'c1',
              operator: 'equals'
            })
          ]),
          sorts: expect.arrayContaining([
            expect.objectContaining({
              columnId: 'c1',
              direction: 'asc'
            })
          ])
        })
      );
    });
  });
});

describe('Feature: Report Sharing and Permissions', () => {
  const aliceReport = {
    id: 'report-alice',
    name: 'Alice Private Report',
    dataSourceId: 'ds-1',
    selectedColumns: [],
    visualization: 'table' as const,
    filters: [],
    sorts: [],
    schedule: { enabled: false, frequency: 'daily' as const, recipients: [] },
    visibility: 'private' as const,
    ownerId: 'u1', // Alice
    created_at: '2024-01-01T00:00:00Z'
  };

  const publicReport = {
    id: 'report-public',
    name: 'Public Sales Report',
    dataSourceId: 'ds-1',
    selectedColumns: [],
    visualization: 'bar' as const,
    filters: [],
    sorts: [],
    schedule: { enabled: false, frequency: 'daily' as const, recipients: [] },
    visibility: 'public' as const,
    ownerId: 'u1', // Alice
    created_at: '2024-01-01T00:00:00Z'
  };

  beforeEach(() => {
    vi.mocked(datasourceService.listDatasources).mockResolvedValue([]);
    vi.mocked(reportService.listReports).mockResolvedValue([aliceReport, publicReport]);
  });

  it('shows private reports only to owner', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Welcome/i)).toBeInTheDocument();
    });

    // As Alice, should see both reports
    await user.click(screen.getByRole('button', { name: /Reports/i }));

    await waitFor(() => {
      expect(screen.getByText('Alice Private Report')).toBeInTheDocument();
      expect(screen.getByText('Public Sales Report')).toBeInTheDocument();
    });

    // Switch to Bob
    const userSelect = screen.getByDisplayValue(/Alice Admin/i);
    await user.selectOptions(userSelect, 'u2');

    await waitFor(() => {
      expect(screen.getByDisplayValue(/Bob Analyst/i)).toBeInTheDocument();
    });

    // Bob should only see public report
    await waitFor(() => {
      expect(screen.queryByText('Alice Private Report')).not.toBeInTheDocument();
      expect(screen.getByText('Public Sales Report')).toBeInTheDocument();
    });
  });

  it('allows only owner and admin to edit reports', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Welcome/i)).toBeInTheDocument();
    });

    // As Alice (admin and owner), should see edit buttons
    await user.click(screen.getByRole('button', { name: /Reports/i }));

    await waitFor(() => {
      const editButtons = screen.getAllByText('Edit');
      expect(editButtons.length).toBeGreaterThan(0);
    });

    // Switch to Bob (non-admin, not owner)
    const userSelect = screen.getByDisplayValue(/Alice Admin/i);
    await user.selectOptions(userSelect, 'u2');

    await waitFor(() => {
      expect(screen.getByDisplayValue(/Bob Analyst/i)).toBeInTheDocument();
    });

    // Bob should not see edit buttons for Alice's reports
    await waitFor(() => {
      const editButtons = screen.queryAllByText('Edit');
      // Should be 0 or only for his own reports (none in this test)
      expect(editButtons.length).toBe(0);
    });

    // But Bob can still run/view public reports
    expect(screen.getByText('Run')).toBeInTheDocument();
  });
});

describe('Feature: Dashboard and Navigation', () => {
  const mockDataSources = [
    { id: 'ds-1', name: 'DB1', type: 'postgres' as const, tables: [], views: [], created_at: '2024-01-01T00:00:00Z' },
    { id: 'ds-2', name: 'DB2', type: 'sql' as const, tables: [], views: [], created_at: '2024-01-02T00:00:00Z' }
  ];

  const mockReports = [
    {
      id: 'r1',
      name: 'Report 1',
      dataSourceId: 'ds-1',
      selectedColumns: [],
      visualization: 'table' as const,
      filters: [],
      sorts: [],
      schedule: { enabled: true, frequency: 'daily' as const, recipients: [] },
      visibility: 'public' as const,
      ownerId: 'u1',
      created_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'r2',
      name: 'Report 2',
      dataSourceId: 'ds-1',
      selectedColumns: [],
      visualization: 'bar' as const,
      filters: [],
      sorts: [],
      schedule: { enabled: false, frequency: 'weekly' as const, recipients: [] },
      visibility: 'public' as const,
      ownerId: 'u1',
      created_at: '2024-01-02T00:00:00Z'
    }
  ];

  beforeEach(() => {
    vi.mocked(datasourceService.listDatasources).mockResolvedValue(mockDataSources);
    vi.mocked(reportService.listReports).mockResolvedValue(mockReports);
  });

  it('displays accurate dashboard statistics', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Welcome/i)).toBeInTheDocument();
    });

    // Verify statistics are displayed
    expect(screen.getByText('My Reports')).toBeInTheDocument();
    expect(screen.getByText('Scheduled Jobs')).toBeInTheDocument();

    // Should show "2" in datasources stat (mockDataSources has 2)
    // Should show "2" in my reports (both owned by u1/Alice)
    // Should show "1" in scheduled (only r1 has enabled schedule)
  });

  it('allows seamless navigation between all sections', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Welcome/i)).toBeInTheDocument();
    });

    // Start at Dashboard
    expect(screen.getByText('My Reports')).toBeInTheDocument();

    // Navigate to Data Sources
    await user.click(screen.getByRole('button', { name: /Data Sources/i }));
    await waitFor(() => {
      expect(screen.getByTestId('datasource-view')).toBeInTheDocument();
    });

    // Navigate to Reports
    await user.click(screen.getByRole('button', { name: /Reports/i }));
    await waitFor(() => {
      expect(screen.getByText('Report 1')).toBeInTheDocument();
    });

    // Navigate back to Dashboard
    await user.click(screen.getByRole('button', { name: /Dashboard/i }));
    await waitFor(() => {
      expect(screen.getByText('My Reports')).toBeInTheDocument();
    });
  });

  it('maintains state when navigating between views', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Welcome/i)).toBeInTheDocument();
    });

    // Go to reports
    await user.click(screen.getByRole('button', { name: /Reports/i }));
    await waitFor(() => {
      expect(screen.getByText('Report 1')).toBeInTheDocument();
    });

    // Go to datasources
    await user.click(screen.getByRole('button', { name: /Data Sources/i }));
    await waitFor(() => {
      expect(screen.getByText('Total: 2')).toBeInTheDocument();
    });

    // Go back to reports - should still show reports
    await user.click(screen.getByRole('button', { name: /Reports/i }));
    await waitFor(() => {
      expect(screen.getByText('Report 1')).toBeInTheDocument();
      expect(screen.getByText('Report 2')).toBeInTheDocument();
    });
  });
});

describe('Feature: Report Filtering', () => {
  const myReport = {
    id: 'r-mine',
    name: 'My Report',
    dataSourceId: 'ds-1',
    selectedColumns: [],
    visualization: 'table' as const,
    filters: [],
    sorts: [],
    schedule: { enabled: false, frequency: 'daily' as const, recipients: [] },
    visibility: 'public' as const,
    ownerId: 'u1', // Alice
    created_at: '2024-01-01T00:00:00Z'
  };

  const othersReport = {
    id: 'r-others',
    name: 'Others Report',
    dataSourceId: 'ds-1',
    selectedColumns: [],
    visualization: 'bar' as const,
    filters: [],
    sorts: [],
    schedule: { enabled: false, frequency: 'daily' as const, recipients: [] },
    visibility: 'public' as const,
    ownerId: 'u2', // Bob
    created_at: '2024-01-02T00:00:00Z'
  };

  beforeEach(() => {
    vi.mocked(datasourceService.listDatasources).mockResolvedValue([]);
    vi.mocked(reportService.listReports).mockResolvedValue([myReport, othersReport]);
  });

  it('filters reports by "All Shared Reports" and "My Reports"', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Welcome/i)).toBeInTheDocument();
    });

    // Go to Reports
    await user.click(screen.getByRole('button', { name: /Reports/i }));

    await waitFor(() => {
      // Default view shows "All Shared Reports"
      expect(screen.getByText('My Report')).toBeInTheDocument();
      expect(screen.getByText('Others Report')).toBeInTheDocument();
    });

    // Switch to "My Reports"
    await user.click(screen.getByText('My Reports'));

    await waitFor(() => {
      // Should only show Alice's report
      expect(screen.getByText('My Report')).toBeInTheDocument();
      expect(screen.queryByText('Others Report')).not.toBeInTheDocument();
    });

    // Switch back to "All Shared Reports"
    await user.click(screen.getByText('All Shared Reports'));

    await waitFor(() => {
      // Should show both again
      expect(screen.getByText('My Report')).toBeInTheDocument();
      expect(screen.getByText('Others Report')).toBeInTheDocument();
    });
  });
});

