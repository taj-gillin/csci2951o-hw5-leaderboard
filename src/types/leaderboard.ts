export interface ResultEntry {
  score: number;  // Lower is better, represents the distance
  time: number;   // Time in seconds it took to solve
}

export interface Submission {
  rank: number;
  name: string;
  totalTime: number;
  results: {
    [key: string]: ResultEntry | null;  // null represents unsolved problems ("--" [300])
  };
}

export type LeaderboardData = Submission[];

export interface ProblemStats {
  name: string;
  bestScore: number;        // Lowest score (best solution)
  bestSubmission: string;   // Name of submission with best score
  averageScore: number;     // Average of all valid scores
  solvedCount: number;      // Number of submissions that solved this problem
  unsolvedCount: number;    // Number of submissions that couldn't solve this problem
  totalSubmissions: number; // Total valid submissions
}

export interface SubmissionStats {
  name: string;
  totalScore: number;       // Sum of all solved problem scores
  bestProblems: string[];   // Problems where this submission performed best
  worstProblems: string[];  // Problems where this submission performed worst
  averageScore: number;     // Average score across solved problems
  solvedProblems: number;   // Number of problems this submission solved
  unsolvedProblems: string[]; // Names of problems this submission couldn't solve
  totalProblems: number;    // Total number of problems
} 