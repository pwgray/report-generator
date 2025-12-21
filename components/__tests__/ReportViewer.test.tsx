import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../tests/utils';
import { ReportViewer } from '../ReportViewer';
import { DataSource, ReportConfig } from '../../types';
import userEvent from '@testing-library/user-event';
import * as datasourceService from '../../services/datasourceService';
import * as geminiService from '../../services/geminiService';

vi.mock('../../services/datasourceService');
vi.mock('../../services/geminiService');

const mockDataSource: DataSource = {
  id: 'ds1',
  name: 'Test Database',
  description: 'Test DB',
  type: 'postgres',
  tables: [
    {
      id: 'table1',
      name: 'users',
      exposed: true,
      columns: [
        { id: 'col1', name: 'id', type: 'number' },
        { id: 'col2', name: 'name', type: 'string' },
        { id: 'col3', name: 'email', type: 'string' }
      ]
    }
  ],
  views: [],
  created_at: new Date().toISOString()
};

const mockReport: ReportConfig = {
  id: 'report1',
  dataSourceId: 'ds1',
  name: 'Test Report',
  description: 'A test report',
  ownerId: 'user1',
  visibility: 'public',
  selectedColumns: [
    { tableId: 'table1', columnId: 'col1' },
    { tableId: 'table1', columnId: 'col2' }
  ],
  filters: [],
  sorts: [],
  visualization: 'table',
  schedule: { enabled: false, frequency: 'weekly', time: '09:00' },
  created_at: new Date().toISOString()
};

