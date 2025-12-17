# Migration 018: Fix Public Access to Paths

## Purpose
Allow anonymous (non-authenticated) users to access public paths and their related data.

## How to Apply

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `018_fix_public_access.sql`
4. Paste and execute

### Option 2: Using Supabase CLI
```bash
supabase db push
```

## What This Migration Does

This migration fixes Row Level Security (RLS) policies to allow anonymous users to:

1. **Read public paths** - View paths marked as `is_public = true`
2. **Read path simulations** - Access simulations that are part of public paths
3. **Read simulations** - View simulations used in public paths
4. **Read characters** - Access character data for public path simulations
5. **Create and read path progress** - Track their progress through public paths
6. **Create and read chats** - Interact with simulations in public paths

## Key Changes

- Modified `paths_select_policy` to allow access when `is_public = true` regardless of authentication
- Created policies for `path_simulations`, `simulations`, and `characters` that check if they're part of a public path
- Updated `path_progress`, `chats` policies to allow anonymous operations for public paths

## Testing

After applying, test by:
1. Logging out of the application
2. Visiting `/play/{pathId}` for a public path
3. Verify you can see the path and start simulations
