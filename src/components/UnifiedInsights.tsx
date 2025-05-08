import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UnifiedData, UnifiedDataItem } from '@/types/unified'; // Use UnifiedData
import { calculateUnifiedMetrics, OwnerMetrics } from '@/utils/unifiedAnalysis'; // Use unified metrics calculation

interface UnifiedInsightsProps {
  unifiedData: UnifiedData;
}

export default function UnifiedInsights({ unifiedData }: UnifiedInsightsProps) {
  const metrics = useMemo(() => calculateUnifiedMetrics(unifiedData), [unifiedData]);

  const { insights, problemSizeOutliers } = useMemo(() => {
    if (metrics.size === 0) {
      return { insights: [], problemSizeOutliers: [] };
    }

    const owners = Array.from(metrics.keys());

    // --- Calculate Insights --- 
    let bestQualitySolver = '';
    let bestAvgScore = Infinity;
    let mostBestSolutionsSolver = '';
    let highestBestSolutionsCount = -1;
    let bestLargeSolver = '';
    let bestLargeScore = Infinity;
    let bestSmallSolver = '';
    let bestSmallScore = Infinity;
    const largeThreshold = 200;
    const smallThreshold = 50;

    metrics.forEach((data, owner) => {
      // Overall quality
      if (data.avgScore < bestAvgScore) {
        bestAvgScore = data.avgScore;
        bestQualitySolver = owner;
      }

      // Most best solutions
      if (data.bestSolutions > highestBestSolutionsCount) {
        highestBestSolutionsCount = data.bestSolutions;
        mostBestSolutionsSolver = owner;
      }

      // Performance by size
      let largeScoreTotal = 0;
      let largeCount = 0;
      let smallScoreTotal = 0;
      let smallCount = 0;

      data.bySize.forEach((stats, size) => {
        if (size >= largeThreshold) {
          largeCount += stats.count;
          largeScoreTotal += stats.score;
        } else if (size < smallThreshold) {
          smallCount += stats.count;
          smallScoreTotal += stats.score;
        }
      });

      if (largeCount > 0) {
        const avgLarge = largeScoreTotal / largeCount;
        if (avgLarge < bestLargeScore) {
          bestLargeScore = avgLarge;
          bestLargeSolver = owner;
        }
      }
      if (smallCount > 0) {
        const avgSmall = smallScoreTotal / smallCount;
        if (avgSmall < bestSmallScore) {
          bestSmallScore = avgSmall;
          bestSmallSolver = owner;
        }
      }
    });

    const calculatedInsights = [
      {
        title: "Best Overall Solution Quality",
        description: bestQualitySolver ? 
          `${bestQualitySolver} has the lowest average score (${bestAvgScore.toFixed(2)}).` : "N/A",
        detail: "This participant/solver produced the best quality solutions on average."
      },
      {
        title: "Most Best Solutions",
        description: mostBestSolutionsSolver ? 
          `${mostBestSolutionsSolver} found the most best solutions (${highestBestSolutionsCount}).` : "N/A",
        detail: "This participant/solver most frequently found the optimal solution among all competitors."
      },
      {
        title: `Best on Large Problems (>=${largeThreshold} Cust.)`,
        description: bestLargeSolver ? 
          `${bestLargeSolver} performs best on large problems (avg. score: ${bestLargeScore.toFixed(2)}).` :
          "No data available for large problems.",
        detail: "Comparing average solution quality only on large instances."
      },
      {
        title: `Best on Small Problems (<${smallThreshold} Cust.)`,
        description: bestSmallSolver ? 
          `${bestSmallSolver} performs best on small problems (avg. score: ${bestSmallScore.toFixed(2)}).` :
          "No data available for small problems.",
        detail: "Comparing average solution quality only on small instances."
      }
    ];

    // --- Calculate Outliers --- 
    const calculatedOutliers = findProblemOutliers(unifiedData, owners);

    return { insights: calculatedInsights, problemSizeOutliers: calculatedOutliers };

  }, [metrics, unifiedData]);

   if (!unifiedData || unifiedData.length === 0 || metrics.size === 0) {
    return <p className="text-center text-muted-foreground">Upload data to see insights.</p>;
  }
  
  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Key Insights</CardTitle>
          <CardDescription>Analysis of solution quality across participants/solvers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {insights.map((insight, index) => (
              <Card key={index} className="bg-muted/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{insight.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>{insight.description}</p>
                  <p className="text-sm text-muted-foreground mt-2">{insight.detail}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {problemSizeOutliers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Interesting Observations</CardTitle>
            <CardDescription>Instances where participants/solvers performed notably differently</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {problemSizeOutliers.map((outlier, index) => (
                <li key={index} className="border rounded-lg p-4 bg-muted/30">
                  <p><span className="font-medium">{outlier.instance}</span>:</p>
                  <p className="text-sm pl-2">{outlier.observation}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Helper function to find problems where owners perform very differently
function findProblemOutliers(unifiedData: UnifiedData, owners: string[]): Array<{ instance: string; observation: string }> {
  const instanceMap = new Map<string, Map<string, UnifiedDataItem>>();
  
  // Group data by instance
  for (const item of unifiedData) {
    if (!instanceMap.has(item.instance)) {
      instanceMap.set(item.instance, new Map());
    }
    instanceMap.get(item.instance)!.set(item.entryOwner, item);
  }
  
  const outliers = [];
  
  for (const [instance, ownerMap] of instanceMap.entries()) {
    // Only consider instances attempted by multiple owners
    if (ownerMap.size < 2) continue; 

    const solvedScores = new Map<string, number>();
    const unsolvedOwners = [];
    
    for (const [owner, data] of ownerMap.entries()) {
      if (data.isUnsolved || data.score === null) {
        unsolvedOwners.push(owner);
      } else {
        solvedScores.set(owner, data.score);
      }
    }
    
    // Observation 1: Some solved, some didn't
    if (solvedScores.size > 0 && unsolvedOwners.length > 0) {
      outliers.push({
        instance,
        observation: `Solved by: ${Array.from(solvedScores.keys()).join(", ")}. Unsolved by: ${unsolvedOwners.join(", ")}.`
      });
      continue; // Prioritize this type of outlier
    }
    
    // Observation 2: Significant difference in scores (if all attempted solved it)
    if (solvedScores.size === ownerMap.size && solvedScores.size > 1) {
      let bestResult = Infinity;
      let bestOwner = "";
      let worstResult = -Infinity;
      let worstOwner = "";
      
      for (const [owner, score] of solvedScores.entries()) {
        if (score < bestResult) {
          bestResult = score;
          bestOwner = owner;
        }
        if (score > worstResult) {
          worstResult = score;
          worstOwner = owner;
        }
      }
      
      const gap = bestResult > 0 ? (worstResult - bestResult) / bestResult : (worstResult > 0 ? Infinity : 0);
      
      // Look for gaps > 20% or significant absolute differences if best is 0
      if (gap > 0.2 || (bestResult === 0 && worstResult > 10)) { // Threshold for significant gap
         outliers.push({
          instance,
          observation: `${bestOwner} (Score: ${bestResult.toFixed(2)}) performed significantly better than ${worstOwner} (Score: ${worstResult.toFixed(2)}).`
        });
      }
    }
  }
  
  // Sort outliers for consistency or by magnitude of difference? (Current: just by finding order)
  // Limit to top 5-10 most interesting outliers
  return outliers.slice(0, 5);
} 