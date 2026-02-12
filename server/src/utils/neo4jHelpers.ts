import { Integer } from 'neo4j-driver';

// Helper function to convert Neo4j Integer objects to JavaScript numbers
export const toNumber = (value: any): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (value instanceof Integer || (value && typeof value.toNumber === 'function')) {
    return value.toNumber();
  }
  // Try to parse as number if it's a string
  const parsed = Number(value);
  return isNaN(parsed) ? 0 : parsed;
};


