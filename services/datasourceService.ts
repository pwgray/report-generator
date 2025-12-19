import { ConnectionDetails, TableDef } from '../types';

// Determine API base URL from environment (Vite prefers VITE_ prefix in the browser)
export const apiUrl = (() => {
  const env = (typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined) || {};
  const raw = env?.VITE_API_URL || env?.API_URL || process.env?.API_URL || '';
  if (!raw) return '';
  // normalize by trimming trailing slash
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
})();

export const testConnectionAndFetchSchema = async (type: string, connectionDetails: ConnectionDetails): Promise<TableDef[]> => {
    // Build URL safely — prefer configured apiUrl, otherwise use relative path
  const buildUrl = (path: string) => {
    if (!apiUrl) return `/${path.replace(/^\//, '')}`;
    const base = apiUrl.replace(/\/+$/, '');
    if (base.endsWith('/api')) return `${base}/${path.replace(/^\/(api\/)?/, '')}`;
    return `${base}/api/${path.replace(/^\//, '')}`;
  };

  const url = buildUrl('/datasources/test-connection');
  if (!apiUrl) console.warn('[datasourceService] VITE_API_URL not set, using relative URL:', url);
  console.debug('[datasourceService] calling testConnectionAndFetchSchema', { url, type, connectionDetails: { ...connectionDetails, password: connectionDetails.password ? '***' : undefined } });

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, connectionDetails })
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || 'Failed to fetch schema');
  }

  const tables = await res.json();
  return tables;
};

export const fetchTableData = async (dataSourceOrId: string | any, table: string, columns: string[], limit = 5000000): Promise<any[]> => {
  const buildUrl = (path: string) => {
    if (!apiUrl) return `/${path.replace(/^\//, '')}`;
    const base = apiUrl.replace(/\/+$/, '');
    if (base.endsWith('/api')) return `${base}/${path.replace(/^\/(api\/)?/, '')}`;
    return `${base}/api/${path.replace(/^\//, '')}`;
  };

  const url = buildUrl('/datasources/query');
  if (!apiUrl) console.warn('[datasourceService] VITE_API_URL not set, using relative URL:', url);
  console.debug('[datasourceService] fetchTableData', { url, dataSourceOrId, table, columns, limit });

  const bodyPayload: any = { table, columns, limit };
  if (typeof dataSourceOrId === 'string') bodyPayload.dataSourceId = dataSourceOrId;
  else bodyPayload.dataSource = dataSourceOrId;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyPayload)
  });

  if (!res.ok) {
    const txt = await res.text();
    // include status for clarity
    throw new Error(`Request failed (${res.status}): ${txt || 'Failed to fetch data'}`);
  }

  try {
    return await res.json();
  } catch (e) {
    const txt = await res.text();
    throw new Error(`Invalid JSON response (${res.status}): ${txt || 'no body'}`);
  }
};

// DataSource CRUD helpers
export const listDatasources = async (): Promise<any[]> => {
  const buildUrl = (path: string) => {
    if (!apiUrl) return `/${path.replace(/^\//, '')}`;
    const base = apiUrl.replace(/\/+$/, '');
    if (base.endsWith('/api')) return `${base}/${path.replace(/^\/(api\/)?/, '')}`;
    return `${base}/api/${path.replace(/^\//, '')}`;
  };

  const url = buildUrl('/datasources');
  console.debug('[datasourceService] listDatasources', { url });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to list datasources (${res.status})`);
  return res.json();
};

export const createDatasource = async (payload: any): Promise<any> => {
  const buildUrl = (path: string) => {
    if (!apiUrl) return `/${path.replace(/^\//, '')}`;
    const base = apiUrl.replace(/\/+$/, '');
    if (base.endsWith('/api')) return `${base}/${path.replace(/^\/(api\/)?/, '')}`;
    return `${base}/api/${path.replace(/^\//, '')}`;
  };

  const url = buildUrl('/datasources');
  console.debug('[datasourceService] createDatasource', { url, payload });
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Failed to create datasource (${res.status}): ${txt || 'no body'}`);
  }
  return res.json();
};

export const updateDatasource = async (id: string, payload: any): Promise<any> => {
  const buildUrl = (path: string) => {
    if (!apiUrl) return `/${path.replace(/^\//, '')}`;
    const base = apiUrl.replace(/\/+$/, '');
    if (base.endsWith('/api')) return `${base}/${path.replace(/^\/(api\/)?/, '')}`;
    return `${base}/api/${path.replace(/^\//, '')}`;
  };

  const url = buildUrl(`/datasources/${id}`);
  console.debug('[datasourceService] updateDatasource', { url, id, payload });
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Failed to update datasource (${res.status}): ${txt || 'no body'}`);
  }
  return res.json();
};

export const deleteDatasource = async (id: string): Promise<void> => {
  const buildUrl = (path: string) => {
    if (!apiUrl) return `/${path.replace(/^\//, '')}`;
    const base = apiUrl.replace(/\/+$/, '');
    if (base.endsWith('/api')) return `${base}/${path.replace(/^\/(api\/)?/, '')}`;
    return `${base}/api/${path.replace(/^\//, '')}`;
  };

  const url = buildUrl(`/datasources/${id}`);
  console.debug('[datasourceService] deleteDatasource', { url, id });
  const res = await fetch(url, { method: 'DELETE' });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Failed to delete datasource (${res.status}): ${txt || 'no body'}`);
  }
  return;
};
