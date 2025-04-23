// Helper function to handle Supabase errors with more details
export const handleSupabaseError = (error: any, context: string) => {
    console.error(`Error in ${context}:`, error);
  
    let message = `Error in ${context}`;
    if (error.message) {
      message += `: ${error.message}`;
    }
    if (error.details) {
      message += ` - ${error.details}`;
    }
    if (error.hint) {
      message += ` (Hint: ${error.hint})`;
    }
  
    throw new Error(message);
  };