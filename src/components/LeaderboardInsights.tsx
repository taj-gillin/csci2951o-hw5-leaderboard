"use client";

import { LeaderboardData } from "@/types/leaderboard";
import { getOverallWinner, getProblemStats, getProblemWinners, getSubmissionStats } from "@/utils/leaderboardAnalytics";
import React, { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface LeaderboardInsightsProps {
  data: LeaderboardData;
}

export default function LeaderboardInsights({ data }: LeaderboardInsightsProps) {
  const overallWinner = useMemo(() => getOverallWinner(data), [data]);
  const problemWinners = useMemo(() => getProblemWinners(data), [data]);
  const problemStats = useMemo(() => getProblemStats(data), [data]);
  const submissionStats = useMemo(() => getSubmissionStats(data), [data]);

  if (!data || data.length === 0) {
    return <div className="text-center py-4">No data available for insights</div>;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Leaderboard Insights</CardTitle>
        <CardDescription>Analysis and insights from the leaderboard data</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overall" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overall">Overall Insights</TabsTrigger>
            <TabsTrigger value="submissions">Submission Performance</TabsTrigger>
            <TabsTrigger value="problems">Problem Analysis</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overall" className="space-y-4 pt-4">
            <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
              <h4 className="mb-2 text-sm font-medium">Overall Winner</h4>
              {overallWinner ? (
                <div className="rounded-md bg-green-50 p-3 border border-green-200 dark:bg-green-900/20 dark:border-green-900/30">
                  <span className="font-bold">{overallWinner.name}</span> is leading with the lowest total score
                </div>
              ) : (
                <div className="text-gray-500">No winner determined yet</div>
              )}
            </div>

            <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
              <h4 className="mb-2 text-sm font-medium">Problem Winners</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(problemWinners).map(([problem, winner]) => (
                  <div key={problem} className="rounded-md bg-blue-50 p-3 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-900/30">
                    <div className="font-medium text-sm">{problem}</div>
                    <div className="font-normal">Winner: <span className="font-semibold">{winner}</span></div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="submissions" className="pt-4">
            <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
              <h4 className="mb-2 text-sm font-medium">Submission Performance</h4>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Submission</TableHead>
                      <TableHead>Best Problems</TableHead>
                      <TableHead>Worst Problems</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissionStats
                      .filter(stat => stat.name && stat.name !== "Leaderboard" && stat.name !== "checking leaderboard")
                      .map((stat, index) => (
                        <TableRow key={stat.name}>
                          <TableCell className="font-medium">{stat.name}</TableCell>
                          <TableCell>
                            <ul className="list-disc list-inside">
                              {stat.bestProblems.map(problem => (
                                <li key={problem}>{problem}</li>
                              ))}
                            </ul>
                          </TableCell>
                          <TableCell>
                            <ul className="list-disc list-inside">
                              {stat.worstProblems.map(problem => (
                                <li key={problem}>{problem}</li>
                              ))}
                            </ul>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="problems" className="pt-4">
            <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
              <h4 className="mb-2 text-sm font-medium">Problem Difficulty Analysis</h4>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Problem</TableHead>
                      <TableHead className="text-right">Best Score</TableHead>
                      <TableHead>Best Submission</TableHead>
                      <TableHead className="text-right">Average Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {problemStats.map((stat, index) => (
                      <TableRow key={stat.name}>
                        <TableCell className="font-medium">{stat.name}</TableCell>
                        <TableCell className="text-right">{stat.bestScore.toLocaleString()}</TableCell>
                        <TableCell>{stat.bestSubmission}</TableCell>
                        <TableCell className="text-right">{stat.averageScore.toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 