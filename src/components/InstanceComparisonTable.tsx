import React, { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UnifiedDataItem, UnifiedData } from '@/types/unified';
import { groupUnifiedDataByInstance } from '@/utils/unifiedAnalysis';
import { Badge } from "@/components/ui/badge";

interface InstanceComparisonTableProps {
  unifiedData: UnifiedData;
}

export default function InstanceComparisonTable({ unifiedData }: InstanceComparisonTableProps) {
  const { groupedData, owners, sortedInstanceNames } = useMemo(() => {
    const grouped = groupUnifiedDataByInstance(unifiedData);
    const ownerSet = new Set<string>();
    unifiedData.forEach(item => ownerSet.add(item.entryOwner));
    const sortedOwners = Array.from(ownerSet).sort();

    // Sort instances for display (e.g., by customer count, then name)
    const instances = Array.from(grouped.keys());
    instances.sort((a, b) => {
        const entryA = grouped.get(a)?.values().next().value as UnifiedDataItem | undefined;
        const entryB = grouped.get(b)?.values().next().value as UnifiedDataItem | undefined;
        
        const customersA = entryA?.numCustomers ?? Infinity;
        const customersB = entryB?.numCustomers ?? Infinity;
        
        if (customersA !== customersB) {
          return customersA - customersB;
        }
        // Fallback to string comparison if customer count is the same or null
        return a.localeCompare(b);
    });

    return { groupedData: grouped, owners: sortedOwners, sortedInstanceNames: instances };
  }, [unifiedData]);

  if (!unifiedData || unifiedData.length === 0) {
    return <p className="text-center text-muted-foreground">Upload data to see instance comparisons.</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Instance Comparison</CardTitle>
        <CardDescription>Compare solution quality across different instances (lower score is better).</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Problem Instance</TableHead>
                <TableHead className="w-[140px]">Size (Cust/Veh)</TableHead>
                {owners.map(owner => (
                  <TableHead key={owner} className="min-w-[200px]">
                    {owner}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedInstanceNames.map(instanceName => {
                const instanceEntries = groupedData.get(instanceName);
                if (!instanceEntries) return null; // Should not happen
                
                // Find best result for this instance
                let bestResult = Infinity;
                instanceEntries.forEach(entry => {
                  if (!entry.isUnsolved && entry.score !== null && entry.score < bestResult) {
                    bestResult = entry.score;
                  }
                });
                
                // Get display info (size) from the first entry for the instance
                const firstEntry = instanceEntries.values().next().value as UnifiedDataItem;
                const sizeDisplay = firstEntry.numCustomers !== null ? `${firstEntry.numCustomers}/${firstEntry.numVehicles ?? '-'}` : 'N/A';
                
                return (
                  <TableRow key={instanceName}>
                    <TableCell className="font-medium">{instanceName}</TableCell>
                    <TableCell>{sizeDisplay}</TableCell>
                    {owners.map(owner => {
                      const entry = instanceEntries.get(owner);
                      
                      if (!entry) {
                        return <TableCell key={owner} className="text-xs text-muted-foreground">N/A</TableCell>;
                      }
                      
                      if (entry.isUnsolved || entry.score === null) {
                        return <TableCell key={owner} className="text-destructive">Unsolved</TableCell>;
                      }
                      
                      const resultValue = entry.score;
                      const isBest = bestResult !== Infinity && resultValue === bestResult;
                      const percentWorse = bestResult !== Infinity && bestResult > 0 && resultValue > bestResult ? 
                        ((resultValue - bestResult) / bestResult * 100).toFixed(1) : '0';
                      
                      return (
                        <TableCell key={owner}>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className={`font-medium ${isBest ? 'text-green-600 dark:text-green-400' : ''}`}>
                                {resultValue.toFixed(2)} {/* Format score */}
                              </span>
                              {isBest && <Badge variant="outline" className="bg-green-100 dark:bg-green-900 text-xs">Best</Badge>}
                            </div>
                            {!isBest && bestResult !== Infinity && parseFloat(percentWorse) > 0.1 && (
                              <div className="text-xs text-muted-foreground">
                                +{percentWorse}% from best
                              </div>
                            )}
                            {entry.time !== null && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Solved in {entry.time.toFixed(2)}s
                              </div>
                            )}
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

/*
// Original code (to be adapted later)
// ... (kept for reference, can be deleted later)
*/ 