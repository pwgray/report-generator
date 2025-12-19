import { ReportConfig } from '../types';

// Determine API base URL from environment (Vite prefers VITE_ prefix in the browser)
export const apiUrl = (() => {
  const env = (typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined) || {};
  const raw = env?.VITE_API_URL || env?.API_URL || process.env?.API_URL || '';
  if (!raw) return '';
  // normalize by trimming trailing slash
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
})();

// Helper to build URLs consistently
const buildUrl = (path: string) => {
  if (!apiUrl) return `/${path.replace(/^\//, '')}`;
  const base = apiUrl.replace(/\/+$/, '');
  if (base.endsWith('/api')) return `${base}/${path.replace(/^\/(api\/)?/, '')}`;
  return `${base}/api/${path.replace(/^\//, '')}`;
};

// List all reports
export const listReports = async (): Promise<ReportConfig[]> => {
  const url = buildUrl('/reports');
  console.debug('[reportService] listReports', { url });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to list reports (${res.status})`);
  return res.json();
};

// Get a single report by ID
export const getReport = async (id: string): Promise<ReportConfig> => {
  const url = buildUrl(`/reports/${id}`);
  console.debug('[reportService] getReport', { url, id });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to get report (${res.status})`);
  return res.json();
};

// Create a new report
export const createReport = async (payload: ReportConfig): Promise<ReportConfig> => {
  const url = buildUrl('/reports');
  console.debug('[reportService] createReport', { url, payload });
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Failed to create report (${res.status}): ${txt || 'no body'}`);
  }
  return res.json();
};

// Update an existing report
export const updateReport = async (id: string, payload: ReportConfig): Promise<ReportConfig> => {
  const url = buildUrl(`/reports/${id}`);
  console.debug('[reportService] updateReport', { url, id, payload });
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Failed to update report (${res.status}): ${txt || 'no body'}`);
  }
  return res.json();
};

// Delete a report
export const deleteReport = async (id: string): Promise<void> => {
  const url = buildUrl(`/reports/${id}`);
  console.debug('[reportService] deleteReport', { url, id });
  const res = await fetch(url, { method: 'DELETE' });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Failed to delete report (${res.status}): ${txt || 'no body'}`);
  }
  return;
};

