import { LogEntry } from "@/types/log"; // Keep for parsing individual log lines
import { UnifiedDataItem } from "@/types/unified";
import { parseGenericInstanceName } from "./commonParserUtils";
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs

// Parse a single log file and transform its content into UnifiedDataItem[]
export function parseLogEntries(logContent: string, logFilename: string): UnifiedDataItem[] {
  const lines = logContent.trim().split('\n');
  const unifiedItems: UnifiedDataItem[] = [];
  
  for (const line of lines) {
    try {
      if (!line.trim()) continue; // Skip empty lines
      
      const logLineEntry = JSON.parse(line) as LogEntry; // Original log entry structure
      const instanceName = logLineEntry.Instance;
      
      const parsedNameDetails = parseGenericInstanceName(instanceName);
      
      const scoreStr = logLineEntry.Result;
      const timeStr = logLineEntry.Time;
      
      const isUnsolved = scoreStr === "--" || timeStr === "--";
      const score = isUnsolved ? null : parseFloat(scoreStr);
      const time = isUnsolved ? null : parseFloat(timeStr);
      
      const item: UnifiedDataItem = {
        id: uuidv4(), // Generate a unique ID for each data item
        sourceName: logFilename, 
        entryOwner: logFilename, // For log files, the filename is the owner/solver name
        instance: instanceName,
        numCustomers: parsedNameDetails.numCustomers,
        numVehicles: parsedNameDetails.numVehicles,
        problemVariant: parsedNameDetails.problemVariant,
        baseInstanceName: parsedNameDetails.baseInstanceName,
        score,
        time,
        solutionString: logLineEntry.Solution, // Keep the original solution string
        isUnsolved,
        sourceType: 'log',
      };
      unifiedItems.push(item);
      
    } catch (error) {
      console.error(`Error parsing log entry in file ${logFilename}:`, line, error);
      // Optionally, create an error item or skip
    }
  }
  
  return unifiedItems;
}

// The old calculatePerformanceMetrics and groupByProblemSize will be removed/refactored later
// For now, they are not compatible with UnifiedDataItem[] directly.
// These will be replaced by new utility functions that operate on UnifiedData. 