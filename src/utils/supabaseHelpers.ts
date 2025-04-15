import { supabase } from '../lib/supabase';

/**
 * Helper functions for Supabase queries.
 * Headers are primarily handled globally in lib/supabase.ts
 */

// Simpler approach relying on global headers and standard Supabase methods
export const supabaseApi = {
  // READ operations
  select: (table: string, columns: string = '*') => {
    // Global headers are applied automatically
    return supabase
      .from(table)
      .select(columns);
  },
  
  // CREATE operations
  insert: (table: string, values: any) => {
    // Using .select() implicitly adds 'Prefer: return=representation'
    return supabase
      .from(table)
      .insert(values)
      .select(); 
  },
  
  // UPDATE operations
  update: (table: string, values: any) => {
    // Using .select() implicitly adds 'Prefer: return=representation'
    return supabase
      .from(table)
      .update(values)
      .select();
  },
  
  // DELETE operations
  delete: (table: string) => {
    // Global headers are applied automatically
    return supabase
      .from(table)
      .delete();
  },
  
  // Get a builder for chaining, relying on global headers
  from: (table: string) => {
    const builder = supabase.from(table);
    
    // Return methods that rely on global headers and standard Supabase behavior
    return {
      select: (columns: string = '*') => builder.select(columns),
      // .select() after insert/update adds the 'Prefer' header automatically
      insert: (values: any) => builder.insert(values).select(),
      update: (values: any) => builder.update(values).select(),
      delete: () => builder.delete(),
    };
  }
};

// Remove the problematic applyHeaders function
// export const applyHeaders = (query: any, returnRepresentation: boolean = true) => { ... };
