import { LeaderboardData, Submission } from "@/types/leaderboard";
import { UnifiedDataItem } from "@/types/unified";
import { parseGenericInstanceName } from "./commonParserUtils";
import { v4 as uuidv4 } from 'uuid';

// Define interfaces for the expected structure of Gradescope leaderboard JSON
interface LeaderboardColumn {
  name: string;
  order?: string; // Optional, as not all columns might have it
  // Add other properties if they exist and are needed, e.g., type, hidden, etc.
}

// Updated LeaderboardEntry interface
interface LeaderboardEntry {
  name: string; 
  "Total time"?: number;
  assignment_submission_id?: number;
  // For dynamic problem instance keys, their values are strings (e.g., "SCORE [TIME]" or "-- [TIME]") or null/undefined
  [problemInstance: string]: string | number | null | undefined; 
}

/**
 * Parses the client-side rendered HTML of a Gradescope-like leaderboard table
 * by extracting data from a JSON blob embedded in a data-react-props attribute.
 * @param html The HTML string of the leaderboard page.
 * @param sourceFileName The name of the HTML file being parsed (optional).
 * @returns UnifiedDataItem[] An array of unified data items.
 */
export function parseLeaderboardHtmlToUnifiedData(
  html: string, 
  sourceFileName: string = "leaderboard.html"
): UnifiedDataItem[] {
  const unifiedItems: UnifiedDataItem[] = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const leaderboardDiv = doc.querySelector('div[data-react-class="Leaderboard"]');
  if (!leaderboardDiv) {
    console.warn("Could not find the Leaderboard data-react-props div in the HTML.");
    return [];
  }

  const reactPropsJson = leaderboardDiv.getAttribute('data-react-props');
  if (!reactPropsJson) {
    console.warn("Could not find data-react-props attribute on the Leaderboard div.");
    return [];
  }

  let leaderboardData: { columns: LeaderboardColumn[], entries: LeaderboardEntry[] };
  try {
    leaderboardData = JSON.parse(reactPropsJson);
  } catch (error) {
    console.error("Failed to parse leaderboard JSON:", error);
    return [];
  }

  const { columns, entries } = leaderboardData;
  if (!columns || !entries || !Array.isArray(columns) || !Array.isArray(entries)) {
    console.warn("Invalid leaderboard data structure in JSON.");
    return [];
  }

  // Identify problem instance columns. These are columns that are not "Total time", "Rank", "Name", etc.
  // Gradescope data-react-props has columns as an array of objects like {name: "colName", order: "asc/desc"} or just {name: "colName"}
  const knownNonProblemColumns = ["Total time", "Rank", "Submission Name", "Avg Time", "Submissions", "Problems Solved", "name", "assignment_submission_id"];
  const problemInstanceColumns = columns
    .map((col: LeaderboardColumn) => col.name) // Extract the name from each column object
    .filter((name: string) => name && !knownNonProblemColumns.includes(name));

  entries.forEach((entry: LeaderboardEntry) => {
    const participantName = entry.name || "Unknown Participant";

    problemInstanceColumns.forEach((problemInstance: string) => {
      const cellContent = entry[problemInstance]; // Direct access using problem instance name as key

      if (cellContent === undefined || cellContent === null) return; // Skip if problem not present for this entry

      const parsedNameDetails = parseGenericInstanceName(problemInstance);
      
      let score: number | null = null;
      let time: number | null = null;
      let isUnsolved = true;

      const cellContentStr = String(cellContent).trim();

      if (cellContentStr === "--" || cellContentStr === "" || cellContentStr.startsWith("-- [") ) { // Handles "--" and "-- [time]"
        isUnsolved = true;
        // Check if time is still present in "-- [time]" format
        const timeMatchInUnsolved = cellContentStr.match(/--\s*\[([\d.]+)\]/);
        if (timeMatchInUnsolved) {
            time = parseFloat(timeMatchInUnsolved[1]);
        }

      } else {
        // Format is "SCORE [TIME]" e.g., "4388.34 [0.21]" or just "SCORE"
        const scoreTimeMatch = cellContentStr.match(/^([\d.-]+)(?:\s*\[([\d.]+)\])?$/);

        if (scoreTimeMatch) {
          score = parseFloat(scoreTimeMatch[1]);
          if (scoreTimeMatch[2]) { // If time is captured
            time = parseFloat(scoreTimeMatch[2]);
          }
          isUnsolved = false;
        } else {
          // If no match, treat as unsolved or log an error
          // console.warn(\`Could not parse cell content: "${cellContentStr}" for ${participantName} on ${problemInstance}\`);
          isUnsolved = true; 
        }
      }
      
      const item: UnifiedDataItem = {
        id: uuidv4(),
        sourceName: sourceFileName,
        entryOwner: participantName,
        instance: problemInstance,
        numCustomers: parsedNameDetails.numCustomers,
        numVehicles: parsedNameDetails.numVehicles,
        problemVariant: parsedNameDetails.problemVariant,
        baseInstanceName: parsedNameDetails.baseInstanceName,
        score,
        time,
        solutionString: null, 
        isUnsolved,
        sourceType: 'leaderboard',
      };
      unifiedItems.push(item);
    });
  });

  return unifiedItems;
}


