# OneTap Shortcuts — Backend Guide (Lovable Cloud)

> **Purpose of this document:** Remove the fear of touching the backend. If you've never used a database or backend before, this document will walk you through everything this project uses, why it exists, and how to change it safely.

---

## Table of Contents

1. [What the Backend Does (and Does Not Do)](#1-what-the-backend-does-and-does-not-do)
2. [Why There Is Only One Backend Project](#2-why-there-is-only-one-backend-project)
3. [Database Tables Explained](#3-database-tables-explained)
4. [Row Level Security (RLS) — Beginner Explanation](#4-row-level-security-rls--beginner-explanation)
5. [How Google OAuth Works in This Project](#5-how-google-oauth-works-in-this-project)
6. [Edge Functions (Serverless Code)](#6-edge-functions-serverless-code)
7. [How to Apply Schema Changes Safely](#7-how-to-apply-schema-changes-safely)
8. [How to Delete User Data Correctly](#8-how-to-delete-user-data-correctly)
9. [What NOT to Change](#9-what-not-to-change)

---

## 1. What the Backend Does (and Does Not Do)

### ✅ What the Backend Does

| Feature | How |
|---------|-----|
| **Cloud sync** | Stores a backup copy of bookmarks, trash, and reminders |
| **Google sign-in** | Authenticates users via Google OAuth |
| **URL metadata** | Fetches page titles and favicons for saved URLs (avoids browser CORS issues) |
| **Account deletion** | Deletes all cloud data and the auth account |

### ❌ What the Backend Does NOT Do

| Not This | Why |
|----------|-----|
| Store shortcuts | Shortcuts are native Android widgets managed by `ShortcutManager` |
| Run background jobs | No cron jobs, no scheduled tasks, no workers |
| Send push notifications | Notifications are handled by Android's `AlarmManager` locally |
| Track analytics | Zero tracking, zero telemetry, by design |
| Serve the app | The app runs entirely on the device; the backend is just for data |

**Bottom line:** If the backend disappeared, the app would still work for everything except cloud sync and sign-in.

---

## 2. Why There Is Only One Backend Project

Most apps have a "staging" (test) environment and a "production" (live) environment. This app does not, for two reasons:

1. **Cost:** A second environment doubles hosting costs. This project targets $0/month.
2. **Simplicity:** With only one project, there's no risk of deploying to the wrong environment.

**What this means for you:** Every database change you make affects real users (if any exist). Always test changes carefully before applying them.

---

## 3. Database Tables Explained

The database has three tables. Each stores a copy of local data for cloud sync purposes.

### `cloud_bookmarks` — Synced Bookmarks

This table stores a backup of the user's saved bookmarks.

| Column | Type | What It Stores | Required? |
|--------|------|---------------|-----------|
| `id` | UUID | Auto-generated unique ID for the cloud row | Auto |
| `entity_id` | UUID | The bookmark's local ID (used to match local ↔ cloud) | Yes |
| `user_id` | UUID | The user who owns this bookmark | Yes |
| `url` | TEXT | The saved URL | Yes |
| `title` | TEXT | Page title (may be null if metadata fetch failed) | No |
| `description` | TEXT | Page description | No |
| `favicon` | TEXT | Favicon URL | No |
| `folder` | TEXT | Folder name (defaults to "Uncategorized") | Yes (default) |
| `created_at` | TIMESTAMP | When the cloud row was created | Auto |
| `updated_at` | TIMESTAMP | When the cloud row was last updated | Auto |

**Key concept:** `entity_id` is the bridge between local and cloud. When syncing, the app uses `entity_id` to determine if a bookmark already exists in the cloud.

### `cloud_trash` — Synced Deleted Bookmarks

When a user deletes a bookmark, it goes to "trash" (soft delete). This table backs up those trashed items.

| Column | Type | What It Stores | Required? |
|--------|------|---------------|-----------|
| `id` | UUID | Auto-generated cloud row ID | Auto |
| `entity_id` | UUID | The trashed item's local ID | Yes |
| `user_id` | UUID | The user who owns this item | Yes |
| `url` | TEXT | The original URL | Yes |
| `title` | TEXT | Page title | No |
| `description` | TEXT | Page description | No |
| `folder` | TEXT | Original folder name | Yes (default) |
| `deleted_at` | TIMESTAMP | When the item was deleted | Auto |
| `original_created_at` | TIMESTAMP | When the item was originally created | Auto |
| `retention_days` | INT | How many days to keep in trash (default: 30) | Auto |
| `created_at` | TIMESTAMP | Cloud row creation time | Auto |
| `updated_at` | TIMESTAMP | Cloud row update time | Auto |

### `cloud_scheduled_actions` — Synced Reminders

This table backs up scheduled reminders.

| Column | Type | What It Stores | Required? |
|--------|------|---------------|-----------|
| `id` | UUID | Auto-generated cloud row ID | Auto |
| `entity_id` | TEXT | The reminder's local ID | Yes |
| `user_id` | UUID | The user who owns this reminder | Yes |
| `name` | TEXT | Reminder name | Yes |
| `description` | TEXT | Reminder description | No |
| `destination` | JSONB | Where the shortcut points (URL, contact, etc.) | Yes |
| `trigger_time` | BIGINT | When to fire (Unix timestamp in milliseconds) | Yes |
| `recurrence` | TEXT | Repeat pattern: "once", "daily", "weekly", etc. | Yes (default: "once") |
| `recurrence_anchor` | JSONB | Data for calculating next occurrence | No |
| `enabled` | BOOLEAN | Whether the reminder is active | Yes (default: true) |
| `original_created_at` | BIGINT | Local creation timestamp | Yes |
| `created_at` | TIMESTAMP | Cloud row creation time | Auto |
| `updated_at` | TIMESTAMP | Cloud row update time | Auto |

---

## 4. Row Level Security (RLS) — Beginner Explanation

### What is RLS?

Imagine a filing cabinet where every drawer has a lock, and each user has a key that only opens their own drawer. That's RLS.

Without RLS, anyone who can connect to the database can read everyone's data. With RLS, the database itself enforces that **User A can only see User A's data**, even if the code has a bug.

### How It Works in This Project

Every table has RLS enabled with four policies:

```sql
-- 1. SELECT (reading data): You can only see YOUR rows
CREATE POLICY "Users can view their own bookmarks"
ON cloud_bookmarks FOR SELECT
USING (auth.uid() = user_id);
-- Translation: "Only show rows where user_id matches the logged-in user"

-- 2. INSERT (creating data): You can only create rows that belong to YOU
CREATE POLICY "Users can create their own bookmarks"
ON cloud_bookmarks FOR INSERT
WITH CHECK (auth.uid() = user_id);
-- Translation: "Only allow inserts where user_id is set to the logged-in user"

-- 3. UPDATE (editing data): You can only edit YOUR rows
CREATE POLICY "Users can update their own bookmarks"
ON cloud_bookmarks FOR UPDATE
USING (auth.uid() = user_id);

-- 4. DELETE (removing data): You can only delete YOUR rows
CREATE POLICY "Users can delete their own bookmarks"
ON cloud_bookmarks FOR DELETE
USING (auth.uid() = user_id);
```

**What `auth.uid()` means:** This is a built-in function that returns the ID of the currently logged-in user. If nobody is logged in, it returns null, and all policies fail (no data is accessible).

### Why This Matters

Even if your app code has a bug that accidentally requests someone else's data, the database will refuse. RLS is a safety net that catches mistakes in your code.

⚠️ **DANGER:**
Never disable RLS on a table that contains user data. Doing so would expose every user's data to every other user. If you need to query all users' data (e.g., for admin), use a server-side function with the `service_role` key — never from the client.

---

## 5. How Google OAuth Works in This Project

**What is OAuth?** It's a way to let users sign in using their Google account instead of creating a username and password. Google handles the identity verification; your app just receives a token that says "this user is who they claim to be."

**The flow (simplified):**

```
1. User taps "Sign in with Google"
2. A browser window opens showing Google's sign-in page
3. User selects their Google account
4. Google redirects back to the app with a temporary code
5. The app exchanges that code for a session token
6. The session token is stored locally by the Supabase SDK
7. Future API calls include this token automatically
```

**Sign-in is optional.** No features are locked behind sign-in. It only unlocks cloud sync.

**For the full technical flow**, see [ARCHITECTURE.md](ARCHITECTURE.md) → Section 6.

---

## 6. Edge Functions (Serverless Code)

Edge functions are small pieces of server-side code that run on-demand. They are NOT constantly running servers — they start when called and stop when done.

### `fetch-url-metadata`

**What it does:** When a user saves a URL, the app wants to show the page's title and favicon. Browsers block direct requests to other websites (called CORS). This function runs server-side where CORS doesn't apply.

- **Method:** POST
- **Auth:** None required (public)
- **Input:** `{ "url": "https://example.com" }`
- **Output:** `{ "title": "Example", "favicon": "https://...", "domain": "example.com" }`
- **Timeout:** 5 seconds
- **Fallback:** If the page can't be fetched, it uses Google's favicon service

### `delete-account`

**What it does:** Permanently deletes a user's cloud data and their authentication account.

- **Method:** POST
- **Auth:** Required (user must be signed in)
- **Flow:**
  1. Validates the user's authentication token
  2. Deletes all rows from `cloud_bookmarks` where `user_id` matches
  3. Deletes all rows from `cloud_trash` where `user_id` matches
  4. Deletes the authentication account via admin API
- **Output:** `{ "success": true }`

⚠️ **DANGER:**
This function uses the `service_role` key, which bypasses RLS. The service role key is stored as a server-side secret and is NEVER exposed to the client. Do not add it to `.env` or any client-side code.

---

## 7. How to Apply Schema Changes Safely

**When would you need to change the schema?** If you're adding a new feature that needs to store new data in the cloud. For example, adding a "notes" field to bookmarks would require adding a column to `cloud_bookmarks`.

### Step-by-Step Process

1. **Plan your change.** Write down exactly what you want to add, change, or remove.

2. **Check if it's additive or destructive:**
   - ✅ **Additive** (safe): Adding a new column, adding a new table
   - ⚠️ **Destructive** (dangerous): Removing a column, changing a column type, dropping a table

3. **For additive changes**, use the Lovable migration tool:
   ```sql
   -- Example: Add a "notes" column to cloud_bookmarks
   ALTER TABLE public.cloud_bookmarks
   ADD COLUMN notes TEXT;
   ```
   This is safe because existing rows will simply have `null` in the new column.

4. **For destructive changes**, check the live database first:
   ```sql
   -- Check if anyone has data in the column you want to remove
   SELECT COUNT(*) FROM cloud_bookmarks WHERE description IS NOT NULL;
   ```
   If there's real user data, you need a migration plan. Do NOT just drop the column.

5. **Always add RLS policies** for new tables:
   ```sql
   -- For any new table, enable RLS immediately
   ALTER TABLE public.new_table ENABLE ROW LEVEL SECURITY;

   -- Then add the four standard policies (SELECT, INSERT, UPDATE, DELETE)
   -- See Section 4 above for examples
   ```

6. **Test your change** before merging to `main`.

⚠️ **DANGER:**
Never run `DROP TABLE` or `ALTER TABLE ... DROP COLUMN` on production data without first confirming the data is backed up or no longer needed. These operations are irreversible.

---

## 8. How to Delete User Data Correctly

If a user requests data deletion (GDPR, CCPA, or just personal preference):

1. **In-app method:** The user can go to Profile → Delete Account. This calls the `delete-account` edge function, which removes all cloud data and the auth account.

2. **Manual method (if needed):**
   ```sql
   -- Find the user's ID first
   -- (You'll need this from the auth system — check Cloud dashboard → Users)

   -- Delete their bookmarks
   DELETE FROM cloud_bookmarks WHERE user_id = 'the-user-uuid';

   -- Delete their trash
   DELETE FROM cloud_trash WHERE user_id = 'the-user-uuid';

   -- Delete their scheduled actions
   DELETE FROM cloud_scheduled_actions WHERE user_id = 'the-user-uuid';

   -- Delete the auth account (requires admin access in Cloud dashboard)
   ```

**Important:** Local data on the user's phone is NOT affected by cloud deletion. That data is only on their device and under their control.

---

## 9. What NOT to Change

| File / Setting | Why You Must Not Change It |
|---|---|
| `src/integrations/supabase/client.ts` | Auto-generated. Lovable Cloud manages this. |
| `src/integrations/supabase/types.ts` | Auto-generated from your database schema. |
| `.env` | Auto-generated. Contains your project's connection details. |
| `supabase/config.toml` | Auto-generated. Supabase configuration. |
| RLS policies (removing them) | Removing RLS exposes all user data to all users. |
| `service_role` key | This key bypasses all security. Never use it in client code. Never expose it in `.env` or frontend files. It is only used inside edge functions. |

**Before making any backend change, ask yourself:**
1. What is this?
2. Why does it exist?
3. What breaks if I get this wrong?
4. How do I know it's working?
5. Can I undo this if it goes wrong?

If you can't confidently answer all five, research more before proceeding.

---

*Last updated: February 2026*
