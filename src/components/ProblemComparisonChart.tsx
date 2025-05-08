"use client";

import { LeaderboardData, Submission } from "@/types/leaderboard";
import { getProblems, getProblemStats } from "@/utils/leaderboardAnalytics";
import React, { useState, useMemo } from "react";
import { ResponsiveBar } from "@nivo/bar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ProblemComparisonChartProps {
  data: LeaderboardData;
}

// Helper function to check if a submission is valid for a specific problem
function isValidForProblem(submission: Submission, problemName: string): boolean {
  // Skip "Total time" in problem keys
  if (problemName === "Total time") return false;
  
  const result = submission.results[problemName];
  return result !== null && !isNaN(Number(result?.score));
}

export default function ProblemComparisonChart({ data }: ProblemComparisonChartProps) {
  const problems = useMemo(() => getProblems(data), [data]);
  const problemStatsData = useMemo(() => getProblemStats(data), [data]);
  const [selectedProblem, setSelectedProblem] = useState<string>(problems[0] || '');

  // Calculate problem stats to show counts of who solved each problem
  const problemStats = useMemo(() => {
    return problems.map(problem => {
      // Find the stats for this problem
      const stats = problemStatsData.find(p => p.name === problem);
      
      return {
        name: problem,
        solvedCount: stats?.solvedCount || 0,
        unsolvedCount: stats?.unsolvedCount || 0,
        totalSubmissions: stats?.totalSubmissions || 0,
        bestScore: stats?.bestScore || 0,
        bestSubmission: stats?.bestSubmission || 'None'
      };
    });
  }, [problems, problemStatsData]);

  const chartData = useMemo(() => {
    if (!data || data.length === 0 || !selectedProblem) return [];
    
    return data
      .filter(submission => 
        // Only include submissions that actually solved this problem
        isValidForProblem(submission, selectedProblem) && 
        submission.name && 
        submission.name !== "Leaderboard" && 
        submission.name !== "checking leaderboard"
      )
      .map(submission => {
        // Ensure all values are valid numbers
        const result = submission.results[selectedProblem];
        if (!result) return null; // This should never happen due to the filter above
        
        const score = Number(result.score);
        const time = Number(result.time);
        
        return {
          name: submission.name,
          score: isNaN(score) ? 0 : score,
          time: isNaN(time) ? 0 : time
        };
      })
      .filter(Boolean) // Remove any null entries (should never happen)
      .sort((a, b) => a.score - b.score); // Sort by score (lower is better)
  }, [data, selectedProblem]);

  // Find the current problem stats
  const currentProblemStats = useMemo(() => {
    return problemStats.find(p => p.name === selectedProblem) || { 
      name: selectedProblem,
      solvedCount: 0,
      unsolvedCount: 0,
      totalSubmissions: 0,
      bestScore: 0,
      bestSubmission: 'None'
    };
  }, [problemStats, selectedProblem]);

  if (problems.length === 0) {
    return <Card className="w-full"><CardContent className="text-center py-6">No problem data available</CardContent></Card>;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Problem Performance Comparison</CardTitle>
        <CardDescription>
          Compare scores and execution times for each problem
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="problem" className="w-full">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
            <div className="flex flex-col">
              <TabsList>
                <TabsTrigger value="problem">Problem Selection</TabsTrigger>
              </TabsList>
              <div className="mt-2 space-y-1">
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">{currentProblemStats.solvedCount}</span> of <span className="font-medium">{currentProblemStats.totalSubmissions}</span> submissions solved this problem
                  {currentProblemStats.unsolvedCount > 0 && (
                    <span> ({currentProblemStats.unsolvedCount} timed out with "--" [300])</span>
                  )}
                </div>
                {currentProblemStats.bestSubmission !== 'None' && (
                  <div className="text-sm">
                    Best solution: <span className="font-medium">{currentProblemStats.bestSubmission}</span> with score <span className="font-medium">{currentProblemStats.bestScore.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-4 sm:mt-0">
              <select 
                value={selectedProblem}
                onChange={(e) => setSelectedProblem(e.target.value)}
                className="p-2 border rounded"
              >
                {problems.map((problem) => {
                  const stats = problemStats.find(p => p.name === problem);
                  return (
                    <option key={problem} value={problem}>
                      {problem} ({stats?.solvedCount || 0}/{stats?.totalSubmissions || 0} solved)
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
          
          <TabsContent value="problem" className="h-96">
            {chartData.length > 0 ? (
              <ResponsiveBar
                data={chartData}
                keys={['score', 'time']}
                indexBy="name"
                margin={{ top: 10, right: 130, bottom: 70, left: 80 }}
                padding={0.3}
                groupMode="grouped"
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
                  legend: 'Value',
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
                legends={[
                  {
                    dataFrom: 'keys',
                    anchor: 'bottom-right',
                    direction: 'column',
                    justify: false,
                    translateX: 120,
                    translateY: 0,
                    itemsSpacing: 2,
                    itemWidth: 100,
                    itemHeight: 20,
                    itemDirection: 'left-to-right',
                    itemOpacity: 0.85,
                    symbolSize: 20,
                    effects: [
                      {
                        on: 'hover',
                        style: {
                          itemOpacity: 1
                        }
                      }
                    ]
                  }
                ]}
                role="application"
                ariaLabel="Problem comparison chart"
                barAriaLabel={e => `${e.id}: ${e.formattedValue} for ${e.indexValue}`}
                tooltip={({ id, value, color, indexValue }) => (
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
                    <div style={{ color: '#666' }}>{id === 'score' ? 'Score' : 'Time (seconds)'}:</div>
                    <div style={{ fontWeight: 'bold', color }}>{value.toLocaleString()}</div>
                  </div>
                )}
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <p className="text-muted-foreground mb-2">No valid submissions for this problem</p>
                  {currentProblemStats.unsolvedCount > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {currentProblemStats.unsolvedCount} submission(s) timed out with "--" [300]
                    </p>
                  )}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 