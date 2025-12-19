
export type ColumnType = 'string' | 'number' | 'date' | 'boolean' | 'currency';

export interface ColumnDef {
  id: string;
  name: string;
  type: ColumnType;
  isPii?: boolean; // Personally Identifiable Information
  alias?: string; // User-friendly name
  description?: string;
  sampleValue?: string; // Sample data for preview
  isNullable?: boolean;
  isPrimaryKey?: boolean;
  isUnique?: boolean;
}

export interface ForeignKey {
  id: string;
  name: string;
  columnName: string;
  referencedTable: string;
  referencedColumn: string;
  onDelete?: string;
  onUpdate?: string;
}

export interface Index {
  id: string;
  name: string;
  columns: string[];
  isUnique: boolean;
  isPrimary: boolean;
}

export interface Constraint {
  id: string;
  name: string;
  type: 'PRIMARY KEY' | 'UNIQUE' | 'CHECK' | 'FOREIGN KEY' | 'DEFAULT';
  columns: string[];
  definition?: string;
}

export interface TableDef {
  id: string;
  name: string;
  description?: string;
  alias?: string; // User-friendly name
  columns: ColumnDef[];
  exposed: boolean; // Admin toggle to expose for reporting
  foreignKeys?: ForeignKey[];
  indexes?: Index[];
  constraints?: Constraint[];
}

export interface ViewDef {
  id: string;
  name: string;
  description?: string;
  alias?: string;
  columns: ColumnDef[];
  definition?: string;
  exposed: boolean;
}

export interface ConnectionDetails {
    host: string;
    port: string;
    database: string;
    username: string;
    password?: string; // In a real app, handle securely
}

export interface DataSource {
  id: string;
  name: string;
  description: string;
  type: 'postgres' | 'mysql' | 'snowflake' | 'custom';
  connectionDetails?: ConnectionDetails;
  tables: TableDef[];
  views?: ViewDef[];
  created_at: string;
}

// Report Configuration
export type Aggregation = 'none' | 'sum' | 'avg' | 'count' | 'min' | 'max';
export type SortDirection = 'asc' | 'desc';

export interface ReportColumn {
  tableId: string;
  columnId: string;
  alias?: string;
  aggregation?: Aggregation;
}

export interface FilterCondition {
  id: string;
  tableId: string;
  columnId: string;
  operator: 'equals' | 'contains' | 'gt' | 'lt' | 'between';
  value: string;
}

export interface SortCondition {
  tableId: string;
  columnId: string;
  direction: SortDirection;
}

export interface ScheduleConfig {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string;
}

export type VisualizationType = 'table' | 'bar' | 'line' | 'pie' | 'area';

export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface ReportConfig {
  id: string;
  dataSourceId: string;
  ownerId: string;
  visibility: 'public' | 'private';
  name: string;
  description?: string;
  selectedColumns: ReportColumn[];
  filters: FilterCondition[];
  sorts: SortCondition[];
  groupBy?: ReportColumn[];
  visualization: VisualizationType;
  schedule: ScheduleConfig;
  created_at: string;
}

export interface ReportSnapshot {
  id: string;
  reportId: string;
  timestamp: string;
  data: any[];
}
