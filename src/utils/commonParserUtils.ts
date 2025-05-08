import { ParsedInstanceNameDetails } from "@/types/unified";

/**
 * Parses a problem instance name string into its constituent parts.
 * Handles VRP format (e.g., "101_11_2.vrp") and generic formats (e.g., "problem_A_variant1.txt").
 * @param instanceName The full name of the instance (e.g., "101_11_2.vrp").
 * @returns ParsedInstanceNameDetails object.
 */
export function parseGenericInstanceName(instanceName: string): ParsedInstanceNameDetails {
  const nameWithoutExtension = instanceName.replace(/\.(vrp|txt|log|html)$/i, '');
  const parts = nameWithoutExtension.split('_');

  // Try to parse as <customers>_<vehicles>_<variant>
  if (parts.length >= 2 && !isNaN(parseInt(parts[0], 10)) && !isNaN(parseInt(parts[1], 10))) {
    const numCustomers = parseInt(parts[0], 10);
    const numVehicles = parseInt(parts[1], 10);
    const problemVariant = parts.length >= 3 ? parts.slice(2).join('_') : 'default';
    const baseInstanceName = `${numCustomers}_${numVehicles}`;
    return {
      numCustomers,
      numVehicles,
      problemVariant,
      baseInstanceName
    };
  }
  
  // Fallback for other formats, e.g., "problemSet_instanceName_variant"
  // Consider the part after the last underscore as variant, and the rest as base name.
  const lastUnderscoreIndex = nameWithoutExtension.lastIndexOf('_');
  if (lastUnderscoreIndex !== -1 && lastUnderscoreIndex < nameWithoutExtension.length - 1) {
    const baseInstanceName = nameWithoutExtension.substring(0, lastUnderscoreIndex);
    const problemVariant = nameWithoutExtension.substring(lastUnderscoreIndex + 1);
    return {
      numCustomers: null,
      numVehicles: null,
      problemVariant,
      baseInstanceName
    };
  }

  // If no underscores or only at the end, consider the whole name as base, variant as default.
  return {
    numCustomers: null,
    numVehicles: null,
    problemVariant: 'default',
    baseInstanceName: nameWithoutExtension
  };
} 