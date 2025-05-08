"use client";

import { LeaderboardData, Submission } from "@/types/leaderboard";
import React, { useMemo } from "react";
import { ResponsiveBar } from "@nivo/bar";
import { calculateTotalScores } from "@/utils/leaderboardAnalytics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface TotalScoreChartProps {
  data: LeaderboardData;
}

interface SubmissionWithTotalScore extends Submission {
  totalScore: number;
  solvedProblems: number;
}

// Helper function to check if a submission is valid (has actual results)
function isValidSubmission(submission: Submission): boolean {
  // Check if it has a valid name and at least one result
  if (!submission.name || 
      submission.name === "" || 
      submission.name === "Leaderboard" || 
      submission.name === "checking leaderboard") {
    return false;
  }
  
  // Check if it has at least one valid result
  const hasValidResults = Object.entries(submission.results)
    .filter(([key]) => key !== "Total time")
    .some(([_, result]) => 
      result !== null && !isNaN(Number(result?.score))
    );
  
  return hasValidResults;
}

export default function TotalScoreChart({ data }: TotalScoreChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // Filter valid submissions first
    const validSubmissions = data.filter(isValidSubmission);
    
    const scoresWithTotal = calculateTotalScores(validSubmissions)
      // Filter out submissions with Infinity score (couldn't solve any problem)
      .filter(submission => submission.totalScore !== Infinity);
    
    // Sort by total score (ascending as lower is better)
    scoresWithTotal.sort((a: SubmissionWithTotalScore, b: SubmissionWithTotalScore) => 
      (a as SubmissionWithTotalScore).totalScore - (b as SubmissionWithTotalScore).totalScore
    );
    
    // Ensure all values are valid numbers
    return scoresWithTotal.map((submission: SubmissionWithTotalScore) => {
      const score = Number(submission.totalScore);
      return {
        name: submission.name,
        totalScore: isNaN(score) ? 0 : score, // Ensure no NaN values
        solvedProblems: submission.solvedProblems
      };
    });
  }, [data]);

  // Calculate number of submissions with no solved problems
  const unsolvedSubmissionsCount = useMemo(() => {
    const validSubmissions = data.filter(submission => 
      submission.name && 
      submission.name !== "Leaderboard" && 
      submission.name !== "checking leaderboard"
    );
    
    const withoutSolvedProblems = validSubmissions.filter(submission => {
      // Count submissions where all problems have null results (i.e., "--")
      const hasAnySolved = Object.entries(submission.results)
        .filter(([key]) => key !== "Total time")
        .some(([_, result]) => result !== null);
      
      return !hasAnySolved;
    });
    
    return withoutSolvedProblems.length;
  }, [data]);

  if (chartData.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Total Scores</CardTitle>
          <CardDescription>Lower score is better</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-6">
          <p className="mb-2">No valid score data available. Submissions must have at least one solved problem.</p>
          {unsolvedSubmissionsCount > 0 && (
            <p className="text-sm text-muted-foreground">
              {unsolvedSubmissionsCount} submission(s) timed out on all problems with "--" [300]
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Total Scores</CardTitle>
        <CardDescription>
          Lower score is better
          {unsolvedSubmissionsCount > 0 && (
            <span className="block text-sm text-muted-foreground mt-1">
              Note: {unsolvedSubmissionsCount} submission(s) with all "--" [300] are not shown
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-96">
          {chartData.length > 0 && (
            <ResponsiveBar
              data={chartData}
              keys={['totalScore']}
              indexBy="name"
              margin={{ top: 10, right: 30, bottom: 70, left: 80 }}
              padding={0.3}
              layout="horizontal"
              valueScale={{ type: 'linear' }}
              indexScale={{ type: 'band', round: true }}
              colors={{ scheme: 'nivo' }}
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: 'Total Score',
                legendPosition: 'middle',
                legendOffset: 45,
                truncateTickAt: 0
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: 'Submission',
                legendPosition: 'middle',
                legendOffset: -60,
                truncateTickAt: 0
              }}
              labelSkipWidth={12}
              labelSkipHeight={12}
              labelTextColor={{
                from: 'color',
                modifiers: [
                  [
                    'darker',
                    1.6
                  ]
                ]
              }}
              role="application"
              ariaLabel="Total scores bar chart"
              barAriaLabel={e => `${e.id}: ${e.formattedValue} for ${e.indexValue}`}
              tooltip={({ id, value, color, indexValue }) => {
                const submission = chartData.find(item => item.name === indexValue);
                return (
                  <div
                    style={{
                      padding: 12,
                      background: 'white',
                      border: '1px solid #ccc',
                      borderRadius: 4,
                      boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                    }}
                  >
                    <div style={{ color: '#666' }}>Submission:</div>
                    <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{indexValue}</div>
                    <div style={{ color: '#666' }}>Total Score:</div>
                    <div style={{ fontWeight: 'bold', color }}>{value.toLocaleString()}</div>
                    {submission && (
                      <>
                        <div style={{ color: '#666', marginTop: 4 }}>Problems solved:</div>
                        <div style={{ fontWeight: 'bold' }}>{submission.solvedProblems}</div>
                      </>
                    )}
                  </div>
                );
              }}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
} 