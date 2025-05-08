import { LeaderboardData, ProblemStats, Submission, SubmissionStats } from "@/types/leaderboard";

// Helper function to check if a submission is valid (has actual results)
function isValidSubmission(submission: Submission): boolean {
  // Check if it has a valid name and at least one result
  if (!submission.name || submission.name === "" || 
      submission.name === "Leaderboard" || 
      submission.name === "checking leaderboard") {
    return false;
  }
  
  // Check if it has at least one valid result
  const hasValidResults = Object.values(submission.results).some(result => 
    result !== null && !isNaN(Number(result?.score))
  );
  
  return hasValidResults;
}

export function getProblems(data: LeaderboardData): string[] {
  const validData = data.filter(isValidSubmission);
  if (validData.length === 0) return [];
  
  // Get the first submission with results
  const submission = validData.find(s => Object.keys(s.results).length > 0);
  if (!submission) return [];
  
  return Object.keys(submission.results).filter(key => key !== 'Total time');
}

interface SubmissionWithTotalScore extends Submission {
  totalScore: number;
  solvedProblems: number;
}

export function calculateTotalScores(data: LeaderboardData): SubmissionWithTotalScore[] {
  // Filter out submissions with no results
  const validData = data.filter(isValidSubmission);
  
  return validData.map(submission => {
    const results = submission.results;
    let totalScore = 0;
    let problemCount = 0;
    
    Object.values(results).forEach(result => {
      if (result) {
        // Ensure score is a valid number
        const score = Number(result.score);
        if (!isNaN(score)) {
          totalScore += score;
          problemCount++;
        }
      }
    });
    
    // For submissions that haven't solved any problems, set totalScore to Infinity
    // so they are ranked last
    return {
      ...submission,
      totalScore: problemCount > 0 ? totalScore : Infinity,
      solvedProblems: problemCount
    } as SubmissionWithTotalScore;
  })
  .sort((a: SubmissionWithTotalScore, b: SubmissionWithTotalScore) => {
    // First sort by total score
    if (a.totalScore !== b.totalScore) {
      return a.totalScore - b.totalScore;
    }
    // If total scores are equal, sort by the number of solved problems (more is better)
    return b.solvedProblems - a.solvedProblems;
  });
}

export function getProblemStats(data: LeaderboardData): ProblemStats[] {
  const problems = getProblems(data);
  const validData = data.filter(isValidSubmission);
  
  return problems.map(problem => {
    // Get submissions that actually solved this problem
    const validResults = validData
      .filter(submission => 
        // Only include results that are not null (not "--") and have valid scores
        submission.results[problem] !== null && 
        !isNaN(Number(submission.results[problem]?.score))
      )
      .map(submission => {
        const score = Number(submission.results[problem]?.score || 0);
        return {
          score: isNaN(score) ? Infinity : score, // Use Infinity for invalid scores so they don't win
          name: submission.name,
          time: Number(submission.results[problem]?.time || 0)
        };
      });
    
    // Count how many submissions did not solve this problem
    const unsolvedCount = validData.filter(
      submission => submission.results[problem] === null
    ).length;
    
    if (validResults.length === 0) {
      return {
        name: problem,
        bestScore: 0,
        bestSubmission: "None",
        averageScore: 0,
        solvedCount: 0,
        unsolvedCount,
        totalSubmissions: validData.length
      };
    }
    
    // Find the best (lowest) score
    const bestResult = validResults.reduce(
      (best, current) => current.score < best.score ? current : best,
      validResults[0]
    );
    
    // Calculate average (only of valid scores)
    const sum = validResults.reduce((acc, curr) => acc + curr.score, 0);
    const average = sum / validResults.length;
    
    return {
      name: problem,
      bestScore: bestResult.score,
      bestSubmission: bestResult.name,
      averageScore: average,
      solvedCount: validResults.length,
      unsolvedCount,
      totalSubmissions: validData.length
    };
  });
}

