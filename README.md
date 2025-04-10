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

### 4. Running the Project

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## Troubleshooting

If you see 404 errors when accessing Supabase tables:
1. Make sure you've run the database setup script
2. Verify your Supabase URL and API keys in `.env` file
3. Check that tables were created successfully in the Supabase Dashboard
