import { UnifiedData, UnifiedDataItem } from "@/types/unified";

// Define the structure for the metrics calculated per entry owner (solver/participant)
export interface OwnerMetrics {
  totalScore: number;
  avgScore: number;
  solvedCount: number;
  totalProblems: number;
  bestSolutions: number; // Count of instances where this owner had the best score
  bySize: Map<number, { score: number; count: number }>; // Map<numCustomers, { total score, count }>
}

// Define the structure for grouping data by instance
export type GroupedByInstance = Map<string, Map<string, UnifiedDataItem>>;
// Outer Map: key = instance name (string)
// Inner Map: key = entryOwner (string), value = UnifiedDataItem

/**
 * Calculates performance and quality metrics for each entry owner (solver/participant).
 * @param data The combined unified data from all sources.
 * @returns A Map where keys are entryOwner names and values are OwnerMetrics objects.
 */
export function calculateUnifiedMetrics(data: UnifiedData): Map<string, OwnerMetrics> {
  const ownerPerformance = new Map<string, OwnerMetrics>();
  const instanceBestScores = new Map<string, number>(); // Map<instanceName, bestScore>

  // --- First Pass: Calculate basic stats per owner and find best score per instance --- 
  for (const item of data) {
    const owner = item.entryOwner;
    const instance = item.instance;

    // Initialize metrics for new owner
    if (!ownerPerformance.has(owner)) {
      ownerPerformance.set(owner, {
        totalScore: 0,
        avgScore: 0,
        solvedCount: 0,
        totalProblems: 0,
        bestSolutions: 0,
        bySize: new Map()
      });
    }
    const performance = ownerPerformance.get(owner)!;

    performance.totalProblems++;

    if (!item.isUnsolved && item.score !== null) {
      const score = item.score;
      performance.totalScore += score;
      performance.solvedCount++;
      
      // Update best score for this instance if needed
      if (!instanceBestScores.has(instance) || score < instanceBestScores.get(instance)!) {
        instanceBestScores.set(instance, score);
      }

      // Group by customer size (if available)
      if (item.numCustomers !== null) {
        const size = item.numCustomers;
        if (!performance.bySize.has(size)) {
          performance.bySize.set(size, { score: 0, count: 0 });
        }
        const sizeStats = performance.bySize.get(size)!;
        sizeStats.score += score;
        sizeStats.count++;
      }
    }
  }

  // --- Second Pass: Calculate averages and count best solutions --- 
  for (const [owner, performance] of ownerPerformance.entries()) {
    // Calculate average score
    if (performance.solvedCount > 0) {
      performance.avgScore = performance.totalScore / performance.solvedCount;
    } else {
      performance.avgScore = Infinity; // Or NaN, or null, depending on desired handling
    }

    // Count how many times this owner achieved the best score for an instance
    for (const item of data) {
      if (item.entryOwner === owner && !item.isUnsolved && item.score !== null) {
        const instance = item.instance;
        if (instanceBestScores.has(instance) && item.score === instanceBestScores.get(instance)!) {
          performance.bestSolutions++;
        }
      }
    }
  }

  return ownerPerformance;
}


/**
 * Groups the unified data by problem instance name.
 * @param data The combined unified data from all sources.
 * @returns A Map where keys are instance names and values are Maps of entryOwner -> UnifiedDataItem.
 */
export function groupUnifiedDataByInstance(data: UnifiedData): GroupedByInstance {
  const groupedData: GroupedByInstance = new Map();

  for (const item of data) {
    const instance = item.instance;
    const owner = item.entryOwner;

    if (!groupedData.has(instance)) {
      groupedData.set(instance, new Map());
    }

    // Add or overwrite the entry for this owner for this instance
    // If multiple entries exist for the same owner/instance (e.g., multiple uploads), the last one wins.
    // Consider adding logic here if merging or specific selection is needed.
    groupedData.get(instance)!.set(owner, item); 
  }

  return groupedData;
} 