// Old parseClientSide - to be deprecated or removed
/**
 * Parses the client-side rendered HTML of the leaderboard table.
 * @param html The HTML string of the leaderboard page.
 * @returns LeaderboardData An array of submission objects.
 */
export function parseClientSide(html: string): LeaderboardData {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const submissions: Submission[] = [];

  // Attempt to find the table based on common leaderboard structures
  // This might need adjustment if the HTML structure is different
  const table = doc.querySelector("table"); // A simple selector, might need to be more specific
  if (!table) {
    console.error("Leaderboard table not found in HTML content.");
    return [];
  }

  const headers: string[] = [];
  table.querySelectorAll("thead th").forEach(th => {
    headers.push(th.textContent?.trim() || "");
  });

  const rankIndex = headers.findIndex(h => h.toLowerCase().includes("rank"));
  const nameIndex = headers.findIndex(h => h.toLowerCase().includes("name"));
  const totalTimeIndex = headers.findIndex(h => h.toLowerCase().includes("total time"));
  // Find first problem column index. This assumes problems start after some known columns.
  // A more robust method would be to identify problem columns by a pattern or a specific range.
  const firstProblemIndex = Math.max(rankIndex, nameIndex, totalTimeIndex) + 1; 

  table.querySelectorAll("tbody tr").forEach(row => {
    const cells = Array.from(row.querySelectorAll("td"));
    const submission: Submission = {
      rank: parseInt(cells[rankIndex]?.textContent || "0"),
      name: cells[nameIndex]?.textContent?.trim() || "Unknown",
      totalTime: parseFloat(cells[totalTimeIndex]?.textContent || "0"),
      results: {},
    };

    for (let i = firstProblemIndex; i < headers.length; i++) {
      const problemName = headers[i];
      if (!problemName) continue; // Skip empty header cells

      const cellContent = cells[i]?.textContent?.trim();
      if (cellContent && cellContent !== "--" && cellContent !== "") {
        // Try to parse "Score (Time)" format
        // const match = cellContent.match(/([\\d.]+)\\s*\\((.*?)s\\)/); // Original regex for "Score (Time)s"
        const match = cellContent.match(/^([\d.-]+)(?:\s*\[([\d.]+)\])?$/); // Corrected regex // For "Score [Time]" or "Score"
        if (match) {
          submission.results[problemName] = {
            score: parseFloat(match[1]),
            // time: parseFloat(match[2]), // This was for (Time)s
            time: match[2] ? parseFloat(match[2]) : 0, // For [Time]
          };
        } else {
          // Fallback for only score, or if parsing fails
          const scoreOnly = parseFloat(cellContent);
          if (!isNaN(scoreOnly)) {
            submission.results[problemName] = {
              score: scoreOnly,
              time: 0, // Or some other default/flag for missing time
            };
          }
        }
      } else {
        submission.results[problemName] = null; // Mark as unsolved
      }
    }
    submissions.push(submission);
  });

  return submissions;
} 