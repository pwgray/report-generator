import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  testConnectionAndFetchSchema,
  fetchTableData,
  listDatasources,
  createDatasource,
  updateDatasource,
  deleteDatasource
} from '../datasourceService';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('datasourceService', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('testConnectionAndFetchSchema', () => {
    it('sends correct request and returns schema', async () => {
      const mockResponse = {
        tables: [
          {
            id: '1',
            name: 'users',
            columns: [
              { id: 'c1', name: 'id', type: 'integer' },
              { id: 'c2', name: 'name', type: 'varchar' }
            ]
          }
        ],
        views: []
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await testConnectionAndFetchSchema('postgres', {
        host: 'localhost',
        port: '5432',
        database: 'testdb',
        username: 'user',
        password: 'pass'
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/datasources/test-connection'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('throws error when request fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'Connection failed'
      });

      await expect(
        testConnectionAndFetchSchema('postgres', {
          host: 'bad',
          port: '5432',
          database: 'db',
          username: 'user',
          password: 'pass'
        })
      ).rejects.toThrow('Connection failed');
    });
  });

  describe('fetchTableData', () => {
    it('fetches data with datasource ID', async () => {
      const mockData = [
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData
      });

      const result = await fetchTableData('ds-123', 'users', ['id', 'name'], 100);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      
      expect(body).toEqual({
        table: 'users',
        columns: ['id', 'name'],
        limit: 100,
        dataSourceId: 'ds-123'
      });
      expect(result).toEqual(mockData);
    });

    it('fetches data with datasource object', async () => {
      const mockData = [{ id: 1 }];
      const dataSource = {
        type: 'postgres',
        connectionDetails: {
          host: 'localhost',
          port: '5432',
          database: 'db',
          username: 'user',
          password: 'pass'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData
      });

      await fetchTableData(dataSource, 'users', ['id'], 50);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      
      expect(body.dataSource).toEqual(dataSource);
    });

    it('includes filters and sorts when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      const filters = [{ columnId: 'c1', operator: 'equals', value: 'test' }];
      const sorts = [{ columnId: 'c2', direction: 'asc' as const }];

      await fetchTableData('ds-1', 'table', ['col'], 100, filters, sorts);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      
      expect(body.filters).toEqual(filters);
      expect(body.sorts).toEqual(sorts);
    });

    it('throws error with status code on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Not found'
      });

      await expect(
        fetchTableData('ds-1', 'nonexistent', ['id'])
      ).rejects.toThrow('Request failed (404): Not found');
    });
  });

  describe('listDatasources', () => {
    it('fetches all datasources', async () => {
      const mockDatasources = [
        { id: '1', name: 'DB1' },
        { id: '2', name: 'DB2' }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockDatasources
      });

      const result = await listDatasources();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/datasources')
      );
      expect(result).toEqual(mockDatasources);
    });

    it('throws error on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      await expect(listDatasources()).rejects.toThrow('Failed to list datasources (500)');
    });
  });

  describe('createDatasource', () => {
    it('creates a new datasource', async () => {
      const payload = {
        name: 'New DB',
        type: 'postgres',
        connectionDetails: {}
      };

      const mockResponse = { id: 'new-id', ...payload };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await createDatasource(payload);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/datasources'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(payload)
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('throws error on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Invalid payload'
      });

      await expect(createDatasource({})).rejects.toThrow('Failed to create datasource (400): Invalid payload');
    });
  });

  describe('updateDatasource', () => {
    it('updates an existing datasource', async () => {
      const payload = { name: 'Updated Name' };
      const mockResponse = { id: 'ds-1', ...payload };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await updateDatasource('ds-1', payload);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/datasources/ds-1'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(payload)
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('throws error on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Not found'
      });

      await expect(updateDatasource('bad-id', {})).rejects.toThrow('Failed to update datasource (404): Not found');
    });
  });

  describe('deleteDatasource', () => {
    it('deletes a datasource', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true
      });

      await deleteDatasource('ds-1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/datasources/ds-1'),
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });

    it('throws error on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Not found'
      });

      await expect(deleteDatasource('bad-id')).rejects.toThrow('Failed to delete datasource (404): Not found');
    });
  });
});

