export interface ParsedInstanceNameDetails {
  numCustomers: number | null;
  numVehicles: number | null;
  problemVariant: string | null; 
  baseInstanceName: string; // e.g. "101_11" or "problem_A"
}

export interface UnifiedDataItem {
  id: string;                      // Unique ID for the data item, e.g., hash of content + filename + instance + owner
  sourceName: string;              // Original filename (e.g. solver1.log, leaderboard.html)
  entryOwner: string;              // Solver/Participant name (e.g. "SolverA", "Student1") - primary key for comparison
  instance: string;                // Full instance name (e.g., "101_11_2.vrp")
  
  // Parsed from instance name
  numCustomers: number | null;
  numVehicles: number | null;      
  problemVariant: string | null;   // e.g. "2" from 101_11_2.vrp, or part after last underscore
  baseInstanceName: string;        // e.g. "101_11"

  score: number | null;            // Parsed from Result/Score. Null if unsolved.
  time: number | null;             // Parsed from Time. Null if unsolved.
  solutionString?: string | null;   // Optional, only from .log files' "Solution" field.
  
  isUnsolved: boolean;
  sourceType: 'leaderboard' | 'log';
}

export type UnifiedData = UnifiedDataItem[]; 