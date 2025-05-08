export interface LogEntry {
  Instance: string;
  Time: string;
  Result: string;
  Solution: string;
}

export interface InstanceMetadata {
  numCustomers: number;
  numVehicles: number;
  identifier: number;
}

export interface ParsedLogEntry extends LogEntry {
  metadata: InstanceMetadata;
}

export interface LogFile {
  filename: string;
  entries: ParsedLogEntry[];
}

export type LogComparisonData = LogFile[]; 