import React from 'react';
// Updated component import
import InstanceComparisonTable from './InstanceComparisonTable'; 
import UnifiedPerformanceChart from './UnifiedPerformanceChart'; // Updated import
// import UnifiedInsights from './UnifiedInsights'; // Removed import
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import { LogFile } from '@/types/log'; // Old type
import { UnifiedDataItem } from '@/types/unified'; // Use UnifiedData

interface UnifiedAnalysisDisplayProps { // Renamed props interface
  unifiedData: UnifiedDataItem[]; // Use UnifiedData
}

// Renamed component
export default function UnifiedAnalysisDisplay({ unifiedData }: UnifiedAnalysisDisplayProps) { 

  if (!unifiedData || unifiedData.length === 0) {
    // Don't render tabs if there's no data
    return null;
  }
  
  return (
    <Tabs defaultValue="performance" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="performance">Performance Analysis</TabsTrigger>
        <TabsTrigger value="comparison">Instance Comparison</TabsTrigger>
        {/* <TabsTrigger value="insights">Insights</TabsTrigger> */}{/* Removed Insights Tab Trigger*/}
      </TabsList>
      
      <TabsContent value="performance" className="pt-4">
        <UnifiedPerformanceChart unifiedData={unifiedData} />
      </TabsContent>
      
      <TabsContent value="comparison" className="pt-4">
        <InstanceComparisonTable unifiedData={unifiedData} />
      </TabsContent>
      
      {/* Removed Insights Tab Content */}
      {/* 
      <TabsContent value="insights" className="pt-4">
        <UnifiedInsights unifiedData={unifiedData} />
      </TabsContent>
      */}
    </Tabs>
  );
} 