import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UnifiedDataItem, UnifiedData } from '@/types/unified'; // Use UnifiedData
import { calculateUnifiedMetrics, OwnerMetrics } from '@/utils/unifiedAnalysis'; // Use unified metrics calculation
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Line,
  ComposedChart,
  PieChart,
  Pie,
  Cell
} from 'recharts'; // Keep recharts imports

interface UnifiedPerformanceChartProps {
  unifiedData: UnifiedData;
}

// Helper to generate colors for different owners
const generateColor = (index: number): string => {
  const colors = [
    '#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088fe',
    '#00c49f', '#ffbb28', '#ff8042', '#a4de6c', '#d0ed57'
  ];
  return colors[index % colors.length];
};

export default function UnifiedPerformanceChart({ unifiedData }: UnifiedPerformanceChartProps) {
  const metricsData = useMemo(() => calculateUnifiedMetrics(unifiedData), [unifiedData]);

  const { 
    sizeData,
    solverComparisonData,
    bestSolutionsData
  } = useMemo(() => {
    if (metricsData.size === 0) {
      return { sizeData: [], solverComparisonData: [], bestSolutionsData: [] };
    }

    const owners = Array.from(metricsData.keys()).sort();

    // Size comparison chart data
    const allSizesSet = new Set<number>();
    metricsData.forEach(data => {
      data.bySize.forEach((_, size) => {
        if (size !== null) allSizesSet.add(size);
      });
    });
    const allSizes = Array.from(allSizesSet).sort((a, b) => a - b);

    const sizeComparison = allSizes.map(size => {
      const entry: any = { size };
      owners.forEach(owner => {
        const ownerMetrics = metricsData.get(owner)!;
        const sizeStats = ownerMetrics.bySize.get(size);
        if (sizeStats && sizeStats.count > 0) {
          entry[owner] = sizeStats.score / sizeStats.count; // Average score for this size
        } else {
          entry[owner] = null; // Use null for missing data points in line chart
        }
      });
      return entry;
    });

    // Solver/Participant comparison chart data
    const comparison = owners.map(owner => {
      const data = metricsData.get(owner)!;
      const solvedRatio = data.totalProblems > 0 ? (data.solvedCount / data.totalProblems) * 100 : 0;
      const bestSolutionsPercent = data.solvedCount > 0 ? (data.bestSolutions / data.solvedCount) * 100 : 0;
      return {
        owner,
        avgScore: data.avgScore === Infinity ? null : data.avgScore, // Handle potential Infinity avgScore
        solvedCount: data.solvedCount,
        totalProblems: data.totalProblems,
        solvedRatio: solvedRatio,
        bestSolutions: data.bestSolutions,
        bestSolutionsPercent: bestSolutionsPercent
      };
    });
    
    // Best solutions pie chart data
    const bestSolutions = owners.map((owner, index) => ({
      name: owner,
      value: metricsData.get(owner)!.bestSolutions,
      color: generateColor(index)
    })).filter(d => d.value > 0); // Only show owners with at least one best solution

    return { 
      sizeData: sizeComparison, 
      solverComparisonData: comparison,
      bestSolutionsData: bestSolutions
    };

  }, [metricsData]);

   if (!unifiedData || unifiedData.length === 0 || metricsData.size === 0) {
    return <p className="text-center text-muted-foreground">Upload data to see performance charts.</p>;
  }
  
  const ownersList = Array.from(metricsData.keys()).sort(); // Used for mapping lines/bars
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Analysis</CardTitle>
        <CardDescription>
          Comparing solution quality across participants/solvers (lower scores are better)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="bestSolutions">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="bestSolutions">Best Solutions</TabsTrigger>
            <TabsTrigger value="sizeComparison">By Problem Size</TabsTrigger>
            <TabsTrigger value="solverStats">Participant/Solver Stats</TabsTrigger>
          </TabsList>
          
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
                margin={{ top: 20, right: 30, bottom: 20, left: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="size" 
                  type="number"
                  name="Problem Size (Customers)"
                  label={{ value: 'Problem Size (Customers)', position: 'bottom', offset: 0 }}
                  allowDuplicatedCategory={false}
                />
                <YAxis 
                  name="Average Score"
                  label={{ value: 'Average Score (lower is better)', angle: -90, position: 'insideLeft' }}
                  domain={['dataMin', 'auto']} // Adjust domain slightly
                />
                <Tooltip
                  formatter={(value: any, name: string) => [
                    value === null ? 'N/A' : value.toFixed(2), 
                    name // Owner name
                  ]}
                   labelFormatter={(label) => `Size: ${label}`}
                />
                <Legend />
                {ownersList.map((owner, index) => (
                  <Line
                    key={owner}
                    type="monotone"
                    dataKey={owner}
                    name={owner}
                    stroke={generateColor(index)}
                    connectNulls={true} // Connect lines even if data points are missing
                    dot={{r: 3}}
                    activeDot={{r: 6}}
                    strokeWidth={2}
                  />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </TabsContent>
          
          <TabsContent value="solverStats" className="pt-4">
             <div className="mb-4 text-sm text-center">
              Overall statistics per participant/solver
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={solverComparisonData}
                margin={{ top: 20, right: 30, bottom: 50, left: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="owner" 
                  angle={-45} 
                  textAnchor="end" 
                  height={70}
                  interval={0} // Show all labels
                />
                <YAxis 
                  yAxisId="left"
                  label={{ value: 'Avg. Score (lower is better)', angle: -90, position: 'insideLeft' }}
                  domain={['dataMin', 'auto']}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right"
                  label={{ value: 'Best Solutions (%)', angle: 90, position: 'insideRight' }}
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  formatter={(value: any, name: string) => {
                    if (name === 'Best Solutions %') {
                      return [`${value.toFixed(1)}%`, 'Best Solutions'];
                    }
                    if (name === 'Average Score') {
                      return [value !== null ? value.toFixed(2) : 'N/A', name];
                    }
                    return [value, name];
                  }}
                   labelFormatter={(label) => `${label}`}
                />
                <Legend verticalAlign="top" />
                <Bar 
                  yAxisId="left" 
                  dataKey="avgScore" 
                  name="Average Score" 
                  fill="#8884d8" 
                />
                <Bar 
                  yAxisId="right" 
                  dataKey="bestSolutionsPercent" 
                  name="Best Solutions %" 
                  fill="#82ca9d" 
                />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 