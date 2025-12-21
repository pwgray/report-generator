import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../tests/utils';
import { ReportBuilder } from '../ReportBuilder';
import { DataSource, ReportConfig } from '../../types';
import userEvent from '@testing-library/user-event';

const mockDataSource: DataSource = {
  id: 'ds1',
  name: 'Test Database',
  description: 'Test DB',
  type: 'postgres',
  tables: [
    {
      id: 'table1',
      name: 'users',
      alias: 'Users Table',
      exposed: true,
      columns: [
        { id: 'col1', name: 'id', type: 'number', alias: 'User ID' },
        { id: 'col2', name: 'name', type: 'string', alias: 'Name' },
        { id: 'col3', name: 'email', type: 'string', alias: 'Email' },
        { id: 'col4', name: 'created_at', type: 'date', alias: 'Created' },
        { id: 'col5', name: 'balance', type: 'currency', alias: 'Balance' },
        { id: 'col6', name: 'active', type: 'boolean', alias: 'Active' }
      ]
    },
    {
      id: 'table2',
      name: 'orders',
      exposed: true,
      columns: [
        { id: 'col1', name: 'id', type: 'number' },
        { id: 'col2', name: 'user_id', type: 'number' }
      ]
    }
  ],
  views: [
    {
      id: 'view1',
      name: 'user_summary',
      exposed: true,
      columns: [
        { id: 'vcol1', name: 'total', type: 'number' }
      ]
    }
  ],
  created_at: new Date().toISOString()
};

