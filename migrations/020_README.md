# Migration 020: Fix Chats Insert Policy

## Problem

The previous `chats_insert_policy` only allowed inserting chats for simulations that are part of public paths. This prevented authenticated users from creating chats when running their own simulations from the `/simulations` page.

## Solution

Updated the policy to allow two scenarios:
1. **Anonymous users** can create chats for simulations that are part of public paths
2. **Authenticated users** can create chats for their own simulations (owned by them)

## How to Apply

### Using Supabase SQL Editor (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the content from `migrations/020_fix_chats_insert_policy.sql`
4. Execute the query

## After Migration

Authenticated users will be able to run simulations from the `/simulations` page without getting 403 errors.
