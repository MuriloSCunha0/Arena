# Arena Conexão Admin

Sistema de gerenciamento para torneios e eventos esportivos.

## Setup Instructions

### 1. Supabase Configuration

1. Create a Supabase project at [https://app.supabase.com](https://app.supabase.com)
2. After creating your project, navigate to Project Settings > API to find your:
   - URL: `https://[YOUR_PROJECT_ID].supabase.co`
   - API Keys: Copy the `anon` public key

3. Create your environment variables:
   - Copy `.env.sample` to `.env`
   - Update with your Supabase URL and API key

### 2. Database Setup

1. Go to your Supabase project's SQL Editor
2. Open the `db_setup.sql` file from this project
3. Execute the entire SQL script to create all necessary tables and policies

### 3. Authentication Setup

1. In your Supabase project, go to Authentication > Settings
2. Configure email authentication or other providers as needed
3. For development, you may want to disable email confirmations

### 4. Sound Files Setup

The application requires sound files for UI feedback. Add the following files:

1. Create the directory: `public/sounds/`
2. Download or create these sound files and place them in the directory:
   - `tick.mp3` - A short ticking/click sound for button interactions
   - `success.mp3` - A success sound for completion events

You can download free sound effects from sites like:
- [Mixkit](https://mixkit.co/free-sound-effects/)
- [FreeSound](https://freesound.org/)

### 5. Running the Project

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## Troubleshooting

If you see 406 errors ("Not Acceptable") when accessing Supabase tables:
1.  **Check Row Level Security (RLS) Policies:** This is a **very common cause** for 406 errors.
    *   Ensure RLS is enabled for the table (`tournaments`, `tournament_matches`, etc.) in the Supabase Dashboard under Authentication > Policies.
    *   Verify that your `SELECT` policy allows the authenticated user (or anonymous users, if applicable) to read the data.
    *   Make sure the `USING` clause of your `SELECT` policy correctly filters rows based on user roles or IDs (e.g., `auth.uid() = user_id`). If the policy filters out all rows, it can sometimes lead to a 406 error, especially when combined with `.single()`.
    *   Temporarily disable RLS for the table to see if the error disappears. If it does, the issue is definitely with your RLS policy. **Remember to re-enable RLS** after testing.
2.  **Check Global Headers:** Ensure the Supabase client in `src/lib/supabase.ts` is configured with global headers: `Accept: application/json` and `Content-Type: application/json`. This should be handled correctly by the current setup, but double-check.
3.  **Use `.maybeSingle()`:** When fetching a single record that might not exist (like in `getByEventId`), prefer `.maybeSingle()` over `.single()` in your Supabase queries for better error handling.
4.  **Verify Table/Column Names:** Ensure the table and column names in your queries exactly match those in your Supabase database.
5.  **Check Network Tab:** Use your browser's developer tools (Network tab) to inspect the failing request. Look at the request headers (ensure `Accept: application/json` is present) and the response body for any more detailed error messages from Supabase/PostgREST.

If you see 404 errors for sound resources:
1. Verify that you've added the sound files to `public/sounds/` directory
2. Make sure the filenames match exactly: `tick.mp3` and `success.mp3`
3. If sounds aren't essential for your usage, you can set the app to mute by default
