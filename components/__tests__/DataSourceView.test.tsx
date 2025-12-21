import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../tests/utils';
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
});