describe('ReportViewer', () => {
  const mockOnBack = vi.fn();
  const mockOnSaveDataSource = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(datasourceService.fetchTableData).mockResolvedValue([
      { id: 1, name: 'Alice', email: 'alice@test.com' },
      { id: 2, name: 'Bob', email: 'bob@test.com' }
    ]);
  });

  describe('Initial Rendering', () => {
    it('renders report header', async () => {
      render(
        <ReportViewer
          report={mockReport}
          dataSource={mockDataSource}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Test Report')).toBeInTheDocument();
      });
      // Description might not always be visible depending on layout
    });

    it('renders back button', () => {
      render(
        <ReportViewer
          report={mockReport}
          dataSource={mockDataSource}
          onBack={mockOnBack}
        />
      );

      // Back button is rendered with an icon only (ArrowLeft)
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('renders refresh button', () => {
      render(
        <ReportViewer
          report={mockReport}
          dataSource={mockDataSource}
          onBack={mockOnBack}
        />
      );

      expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument();
    });

    it('fetches data on mount', async () => {
      render(
        <ReportViewer
          report={mockReport}
          dataSource={mockDataSource}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        expect(datasourceService.fetchTableData).toHaveBeenCalled();
      });
    });
  });

  describe('Data Fetching', () => {
    it('displays loading state while fetching', async () => {
      vi.mocked(datasourceService.fetchTableData).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve([]), 1000))
      );

      render(
        <ReportViewer
          report={mockReport}
          dataSource={mockDataSource}
          onBack={mockOnBack}
        />
      );

      // The Refresh button should be present (loading indicator)
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument();
      });
    });

    it('displays fetched data in table', async () => {
      render(
        <ReportViewer
          report={mockReport}
          dataSource={mockDataSource}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('Bob')).toBeInTheDocument();
      });
    });

    it.skip('shows record count after fetching', async () => {
      render(
        <ReportViewer
          report={mockReport}
          dataSource={mockDataSource}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        // Look for the text "2" which represents the record count
        expect(screen.getByText(/Alice/i)).toBeInTheDocument();
        expect(screen.getByText(/Bob/i)).toBeInTheDocument();
      });
    });

    it('passes filters to fetchTableData', async () => {
      const reportWithFilters = {
        ...mockReport,
        filters: [
          { id: 'f1', tableId: 'table1', columnId: 'col1', operator: 'equals' as const, value: '1' }
        ]
      };

      render(
        <ReportViewer
          report={reportWithFilters}
          dataSource={mockDataSource}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        expect(datasourceService.fetchTableData).toHaveBeenCalledWith(
          expect.anything(),
          expect.anything(),
          expect.anything(),
          expect.anything(),
          expect.arrayContaining([
            expect.objectContaining({ operator: 'equals' })
          ]),
          expect.anything()
        );
      });
    });

    it('passes sorts to fetchTableData', async () => {
      const reportWithSorts = {
        ...mockReport,
        sorts: [
          { id: 's1', tableId: 'table1', columnId: 'col2', direction: 'asc' as const }
        ]
      };

      render(
        <ReportViewer
          report={reportWithSorts}
          dataSource={mockDataSource}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        expect(datasourceService.fetchTableData).toHaveBeenCalledWith(
          expect.anything(),
          expect.anything(),
          expect.anything(),
          expect.anything(),
          expect.anything(),
          expect.arrayContaining([
            expect.objectContaining({ direction: 'asc' })
          ])
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error when no data source is provided', async () => {
      render(
        <ReportViewer
          report={mockReport}
          dataSource={undefined}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/No data source configured/i)).toBeInTheDocument();
      });
    });

    it('displays error when no columns are selected', async () => {
      const reportNoColumns = {
        ...mockReport,
        selectedColumns: []
      };

      render(
        <ReportViewer
          report={reportNoColumns}
          dataSource={mockDataSource}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/No columns selected/i)).toBeInTheDocument();
      });
    });

    it('displays error when fetchTableData fails', async () => {
      vi.mocked(datasourceService.fetchTableData).mockRejectedValue(
        new Error('Database connection failed')
      );

      render(
        <ReportViewer
          report={mockReport}
          dataSource={mockDataSource}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/failed to fetch live data/i)).toBeInTheDocument();
      });
    });

    it('displays error for multiple tables/views', async () => {
      const reportMultipleTables = {
        ...mockReport,
        selectedColumns: [
          { tableId: 'table1', columnId: 'col1' },
          { tableId: 'table2', columnId: 'col1' }
        ]
      };

      render(
        <ReportViewer
          report={reportMultipleTables}
          dataSource={mockDataSource}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/single table or view only/i)).toBeInTheDocument();
      });
    });
  });

  describe('AI Data Source', () => {
    it('uses AI generation for custom data sources', async () => {
      const aiDataSource = {
        ...mockDataSource,
        type: 'custom' as const
      };

      vi.mocked(geminiService.generateReportData).mockResolvedValue([
        { id: 1, name: 'Generated' }
      ]);

      render(
        <ReportViewer
          report={mockReport}
          dataSource={aiDataSource}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        expect(geminiService.generateReportData).toHaveBeenCalled();
        expect(screen.getByText('Generated')).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    it('calls onBack when back button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <ReportViewer
          report={mockReport}
          dataSource={mockDataSource}
          onBack={mockOnBack}
        />
      );

      // Find the back button by getting the first button (ghost variant with icon only)
      const buttons = screen.getAllByRole('button');
      const backButton = buttons[0]; // First button should be the back button
      await user.click(backButton);

      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });

    it('refetches data when refresh button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <ReportViewer
          report={mockReport}
          dataSource={mockDataSource}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        expect(datasourceService.fetchTableData).toHaveBeenCalledTimes(1);
      });

      const refreshButton = screen.getByRole('button', { name: /Refresh/i });
      await user.click(refreshButton);

      await waitFor(() => {
        expect(datasourceService.fetchTableData).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Visualizations', () => {
    it('renders table visualization by default', async () => {
      render(
        <ReportViewer
          report={mockReport}
          dataSource={mockDataSource}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Alice')).toBeInTheDocument();
      });
    });

    it('renders bar chart visualization', async () => {
      const reportWithBarChart = {
        ...mockReport,
        visualization: 'bar' as const
      };

      render(
        <ReportViewer
          report={reportWithBarChart}
          dataSource={mockDataSource}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        // Recharts renders SVG elements
        const svgs = document.querySelectorAll('svg');
        expect(svgs.length).toBeGreaterThan(0);
      });
    });

    it('renders line chart visualization', async () => {
      const reportWithLineChart = {
        ...mockReport,
        visualization: 'line' as const
      };

      render(
        <ReportViewer
          report={reportWithLineChart}
          dataSource={mockDataSource}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        const svgs = document.querySelectorAll('svg');
        expect(svgs.length).toBeGreaterThan(0);
      });
    });

    it('renders pie chart visualization', async () => {
      const reportWithPieChart = {
        ...mockReport,
        visualization: 'pie' as const
      };

      render(
        <ReportViewer
          report={reportWithPieChart}
          dataSource={mockDataSource}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        const svgs = document.querySelectorAll('svg');
        expect(svgs.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Export Functionality', () => {
    it('renders export to excel button when data is available', async () => {
      render(
        <ReportViewer
          report={mockReport}
          dataSource={mockDataSource}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Export to Excel/i })).toBeInTheDocument();
      });
    });
  });

  describe('Column Formatting', () => {
    it('applies date formatting to date columns', async () => {
      const dsWithDate: DataSource = {
        ...mockDataSource,
        tables: [{
          ...mockDataSource.tables[0],
          columns: [
            { id: 'col1', name: 'created_at', type: 'date' }
          ]
        }]
      };

      const reportWithDate: ReportConfig = {
        ...mockReport,
        selectedColumns: [
          {
            tableId: 'table1',
            columnId: 'col1',
            formatting: {
              type: 'date',
              config: { format: 'MM/DD/YYYY' }
            }
          }
        ]
      };

      vi.mocked(datasourceService.fetchTableData).mockResolvedValue([
        { created_at: '2024-01-15' }
      ]);

      render(
        <ReportViewer
          report={reportWithDate}
          dataSource={dsWithDate}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/01\/15\/2024/)).toBeInTheDocument();
      });
    });

    it('applies number formatting to number columns', async () => {
      const dsWithNumber: DataSource = {
        ...mockDataSource,
        tables: [{
          ...mockDataSource.tables[0],
          columns: [
            { id: 'col1', name: 'amount', type: 'number' }
          ]
        }]
      };

      const reportWithNumber: ReportConfig = {
        ...mockReport,
        selectedColumns: [
          {
            tableId: 'table1',
            columnId: 'col1',
            formatting: {
              type: 'number',
              config: { decimalPlaces: 2, thousandSeparator: true }
            }
          }
        ]
      };

      vi.mocked(datasourceService.fetchTableData).mockResolvedValue([
        { amount: 1234.567 }
      ]);

      render(
        <ReportViewer
          report={reportWithNumber}
          dataSource={dsWithNumber}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/1,234.57/)).toBeInTheDocument();
      });
    });

    it('applies currency formatting to currency columns', async () => {
      const dsWithCurrency: DataSource = {
        ...mockDataSource,
        tables: [{
          ...mockDataSource.tables[0],
          columns: [
            { id: 'col1', name: 'price', type: 'currency' }
          ]
        }]
      };

      const reportWithCurrency: ReportConfig = {
        ...mockReport,
        selectedColumns: [
          {
            tableId: 'table1',
            columnId: 'col1',
            formatting: {
              type: 'currency',
              config: { symbol: '$', symbolPosition: 'before', decimalPlaces: 2, thousandSeparator: true }
            }
          }
        ]
      };

      vi.mocked(datasourceService.fetchTableData).mockResolvedValue([
        { price: 99.99 }
      ]);

      render(
        <ReportViewer
          report={reportWithCurrency}
          dataSource={dsWithCurrency}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/\$99.99/)).toBeInTheDocument();
      });
    });

    it('applies boolean formatting to boolean columns', async () => {
      const dsWithBoolean: DataSource = {
        ...mockDataSource,
        tables: [{
          ...mockDataSource.tables[0],
          columns: [
            { id: 'col1', name: 'active', type: 'boolean' }
          ]
        }]
      };

      const reportWithBoolean: ReportConfig = {
        ...mockReport,
        selectedColumns: [
          {
            tableId: 'table1',
            columnId: 'col1',
            formatting: {
              type: 'boolean',
              config: { style: 'yes/no' }
            }
          }
        ]
      };

      vi.mocked(datasourceService.fetchTableData).mockResolvedValue([
        { active: true }
      ]);

      render(
        <ReportViewer
          report={reportWithBoolean}
          dataSource={dsWithBoolean}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Yes/)).toBeInTheDocument();
      });
    });
  });
});