export function getSubmissionStats(data: LeaderboardData): SubmissionStats[] {
  const problems = getProblems(data);
  const problemStats = getProblemStats(data);
  const validData = data.filter(isValidSubmission);
  
  return validData.map(submission => {
    let totalScore = 0;
    let solvedProblems = 0;
    const problemScores: { problem: string; score: number; ratio: number; time: number }[] = [];
    const unsolvedProblems: string[] = [];
    
    problems.forEach(problem => {
      const result = submission.results[problem];
      
      // Track unsolved problems
      if (!result) {
        unsolvedProblems.push(problem);
        return;  // Skip unsolved problems
      }
      
      // Ensure score is a valid number
      const score = Number(result.score);
      if (isNaN(score)) return;
      
      totalScore += score;
      solvedProblems++;
      
      // Find the best score for this problem
      const bestScore = problemStats.find(p => p.name === problem)?.bestScore || score;
      
      // Calculate ratio (how close to the best; 1.0 means it's the best)
      const ratio = bestScore / score;
      
      problemScores.push({
        problem,
        score,
        ratio: isNaN(ratio) ? 0 : ratio,
        time: Number(result.time || 0)
      });
    });
    
    // Sort by ratio (descending)
    problemScores.sort((a, b) => b.ratio - a.ratio);
    
    // Get top 3 and bottom 3 problems (only from problems they actually solved)
    const bestProblems = problemScores.slice(0, Math.min(3, problemScores.length)).map(p => p.problem);
    const worstProblems = problemScores.length >= 3 
      ? problemScores.slice(-Math.min(3, problemScores.length)).map(p => p.problem)
      : [];
    
    // Calculate average score (only for solved problems)
    const averageScore = solvedProblems > 0
      ? totalScore / solvedProblems
      : 0;
    
    return {
      name: submission.name,
      totalScore,
      bestProblems,
      worstProblems,
      averageScore,
      solvedProblems,
      unsolvedProblems,
      totalProblems: problems.length
    } as SubmissionStats;
  });
}

export function getOverallWinner(data: LeaderboardData): Submission | null {
  const validData = data.filter(isValidSubmission);
  if (validData.length === 0) return null;
  
  const scoresWithTotal = calculateTotalScores(validData);
  
  // Filter out submissions with Infinity score (couldn't solve any problem)
  const validScores = scoresWithTotal.filter(s => s.totalScore !== Infinity && s.solvedProblems > 0);
  
  if (validScores.length === 0) return null;
  
  // Sort by total score (ascending as lower is better)
  validScores.sort((a: SubmissionWithTotalScore, b: SubmissionWithTotalScore) => {
    // First sort by total score
    if (a.totalScore !== b.totalScore) {
      return a.totalScore - b.totalScore;
    }
    // If total scores are equal, sort by the number of solved problems (more is better)
    return b.solvedProblems - a.solvedProblems;
  });
  
  return validScores[0];
}

export function getProblemWinners(data: LeaderboardData): Record<string, string> {
  const problems = getProblems(data);
  const validData = data.filter(isValidSubmission);
  const results: Record<string, string> = {};
  
  problems.forEach(problem => {
    // Filter for submissions that actually solved this problem
    const validSubmissions = validData.filter(
      submission => 
        submission.results[problem] !== null &&
        !isNaN(Number(submission.results[problem]?.score))
    );
    
    if (validSubmissions.length === 0) {
      results[problem] = "No winner";
      return;
    }
    
    // Find submission with lowest score for this problem
    const winner = validSubmissions.reduce((best, current) => {
      const bestScore = Number(best.results[problem]?.score || Infinity);
      const currentScore = Number(current.results[problem]?.score || Infinity);
      
      return currentScore < bestScore ? current : best;
    }, validSubmissions[0]);
    
    results[problem] = winner.name;
  });
  
  return results;
} 