import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  listReports,
  getReport,
  createReport,
  updateReport,
  deleteReport
} from '../reportService';
import { ReportConfig } from '../../types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('reportService', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('listReports', () => {
    it('fetches all reports', async () => {
      const mockReports: ReportConfig[] = [
        {
          id: '1',
          name: 'Report 1',
          dataSourceId: 'ds-1',
          selectedColumns: [],
          visualization: 'table',
          filters: [],
          sorts: []
        },
        {
          id: '2',
          name: 'Report 2',
          dataSourceId: 'ds-2',
          selectedColumns: [],
          visualization: 'bar',
          filters: [],
          sorts: []
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockReports
      });

      const result = await listReports();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/reports')
      );
      expect(result).toEqual(mockReports);
    });

    it('throws error on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      await expect(listReports()).rejects.toThrow('Failed to list reports (500)');
    });
  });

  describe('getReport', () => {
    it('fetches a single report by ID', async () => {
      const mockReport: ReportConfig = {
        id: 'report-1',
        name: 'Test Report',
        dataSourceId: 'ds-1',
        selectedColumns: [{ tableId: 't1', columnId: 'c1' }],
        visualization: 'table',
        filters: [],
        sorts: []
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockReport
      });

      const result = await getReport('report-1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/reports/report-1')
      );
      expect(result).toEqual(mockReport);
    });

    it('throws error when report not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      await expect(getReport('nonexistent')).rejects.toThrow('Failed to get report (404)');
    });
  });

  describe('createReport', () => {
    it('creates a new report', async () => {
      const payload: ReportConfig = {
        id: '',
        name: 'New Report',
        dataSourceId: 'ds-1',
        selectedColumns: [{ tableId: 't1', columnId: 'c1' }],
        visualization: 'bar',
        filters: [],
        sorts: []
      };

      const mockResponse: ReportConfig = {
        ...payload,
        id: 'new-report-id'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await createReport(payload);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/reports'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      );
      expect(result).toEqual(mockResponse);
      expect(result.id).toBe('new-report-id');
    });

    it('throws error on validation failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Validation error'
      });

      await expect(createReport({} as ReportConfig)).rejects.toThrow('Failed to create report (400): Validation error');
    });
  });

  describe('updateReport', () => {
    it('updates an existing report', async () => {
      const payload: ReportConfig = {
        id: 'report-1',
        name: 'Updated Report',
        dataSourceId: 'ds-1',
        selectedColumns: [{ tableId: 't1', columnId: 'c1' }],
        visualization: 'line',
        filters: [{ columnId: 'c1', operator: 'equals', value: 'test' }],
        sorts: [{ columnId: 'c1', direction: 'asc' }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => payload
      });

      const result = await updateReport('report-1', payload);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/reports/report-1'),
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      );
      expect(result).toEqual(payload);
    });

    it('throws error when report not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Report not found'
      });

      await expect(
        updateReport('nonexistent', {} as ReportConfig)
      ).rejects.toThrow('Failed to update report (404): Report not found');
    });
  });

  describe('deleteReport', () => {
    it('deletes a report', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true
      });

      await deleteReport('report-1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/reports/report-1'),
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });

    it('throws error when report not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Report not found'
      });

      await expect(deleteReport('nonexistent')).rejects.toThrow('Failed to delete report (404): Report not found');
    });
  });
});