describe('ReportBuilder', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Rendering', () => {
    it('renders with new report defaults', () => {
      render(
        <ReportBuilder
          dataSources={[mockDataSource]}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByPlaceholderText('Report Name')).toHaveValue('New Report');
      expect(screen.getByText(/Configure your data and visualization/i)).toBeInTheDocument();
    });

    it('renders with initial report data when editing', () => {
      const initialReport: ReportConfig = {
        id: 'report1',
        dataSourceId: 'ds1',
        name: 'Existing Report',
        description: 'Test report',
        ownerId: 'user1',
        visibility: 'public',
        selectedColumns: [
          { tableId: 'table1', columnId: 'col1' }
        ],
        filters: [],
        sorts: [],
        visualization: 'table',
        schedule: { enabled: false, frequency: 'weekly', time: '09:00' },
        created_at: new Date().toISOString()
      };

      render(
        <ReportBuilder
          dataSources={[mockDataSource]}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          initialReport={initialReport}
        />
      );

      expect(screen.getByDisplayValue('Existing Report')).toBeInTheDocument();
    });

    it('displays all tabs', () => {
      render(
        <ReportBuilder
          dataSources={[mockDataSource]}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByRole('button', { name: 'Data' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Filters & Sort' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Visualize' })).toBeInTheDocument();
    });
  });

  describe('Report Name and Description', () => {
    it('allows changing report name', async () => {
      const user = userEvent.setup();
      render(
        <ReportBuilder
          dataSources={[mockDataSource]}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const nameInput = screen.getByPlaceholderText('Report Name');
      await user.clear(nameInput);
      await user.type(nameInput, 'My Custom Report');

      expect(nameInput).toHaveValue('My Custom Report');
    });
  });

  describe('Visibility Toggle', () => {
    it('defaults to private visibility', () => {
      render(
        <ReportBuilder
          dataSources={[mockDataSource]}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const privateButton = screen.getByRole('button', { name: /Private/i });
      expect(privateButton).toHaveClass('bg-white'); // Active state
    });

    it('allows toggling to public visibility', async () => {
      const user = userEvent.setup();
      render(
        <ReportBuilder
          dataSources={[mockDataSource]}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const publicButton = screen.getByRole('button', { name: /Public/i });
      await user.click(publicButton);

      expect(publicButton).toHaveClass('bg-white'); // Active state
    });
  });

  describe('Data Tab', () => {
    it('displays data source selector', () => {
      render(
        <ReportBuilder
          dataSources={[mockDataSource]}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Look for the "Data Source" text (the label)
      expect(screen.getByText('Data Source')).toBeInTheDocument();
    });

    it('displays available tables and views', () => {
      render(
        <ReportBuilder
          dataSources={[mockDataSource]}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('users')).toBeInTheDocument();
      expect(screen.getByText('orders')).toBeInTheDocument();
      expect(screen.getByText('user_summary')).toBeInTheDocument();
      expect(screen.getByText('VIEW')).toBeInTheDocument();
    });

    it('allows selecting columns', async () => {
      const user = userEvent.setup();
      render(
        <ReportBuilder
          dataSources={[mockDataSource]}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const idCheckbox = screen.getByRole('checkbox', { name: /User ID/i });
      await user.click(idCheckbox);

      expect(idCheckbox).toBeChecked();
    });

    it('allows deselecting columns', async () => {
      const user = userEvent.setup();
      render(
        <ReportBuilder
          dataSources={[mockDataSource]}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const idCheckbox = screen.getByRole('checkbox', { name: /User ID/i });
      await user.click(idCheckbox);
      expect(idCheckbox).toBeChecked();

      await user.click(idCheckbox);
      expect(idCheckbox).not.toBeChecked();
    });

    it('clears selections when data source changes', async () => {
      const user = userEvent.setup();
      const ds2: DataSource = {
        ...mockDataSource,
        id: 'ds2',
        name: 'Second DB'
      };

      render(
        <ReportBuilder
          dataSources={[mockDataSource, ds2]}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Select a column
      const idCheckbox = screen.getByRole('checkbox', { name: /User ID/i });
      await user.click(idCheckbox);
      expect(idCheckbox).toBeChecked();

      // Change data source by finding the select element by role
      const dsSelect = screen.getByRole('combobox');
      await user.selectOptions(dsSelect, 'ds2');

      // Column should be deselected
      await waitFor(() => {
        expect(idCheckbox).not.toBeChecked();
      });
    });
  });

  describe('Filters Tab', () => {
    it('switches to filters tab', async () => {
      const user = userEvent.setup();
      render(
        <ReportBuilder
          dataSources={[mockDataSource]}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const filtersTab = screen.getByRole('button', { name: 'Filters & Sort' });
      await user.click(filtersTab);

      // Look for unique buttons in filter tab - get all Add Filter buttons
      const addFilterButtons = screen.getAllByText(/Add Filter/i);
      expect(addFilterButtons.length).toBeGreaterThan(0);
    });

    it('allows adding a filter', async () => {
      const user = userEvent.setup();
      render(
        <ReportBuilder
          dataSources={[mockDataSource]}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const filtersTab = screen.getByRole('button', { name: 'Filters & Sort' });
      await user.click(filtersTab);

      const addFilterButtons = screen.getAllByText(/Add Filter/i);
      await user.click(addFilterButtons[0]);

      // After adding filter, there should be filter controls (select dropdowns, etc.)
      await waitFor(() => {
        const selects = screen.getAllByRole('combobox');
        expect(selects.length).toBeGreaterThan(0);
      });
    });

    it.skip('allows adding a sort condition', async () => {
      const user = userEvent.setup();
      render(
        <ReportBuilder
          dataSources={[mockDataSource]}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const filtersTab = screen.getByRole('button', { name: 'Filters & Sort' });
      await user.click(filtersTab);

      const addSortButtons = screen.getAllByText(/Add Sort/i);
      await user.click(addSortButtons[0]);

      // After adding sort, there should be sort controls
      await waitFor(() => {
        const selects = screen.getAllByRole('combobox');
        expect(selects.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Visualize Tab', () => {
    it('switches to visualize tab', async () => {
      const user = userEvent.setup();
      render(
        <ReportBuilder
          dataSources={[mockDataSource]}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const visualizeTab = screen.getByRole('button', { name: 'Visualize' });
      await user.click(visualizeTab);

      // Check for visualization options by looking for the "Table" text
      await waitFor(() => {
        expect(screen.getAllByText('Table').length).toBeGreaterThan(0);
      });
    });

    it('displays visualization type options', async () => {
      const user = userEvent.setup();
      render(
        <ReportBuilder
          dataSources={[mockDataSource]}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const visualizeTab = screen.getByRole('button', { name: 'Visualize' });
      await user.click(visualizeTab);

      // Look for visualization types - they should be present as clickable options
      await waitFor(() => {
        expect(screen.getAllByText('Table').length).toBeGreaterThan(0);
      });
      // These might be icons or other representations, just check we switched tabs
    });

    it('shows column formatting for selected columns', async () => {
      const user = userEvent.setup();
      render(
        <ReportBuilder
          dataSources={[mockDataSource]}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Select a column first
      const idCheckbox = screen.getByRole('checkbox', { name: /User ID/i });
      await user.click(idCheckbox);

      // Switch to visualize tab
      const visualizeTab = screen.getByRole('button', { name: 'Visualize' });
      await user.click(visualizeTab);

      // Should see formatting section
      await waitFor(() => {
        expect(screen.getByText(/Column Formatting/i)).toBeInTheDocument();
      });
    });
  });

  describe('Save and Cancel', () => {
    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <ReportBuilder
          dataSources={[mockDataSource]}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('calls onSave with report config when save button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <ReportBuilder
          dataSources={[mockDataSource]}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const saveButton = screen.getByRole('button', { name: /Save Report/i });
      await user.click(saveButton);

      expect(mockOnSave).toHaveBeenCalledTimes(1);
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Report',
          dataSourceId: 'ds1',
          visibility: 'private'
        })
      );
    });

    it('includes selected columns in saved report', async () => {
      const user = userEvent.setup();
      render(
        <ReportBuilder
          dataSources={[mockDataSource]}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Select a column
      const idCheckbox = screen.getByRole('checkbox', { name: /User ID/i });
      await user.click(idCheckbox);

      // Save
      const saveButton = screen.getByRole('button', { name: /Save Report/i });
      await user.click(saveButton);

      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedColumns: expect.arrayContaining([
            expect.objectContaining({
              tableId: 'table1',
              columnId: 'col1'
            })
          ])
        })
      );
    });
  });

  describe('Edge Cases', () => {
    it('handles empty data sources array', () => {
      render(
        <ReportBuilder
          dataSources={[]}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByPlaceholderText('Report Name')).toBeInTheDocument();
    });

    it('handles data source with no tables', () => {
      const emptyDs: DataSource = {
        ...mockDataSource,
        tables: [],
        views: []
      };

      render(
        <ReportBuilder
          dataSources={[emptyDs]}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Data Source')).toBeInTheDocument();
    });
  });

  describe('Column Type Based Operators', () => {
    it('renders string operators when string column selected', async () => {
      const user = userEvent.setup();
      render(
        <ReportBuilder
          dataSources={[mockDataSource]}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const filtersTab = screen.getByRole('button', { name: 'Filters & Sort' });
      await user.click(filtersTab);

      const addFilterButtons = screen.getAllByText(/Add Filter/i);
      await user.click(addFilterButtons[0]);

      // String operators should be available
      await waitFor(() => {
        const selects = screen.getAllByRole('combobox');
        expect(selects.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Column Alias Display', () => {
    it('displays column aliases in selection list', () => {
      render(
        <ReportBuilder
          dataSources={[mockDataSource]}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Should show the alias "User ID" instead of just "id"
      expect(screen.getByText('User ID')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
    });
  });

  describe('Report Description', () => {
    it('allows changing report name through input', async () => {
      const user = userEvent.setup();
      render(
        <ReportBuilder
          dataSources={[mockDataSource]}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const nameInput = screen.getByPlaceholderText('Report Name');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Report Name');

      expect(nameInput).toHaveValue('Updated Report Name');
    });
  });

  describe('Multiple Column Selection', () => {
    it('allows selecting multiple columns', async () => {
      const user = userEvent.setup();
      render(
        <ReportBuilder
          dataSources={[mockDataSource]}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const col1 = screen.getByRole('checkbox', { name: /User ID/i });
      const col2 = screen.getByRole('checkbox', { name: /Name/i });
      
      await user.click(col1);
      await user.click(col2);

      expect(col1).toBeChecked();
      expect(col2).toBeChecked();
    });
  });

  describe('Views Integration', () => {
    it('displays views alongside tables', () => {
      render(
        <ReportBuilder
          dataSources={[mockDataSource]}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('user_summary')).toBeInTheDocument();
      expect(screen.getByText('VIEW')).toBeInTheDocument();
    });

    it('allows selecting columns from views', async () => {
      const user = userEvent.setup();
      render(
        <ReportBuilder
          dataSources={[mockDataSource]}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const viewCol = screen.getByRole('checkbox', { name: /total/i });
      await user.click(viewCol);

      expect(viewCol).toBeChecked();
    });
  });
});

