"use client";

import { LeaderboardData } from "@/types/leaderboard";
import React, { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface LeaderboardTableProps {
  data: LeaderboardData;
}

export default function LeaderboardTable({ data }: LeaderboardTableProps) {
  // Check if a submission is valid (has actual results)
  const isValidSubmission = (submission: any) => {
    if (!submission.name || 
        submission.name === "" || 
        submission.name === "Leaderboard" || 
        submission.name === "checking leaderboard") {
      return false;
    }
    
    // Check if it has at least one valid result
    return Object.values(submission.results).some(result => 
      result !== null && !isNaN(Number((result as any)?.score))
    );
  };

  // Calculate number of solved problems for each submission
  const submissionsWithStats = useMemo(() => {
    return data.map(submission => {
      const results = submission.results;
      let solvedCount = 0;
      let totalProblems = 0;
      
      Object.entries(results).forEach(([problemName, result]) => {
        // Skip if problem is "Total time"
        if (problemName === "Total time") return;
        
        totalProblems++;
        if (result !== null && !isNaN(Number((result as any)?.score))) {
          solvedCount++;
        }
      });
      
      return {
        ...submission,
        solvedCount,
        totalProblems,
        isValid: isValidSubmission(submission)
      };
    });
  }, [data]);

  if (!data || data.length === 0) {
    return <div className="text-center py-4">No data available</div>;
  }

  // Get problem names from the first submission with data
  const firstSubmission = data.find((submission) => 
    Object.keys(submission.results).length > 0
  );
  
  if (!firstSubmission) {
    return <div className="text-center py-4">No result data available</div>;
  }
  
  // Filter out "Total time" from problem names
  const problemNames = Object.keys(firstSubmission.results)
    .filter(key => key !== "Total time");
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Leaderboard Data</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">Rank</TableHead>
                <TableHead>Submission Name</TableHead>
                <TableHead className="text-center">Total Time</TableHead>
                <TableHead className="text-center">Solved</TableHead>
                {problemNames.map((problem) => (
                  <TableHead key={problem} className="text-center whitespace-nowrap">
                    {problem}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissionsWithStats.map((submission, index) => (
                <TableRow 
                  key={`${submission.name}-${index}`}
                  className={cn(
                    // Dim out invalid submissions
                    !submission.isValid && "opacity-50",
                    // Highlight rows with no solved problems
                    submission.solvedCount === 0 && "bg-red-50 dark:bg-red-950/20"
                  )}
                >
                  <TableCell className="text-center font-medium">{submission.rank}</TableCell>
                  <TableCell className="font-medium">
                    {submission.name}
                    {!submission.isValid && (
                      <span className="ml-2 text-xs text-muted-foreground">(invalid)</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">{submission.totalTime || "-"}</TableCell>
                  <TableCell className="text-center">
                    {submission.solvedCount}/{submission.totalProblems}
                  </TableCell>
                  
                  {problemNames.map((problem) => {
                    const result = submission.results[problem];
                    
                    return (
                      <TableCell 
                        key={problem} 
                        className={cn(
                          "text-center whitespace-nowrap",
                          // Highlight unsolved problems
                          !result && "bg-gray-100 dark:bg-gray-800/50 text-muted-foreground"
                        )}
                      >
                        {result 
                          ? `${result.score.toFixed(2)} [${result.time.toFixed(2)}]` 
                          : "-- [300.00]"  // Unsolved problems show -- for score and 300 for time
                        }
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
} 