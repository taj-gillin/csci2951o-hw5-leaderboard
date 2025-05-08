import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UnifiedData } from '@/types/unified';
import { calculateUnifiedMetrics } from '@/utils/unifiedAnalysis';
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Line,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface UnifiedPerformanceChartProps {
  unifiedData: UnifiedData;
}

const generateColor = (index: number): string => {
  const colors = [
    '#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088fe',
    '#00c49f', '#ffbb28', '#ff8042', '#a4de6c', '#d0ed57'
  ];
  return colors[index % colors.length];
};

interface SummaryTableRow {
  owner: string;
  totalScore: number;
  avgScore: number;
  solvedCount: number;
  bestSolutions: number;
  totalTime: number;
  totalProblems: number;
}

interface ChartSizeEntry {
    size: number;
    representativeInstancesDisplay?: string;
    [ownerName: string]: number | string | null | undefined; // Scores (number/null) or other properties (string/undefined)
}

export default function UnifiedPerformanceChart({ unifiedData }: UnifiedPerformanceChartProps) {
  const metricsData = useMemo(() => calculateUnifiedMetrics(unifiedData), [unifiedData]);

  const { 
    sizeData,
    bestSolutionsData,
    summaryTableData
  } = useMemo(() => {
    if (metricsData.size === 0) {
      return { sizeData: [], bestSolutionsData: [], summaryTableData: [] };
    }

    const owners = Array.from(metricsData.keys()).sort();

    const allSizesSet = new Set<number>();
    metricsData.forEach(data => {
      data.bySize.forEach((_, size) => {
        if (size !== null) allSizesSet.add(size);
      });
    });
    const allSizes = Array.from(allSizesSet).sort((a, b) => a - b);

    const sizeComparison: ChartSizeEntry[] = allSizes.map(size => {
      const entry: ChartSizeEntry = { size };
      const instancesForThisSize = new Set<string>();

      owners.forEach(owner => {
        const ownerMetrics = metricsData.get(owner)!;
        const sizeStats = ownerMetrics.bySize.get(size);
        entry[owner] = (sizeStats && sizeStats.count > 0) ? (sizeStats.score / sizeStats.count) : null;
        if (sizeStats && sizeStats.instanceNames) {
          sizeStats.instanceNames.forEach(name => instancesForThisSize.add(name));
        }
      });

      let representativeInstancesDisplay = "";
      if (instancesForThisSize.size === 1) {
        representativeInstancesDisplay = `(Instance: ${instancesForThisSize.values().next().value})`;
      } else if (instancesForThisSize.size > 1) {
        representativeInstancesDisplay = `(Avg. over ${instancesForThisSize.size} unique problem files of this size)`;
      }
      
      entry.representativeInstancesDisplay = representativeInstancesDisplay;

      return entry;
    });

    const bestSolutions = owners.map((owner, index) => ({
      name: owner,
      value: metricsData.get(owner)!.bestSolutions,
      color: generateColor(index)
    })).filter(d => d.value > 0);

    const summaryTable: SummaryTableRow[] = owners.map(owner => {
      const data = metricsData.get(owner)!;
      return {
        owner,
        totalScore: data.totalScore,
        avgScore: data.avgScore === Infinity ? -1 : data.avgScore,
        solvedCount: data.solvedCount,
        bestSolutions: data.bestSolutions,
        totalTime: data.totalTime,
        totalProblems: data.totalProblems
      };
    });

    return { 
      sizeData: sizeComparison, 
      bestSolutionsData: bestSolutions,
      summaryTableData: summaryTable
    };

  }, [metricsData]);

   if (!unifiedData || unifiedData.length === 0 || metricsData.size === 0) {
    return <p className="text-center text-muted-foreground">Upload data to see performance charts.</p>;
  }
  
  const ownersList = Array.from(metricsData.keys()).sort();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Analysis</CardTitle>
        <CardDescription>
          Comparing solution quality across participants/solvers.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="summary">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="summary">Overall Summary</TabsTrigger>
            <TabsTrigger value="bestSolutions">Best Solutions</TabsTrigger>
            <TabsTrigger value="sizeComparison">By Problem Size</TabsTrigger>
          </TabsList>
          
          <TabsContent value="summary" className="pt-4">
            <div className="mb-4 text-sm text-center">
              Aggregated performance metrics for each participant/solver.
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Participant</TableHead>
                    <TableHead className="text-right">Total Score</TableHead>
                    <TableHead className="text-right">Avg Score</TableHead>
                    <TableHead className="text-right">Solved</TableHead>
                    <TableHead className="text-right">Won</TableHead>
                    <TableHead className="text-right">Total Time (s)</TableHead>
                    <TableHead className="text-right">Attempted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summaryTableData.map((row) => (
                    <TableRow key={row.owner}>
                      <TableCell className="font-medium">{row.owner}</TableCell>
                      <TableCell className="text-right">{row.totalScore.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        {row.avgScore === -1 ? "N/A" : row.avgScore.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">{row.solvedCount}</TableCell>
                      <TableCell className="text-right">{row.bestSolutions}</TableCell>
                      <TableCell className="text-right">{row.totalTime.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{row.totalProblems}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          
          <TabsContent value="bestSolutions" className="pt-4">
            <div className="mb-4 text-sm text-center">
              Distribution of best solutions found
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={bestSolutionsData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                  outerRadius={150}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {bestSolutionsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number, name: string, props) => [`${value} solution${value !== 1 ? 's' : ''}`, props.payload.name]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <p className="text-sm text-muted-foreground text-center mt-4">
              Shows which participant/solver found the best solution for each instance they solved.
            </p>
          </TabsContent>
          
          <TabsContent value="sizeComparison" className="pt-4">
             <div className="mb-4 text-sm text-center">
              Average solution quality by problem size (customer count)
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart
                data={sizeData}
                margin={{ top: 20, right: 30, bottom: 60, left: 40 }} 
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="size" 
                  type="number"
                  name="Problem Size (Customers)"
                  label={{ value: 'Problem Size (Customers)', position: 'insideBottom', offset: -25 }}
                  allowDuplicatedCategory={false}
                />
                <YAxis 
                  name="Average Score"
                  label={{ value: 'Score', angle: -90, position: 'insideLeft', offset: -25 }}
                  domain={['dataMin', 'auto']}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const representativeDisplay = payload[0].payload.representativeInstancesDisplay || "";
                      return (
                        <div className="bg-background p-3 border rounded shadow-sm text-sm">
                          <p className="font-medium mb-1">Size: {label} {representativeDisplay}</p>
                          {payload.map(pld => {
                            const owner = pld.name as string; 
                            const value = pld.value; 
                            
                            const displayValue = typeof value === 'number' 
                              ? value.toFixed(2) 
                              : (value === null || value === undefined ? 'N/A' : String(value));

                            return (
                              <div key={owner} style={{ color: pld.color }}>
                                {`${owner}: ${displayValue}`}
                              </div>
                            );
                          })}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: '20px' }} />
                {ownersList.map((owner, index) => (
                  <Line
                    key={owner}
                    type="monotone"
                    dataKey={owner}
                    name={owner}
                    stroke={generateColor(index)}
                    connectNulls={true}
                    dot={{r: 3}}
                    activeDot={{r: 6}}
                    strokeWidth={2}
                  />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 