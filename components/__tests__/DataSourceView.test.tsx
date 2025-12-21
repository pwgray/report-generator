import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../tests/utils';
import userEvent from '@testing-library/user-event';
import { DataSourceView } from '../DataSourceView';
import { DataSource } from '../../types';

// Mock the services
vi.mock('../../services/datasourceService', () => ({
  testConnectionAndFetchSchema: vi.fn().mockResolvedValue({ tables: [], views: [] })
}));

vi.mock('../../services/geminiService', () => ({
  discoverSchema: vi.fn().mockResolvedValue([])
}));

describe('DataSourceView', () => {
  const mockOnAdd = vi.fn();
  const mockOnUpdate = vi.fn();
  const mockOnDelete = vi.fn();

  const mockDataSources: DataSource[] = [
    {
      id: 'ds-1',
      name: 'Test Database',
      description: 'Test description',
      type: 'postgres',
      tables: [
        {
          id: 't1',
          name: 'users',
          columns: [
            { id: 'c1', name: 'id', type: 'integer' },
            { id: 'c2', name: 'name', type: 'varchar' }
          ],
          exposed: true
        }
      ],
      views: [],
      connectionDetails: {
        host: 'localhost',
        port: '5432',
        database: 'testdb',
        username: 'user',
        password: 'pass'
      },
      created_at: '2024-01-01T00:00:00Z'
    }
  ];

  beforeEach(() => {
    mockOnAdd.mockReset();
    mockOnUpdate.mockReset();
    mockOnDelete.mockReset();
    mockOnAdd.mockResolvedValue({});
    mockOnUpdate.mockResolvedValue({});
    mockOnDelete.mockResolvedValue(undefined);
  });

  describe('List view', () => {
    it('renders data sources list', () => {
      render(
        <DataSourceView
          dataSources={mockDataSources}
          onAdd={mockOnAdd}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('Test Database')).toBeInTheDocument();
      expect(screen.getByText('Test description')).toBeInTheDocument();
    });

    it('shows "Connect New Source" button when not read-only', () => {
      render(
        <DataSourceView
          dataSources={[]}
          onAdd={mockOnAdd}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('Connect New Source')).toBeInTheDocument();
    });

    it('hides "Connect New Source" button when read-only', () => {
      render(
        <DataSourceView
          dataSources={[]}
          onAdd={mockOnAdd}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          isReadOnly={true}
        />
      );

      expect(screen.queryByText('Connect New Source')).not.toBeInTheDocument();
    });

    it('displays table counts', () => {
      render(
        <DataSourceView
          dataSources={mockDataSources}
          onAdd={mockOnAdd}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText(/1 Tables/i)).toBeInTheDocument();
    });

    it('shows empty state when no data sources', () => {
      render(
        <DataSourceView
          dataSources={[]}
          onAdd={mockOnAdd}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('No Data Sources')).toBeInTheDocument();
    });
  });

  describe('Create new data source', () => {
    it('shows form when clicking "Connect New Source"', async () => {
      const user = userEvent.setup();
      render(
        <DataSourceView
          dataSources={[]}
          onAdd={mockOnAdd}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />
      );

      await user.click(screen.getByText('Connect New Source'));

      expect(screen.getByText('New Data Source')).toBeInTheDocument();
    });

    it('allows entering data source name', async () => {
      const user = userEvent.setup();
      render(
        <DataSourceView
          dataSources={[]}
          onAdd={mockOnAdd}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />
      );

      await user.click(screen.getByText('Connect New Source'));

      const nameInput = screen.getByPlaceholderText('e.g., Sales DB');
      await user.type(nameInput, 'New Database');

      expect(nameInput).toHaveValue('New Database');
    });
  });

  describe('Edit data source', () => {
    it('shows edit form when clicking edit button', async () => {
      const user = userEvent.setup();
      render(
        <DataSourceView
          dataSources={mockDataSources}
          onAdd={mockOnAdd}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />
      );

      const cards = screen.getAllByTitle('Edit');
      await user.click(cards[0]);

      expect(screen.getByText('Edit Data Source')).toBeInTheDocument();
    });
  });

  describe('Delete data source', () => {
    it('shows confirmation dialog before deleting', async () => {
      const user = userEvent.setup();
      
      global.confirm = vi.fn(() => false);

      render(
        <DataSourceView
          dataSources={mockDataSources}
          onAdd={mockOnAdd}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />
      );

      const deleteButtons = screen.getAllByTitle('Delete');
      await user.click(deleteButtons[0]);

      expect(global.confirm).toHaveBeenCalledWith('Delete this data source?');
      expect(mockOnDelete).not.toHaveBeenCalled();
    });
  });

  describe('Cancel functionality', () => {
    it('returns to list view when clicking cancel', async () => {
      const user = userEvent.setup();
      render(
        <DataSourceView
          dataSources={mockDataSources}
          onAdd={mockOnAdd}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />
      );

      await user.click(screen.getByText('Connect New Source'));
      expect(screen.getByText('New Data Source')).toBeInTheDocument();

      await user.click(screen.getByText('Cancel'));
      
      expect(screen.queryByText('New Data Source')).not.toBeInTheDocument();
      expect(screen.getByText('Data Sources')).toBeInTheDocument();
    });
  });

  describe('Connection Details Tab', () => {
    it('displays connection form for SQL databases', async () => {
      const user = userEvent.setup();
      render(
        <DataSourceView
          dataSources={[]}
          onAdd={mockOnAdd}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />
      );

      await user.click(screen.getByText('Connect New Source'));

      // Check for placeholders instead of labels since Input component might not have proper htmlFor
      expect(screen.getByPlaceholderText('localhost')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('user')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('my_database')).toBeInTheDocument();
    });

    it('allows entering connection details', async () => {
      const user = userEvent.setup();
      render(
        <DataSourceView
          dataSources={[]}
          onAdd={mockOnAdd}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />
      );

      await user.click(screen.getByText('Connect New Source'));

      const hostInput = screen.getByPlaceholderText('localhost');
      const portInput = screen.getByPlaceholderText('5432');
      const dbInput = screen.getByPlaceholderText('my_database');

      await user.clear(hostInput);
      await user.type(hostInput, 'myserver.com');
      await user.clear(portInput);
      await user.type(portInput, '5433');
      await user.clear(dbInput);
      await user.type(dbInput, 'mydb');

      expect(hostInput).toHaveValue('myserver.com');
      expect(portInput).toHaveValue('5433');
      expect(dbInput).toHaveValue('mydb');
    });

    it('displays test connection button', async () => {
      const user = userEvent.setup();
      render(
        <DataSourceView
          dataSources={[]}
          onAdd={mockOnAdd}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />
      );

      await user.click(screen.getByText('Connect New Source'));

      expect(screen.getByText('Test Connection & Fetch Schema')).toBeInTheDocument();
    });

    it('allows selecting different database types', async () => {
      const user = userEvent.setup();
      render(
        <DataSourceView
          dataSources={[]}
          onAdd={mockOnAdd}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />
      );

      await user.click(screen.getByText('Connect New Source'));

      const typeSelect = screen.getByRole('combobox');
      expect(typeSelect).toHaveValue('sql');

      await user.selectOptions(typeSelect, 'postgres');
      expect(typeSelect).toHaveValue('postgres');
    });

    it('shows custom/AI form for custom type', async () => {
      const user = userEvent.setup();
      render(
        <DataSourceView
          dataSources={[]}
          onAdd={mockOnAdd}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />
      );

      await user.click(screen.getByText('Connect New Source'));

      const typeSelect = screen.getByRole('combobox');
      await user.selectOptions(typeSelect, 'custom');

      expect(screen.getByText(/describe the data you want to simulate/i)).toBeInTheDocument();
      expect(screen.getByText('Generate Schema')).toBeInTheDocument();
    });
  });

  describe('Schema Tab', () => {
    it('displays schema tab navigation', async () => {
      const user = userEvent.setup();
      render(
        <DataSourceView
          dataSources={[]}
          onAdd={mockOnAdd}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />
      );

      await user.click(screen.getByText('Connect New Source'));

      expect(screen.getByText('Connection Details')).toBeInTheDocument();
      expect(screen.getByText('Schema & Metadata')).toBeInTheDocument();
    });

    it('switches to schema tab when clicked', async () => {
      const user = userEvent.setup();
      render(
        <DataSourceView
          dataSources={mockDataSources}
          onAdd={mockOnAdd}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />
      );

      const editButtons = screen.getAllByTitle('Edit');
      await user.click(editButtons[0]);

      const schemaTab = screen.getByText('Schema & Metadata');
      await user.click(schemaTab);

      // Check for schema-specific content  
      await waitFor(() => {
        // Tables should be shown
        expect(screen.getByText('users')).toBeInTheDocument();
      });
    });

    it('displays tables when schema is available', async () => {
      const user = userEvent.setup();
      render(
        <DataSourceView
          dataSources={mockDataSources}
          onAdd={mockOnAdd}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />
      );

      const editButtons = screen.getAllByTitle('Edit');
      await user.click(editButtons[0]);

      const schemaTab = screen.getByText('Schema & Metadata');
      await user.click(schemaTab);

      expect(screen.getByText('users')).toBeInTheDocument();
    });

    it('allows expanding table to see columns', async () => {
      const user = userEvent.setup();
      render(
        <DataSourceView
          dataSources={mockDataSources}
          onAdd={mockOnAdd}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />
      );

      const editButtons = screen.getAllByTitle('Edit');
      await user.click(editButtons[0]);

      const schemaTab = screen.getByText('Schema & Metadata');
      await user.click(schemaTab);

      const tableHeader = screen.getByText('users');
      await user.click(tableHeader);

      expect(screen.getByText('id')).toBeInTheDocument();
      expect(screen.getByText('name')).toBeInTheDocument();
    });

    it('allows editing table alias', async () => {
      const user = userEvent.setup();
      render(
        <DataSourceView
          dataSources={mockDataSources}
          onAdd={mockOnAdd}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />
      );

      const editButtons = screen.getAllByTitle('Edit');
      await user.click(editButtons[0]);

      const schemaTab = screen.getByText('Schema & Metadata');
      await user.click(schemaTab);

      const aliasInput = screen.getByPlaceholderText('Friendly Alias');
      await user.type(aliasInput, 'User Table');

      expect(aliasInput).toHaveValue('User Table');
    });

    it('allows toggling table exposure', async () => {
      const user = userEvent.setup();
      render(
        <DataSourceView
          dataSources={mockDataSources}
          onAdd={mockOnAdd}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />
      );

      const editButtons = screen.getAllByTitle('Edit');
      await user.click(editButtons[0]);

      const schemaTab = screen.getByText('Schema & Metadata');
      await user.click(schemaTab);

      const exposedButton = screen.getByText('Exposed');
      expect(exposedButton).toBeInTheDocument();

      await user.click(exposedButton);

      expect(screen.getByText('Hidden')).toBeInTheDocument();
    });

    it('displays views section when views exist', async () => {
      const user = userEvent.setup();
      const dsWithViews: DataSource = {
        ...mockDataSources[0],
        views: [
          {
            id: 'v1',
            name: 'user_summary',
            exposed: true,
            columns: [{ id: 'vc1', name: 'total', type: 'integer' }]
          }
        ]
      };

      render(
        <DataSourceView
          dataSources={[dsWithViews]}
          onAdd={mockOnAdd}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />
      );

      const editButtons = screen.getAllByTitle('Edit');
      await user.click(editButtons[0]);

      const schemaTab = screen.getByText('Schema & Metadata');
      await user.click(schemaTab);

      expect(screen.getByText(/Views \(1\)/i)).toBeInTheDocument();
      expect(screen.getByText('user_summary')).toBeInTheDocument();
    });

    it('shows VIEW badge for views', async () => {
      const user = userEvent.setup();
      const dsWithViews: DataSource = {
        ...mockDataSources[0],
        views: [
          {
            id: 'v1',
            name: 'user_summary',
            exposed: true,
            columns: []
          }
        ]
      };

      render(
        <DataSourceView
          dataSources={[dsWithViews]}
          onAdd={mockOnAdd}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />
      );

      const editButtons = screen.getAllByTitle('Edit');
      await user.click(editButtons[0]);

      const schemaTab = screen.getByText('Schema & Metadata');
      await user.click(schemaTab);

      expect(screen.getByText('VIEW')).toBeInTheDocument();
    });

    it('allows editing view metadata', async () => {
      const user = userEvent.setup();
      const dsWithViews: DataSource = {
        ...mockDataSources[0],
        views: [
          {
            id: 'v1',
            name: 'user_summary',
            exposed: true,
            columns: [{ id: 'vc1', name: 'total', type: 'integer' }]
          }
        ]
      };

      render(
        <DataSourceView
          dataSources={[dsWithViews]}
          onAdd={mockOnAdd}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />
      );

      const editButtons = screen.getAllByTitle('Edit');
      await user.click(editButtons[0]);

      const schemaTab = screen.getByText('Schema & Metadata');
      await user.click(schemaTab);

      // Expand the view
      const viewHeader = screen.getByText('user_summary');
      await user.click(viewHeader);

      const aliasInputs = screen.getAllByPlaceholderText('Friendly Alias');
      const viewAliasInput = aliasInputs[aliasInputs.length - 1];
      await user.type(viewAliasInput, 'Summary View');

      expect(viewAliasInput).toHaveValue('Summary View');
    });
  });

  describe('Save Functionality', () => {
    it('shows save button', async () => {
      const user = userEvent.setup();
      render(
        <DataSourceView
          dataSources={[]}
          onAdd={mockOnAdd}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />
      );

      await user.click(screen.getByText('Connect New Source'));

      expect(screen.getByText('Save Configuration')).toBeInTheDocument();
    });

    it('calls onAdd when saving new data source', async () => {
      const user = userEvent.setup();
      render(
        <DataSourceView
          dataSources={[]}
          onAdd={mockOnAdd}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />
      );

      await user.click(screen.getByText('Connect New Source'));

      const nameInput = screen.getByPlaceholderText('e.g., Sales DB');
      await user.type(nameInput, 'New Database');

      const saveButton = screen.getByText('Save Configuration');
      await user.click(saveButton);

      expect(mockOnAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Database'
        })
      );
    });

    it('calls onUpdate when saving existing data source', async () => {
      const user = userEvent.setup();
      render(
        <DataSourceView
          dataSources={mockDataSources}
          onAdd={mockOnAdd}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />
      );

      const editButtons = screen.getAllByTitle('Edit');
      await user.click(editButtons[0]);

      const nameInput = screen.getByDisplayValue('Test Database');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Database');

      const saveButton = screen.getByText('Save Configuration');
      await user.click(saveButton);

      expect(mockOnUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated Database'
        })
      );
    });
  });

  describe('Read-only Mode', () => {
    it('hides edit buttons in read-only mode', () => {
      render(
        <DataSourceView
          dataSources={mockDataSources}
          onAdd={mockOnAdd}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          isReadOnly={true}
        />
      );

      const editButtons = screen.queryAllByTitle('Edit');
      expect(editButtons.length).toBe(0);
    });

    it('hides delete buttons in read-only mode', () => {
      render(
        <DataSourceView
          dataSources={mockDataSources}
          onAdd={mockOnAdd}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          isReadOnly={true}
        />
      );

      const deleteButtons = screen.queryAllByTitle('Delete');
      expect(deleteButtons.length).toBe(0);
    });
  });

  describe('Data Source Types', () => {
    it('displays connection string for SQL databases', () => {
      render(
        <DataSourceView
          dataSources={mockDataSources}
          onAdd={mockOnAdd}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText(/user@localhost:5432\/testdb/i)).toBeInTheDocument();
    });

    it('shows correct type badge', () => {
      render(
        <DataSourceView
          dataSources={mockDataSources}
          onAdd={mockOnAdd}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('POSTGRES')).toBeInTheDocument();
    });

    it('displays view count when views exist', () => {
      const dsWithViews: DataSource = {
        ...mockDataSources[0],
        views: [
          {
            id: 'v1',
            name: 'view1',
            exposed: true,
            columns: []
          }
        ]
      };

      render(
        <DataSourceView
          dataSources={[dsWithViews]}
          onAdd={mockOnAdd}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText(/1 Tables, 1 Views/i)).toBeInTheDocument();
    });
  });
});
