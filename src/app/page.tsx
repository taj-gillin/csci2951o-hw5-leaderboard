"use client";

import React, { useState, useCallback, useEffect, useMemo } from 'react';
// Removed old component imports
// import HtmlUploader from '@/components/HtmlUploader';
// import LeaderboardTable from '@/components/LeaderboardTable';
// import TotalScoreChart from '@/components/TotalScoreChart';
// import ProblemComparisonChart from '@/components/ProblemComparisonChart';
// import LeaderboardInsights from '@/components/LeaderboardInsights';
// import LogComparison from '@/components/LogComparison'; // Old wrapper component

// Import new unified components
import CombinedFileUploader from '@/components/CombinedFileUploader';
import UnifiedAnalysisDisplay from '@/components/UnifiedAnalysisDisplay'; // New wrapper
import { UnifiedDataItem } from '@/types/unified';
import { Toaster } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
// Removed unused imports
// import { parseClientSide } from '@/utils/leaderboardParser';
// import { LeaderboardData } from '@/types/leaderboard';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import { Separator } from '@/components/ui/separator';

// Placeholder for OwnerVisibilityControl component - will be created next
interface OwnerVisibilityControlProps {
  owners: string[];
  visibility: Map<string, boolean>;
  onToggle: (owner: string) => void;
}

const OwnerVisibilityControl: React.FC<OwnerVisibilityControlProps> = ({ owners, visibility, onToggle }) => {
  if (owners.length === 0) {
    return null;
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Filter Submissions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">Select submissions to include in the analysis:</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-2">
          {owners.map(owner => (
            <div key={owner} className="flex items-center space-x-2">
              <Checkbox 
                id={`vis-${owner}`} 
                checked={visibility.get(owner) !== false} // Default to true if not in map (should be)
                onCheckedChange={() => onToggle(owner)} 
              />
              <Label htmlFor={`vis-${owner}`} className="text-sm font-normal truncate" title={owner}>
                {owner}
              </Label>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default function Home() {
  // State to hold all unified data items from all sources
  const [masterData, setMasterData] = useState<UnifiedDataItem[]>([]);
  const [error, setError] = useState<string | null>(null); // Keep error state for potential future use
  const [ownerVisibility, setOwnerVisibility] = useState<Map<string, boolean>>(new Map());

  const uniqueOwners = useMemo(() => {
    const owners = new Set(masterData.map(item => item.entryOwner));
    return Array.from(owners).sort();
  }, [masterData]);

  useEffect(() => {
    setOwnerVisibility(prevVisibility => {
      const newVisibility = new Map(prevVisibility);
      uniqueOwners.forEach(owner => {
        if (!newVisibility.has(owner)) { // Add new owners as visible by default
          newVisibility.set(owner, true);
        }
      });
      // Optional: Remove owners from visibility map if they no longer exist in masterData
      // This depends on desired behavior when files are cleared/changed
      // For now, we keep them, they just won't affect filtering if not in current masterData
      return newVisibility;
    });
  }, [uniqueOwners]);

  // Callback for the CombinedFileUploader when new files are successfully processed
  const handleDataUpdate = useCallback((newData: UnifiedDataItem[]) => {
    // Append new data to existing master data
    setMasterData(prevData => [...prevData, ...newData]);
    setError(null); // Clear any previous errors
  }, []);

  // Callback for the CombinedFileUploader when files are cleared
  const handleDataCleared = useCallback((sourceNameToClear?: string) => {
    if (sourceNameToClear) {
      // Remove data items belonging to the specific source file
      setMasterData(prevData => prevData.filter(item => item.sourceName !== sourceNameToClear));
      // Note: ownerVisibility won't automatically remove owners if their last data source is cleared.
      // They will just become ineffective for filtering. This behavior might need refinement.
    } else {
      // Clear all data
      setMasterData([]);
      setOwnerVisibility(new Map()); // Clear visibility when all data is cleared
    }
    setError(null);
  }, []);

  const toggleOwnerVisibility = useCallback((owner: string) => {
    setOwnerVisibility(prev => {
      const newVisibility = new Map(prev);
      newVisibility.set(owner, !prev.get(owner));
      return newVisibility;
    });
  }, []);

  const visibleData = useMemo(() => {
    if (ownerVisibility.size === 0 && uniqueOwners.length > 0) {
      // If visibility map isn't populated yet but we have owners, assume all visible
      // This handles initial load or race conditions before useEffect populates map
      return masterData;
    }
    return masterData.filter(item => ownerVisibility.get(item.entryOwner) !== false);
  }, [masterData, ownerVisibility, uniqueOwners]);

  return (
    <main className="min-h-screen bg-slate-100 dark:bg-slate-900 p-4 md:p-8">
      <Toaster />
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Performance Analysis Tool</h1>
          <p className="text-muted-foreground">
            Upload and compare results from Leaderboard HTML or Solver LOG files
          </p>
        </div>

        {/* Unified Uploader */}
        <CombinedFileUploader 
          onDataUpdate={handleDataUpdate} 
          onDataCleared={handleDataCleared} 
        />

        {/* Owner Visibility Control - render if there's data */}
        {masterData.length > 0 && (
          <OwnerVisibilityControl 
            owners={uniqueOwners} 
            visibility={ownerVisibility} 
            onToggle={toggleOwnerVisibility} 
          />
        )}

        {/* Display Area for Unified Analysis Components */}
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded text-destructive">
            {error} 
          </div>
        )}

        {/* Pass the combined masterData to the display component */}
        <UnifiedAnalysisDisplay unifiedData={visibleData} />
        
      </div>
    </main>
  );
}
