# PayMyHustle - Development Setup

## Multiple Banking Details Feature

The application now supports multiple banking details with the ability to:
- Create and manage multiple bank accounts with descriptive names
- Set a default banking details
- Select which banking details to use per invoice
- View selected banking details in invoice preview and PDF

## Local Development Database Issue

There's a known issue with Cloudflare D1's local development where wrangler pages dev creates a fresh database instance that doesn't persist migrations correctly. Here are the solutions:

### Solution 1: Use Remote Database for Local Development (Recommended)

Instead of using the local database, use the remote production database:

```bash
# First, apply migrations to remote database
npx wrangler d1 execute paymyhustle-db --remote --file=./migrations/0001_initial_schema.sql
npx wrangler d1 execute paymyhustle-db --remote --file=./migrations/0002_recurring_invoices.sql
npx wrangler d1 execute paymyhustle-db --remote --file=./migrations/0003_multiple_banking_details.sql

# Build and run the dev server (it will use remote database automatically)
npm run build
npx wrangler pages dev dist
```

### Solution 2: Manual Database Setup Script

If you want to use the local database, you'll need to run migrations each time you start the dev server:

```bash
# Run the setup script
./setup-local-db.sh

# In a separate terminal, start the dev server IMMEDIATELY after
npm run build
npx wrangler pages dev dist --d1=DB=paymyhustle-db --port 8788
```

**Note:** The local database is ephemeral and may be reset by wrangler. You may need to re-run migrations periodically.

### Solution 3: Deploy to Production

The production deployment doesn't have this issue. Simply:

```bash
# Apply migrations to production
npx wrangler d1 execute paymyhustle-db --remote --file=./migrations/0001_initial_schema.sql
npx wrangler d1 execute paymyhustle-db --remote --file=./migrations/0002_recurring_invoices.sql
npx wrangler d1 execute paymyhustle-db --remote --file=./migrations/0003_multiple_banking_details.sql

# Deploy
npm run build
npx wrangler pages deploy dist
```

## Using the Multiple Banking Details Feature

1. Navigate to **Banking Details** in the sidebar
2. Click **Add Banking Details**
3. Fill in the details with a descriptive name (e.g., "Business Checking", "USD Account")
4. The first banking details you add will automatically become the default
5. You can manage (edit/delete) banking details from the list
6. Click "Set as Default" on any banking details to make it the default

When creating an invoice:
1. In the invoice form, you'll see a **Banking Details** dropdown
2. Select which banking details to use for that invoice
3. If you don't select any, the default banking details will be used automatically
4. The selected banking details will appear in the invoice preview and PDF

## Migration Files

- `migrations/0001_initial_schema.sql` - Initial database schema
- `migrations/0002_recurring_invoices.sql` - Recurring invoices feature
- `migrations/0003_multiple_banking_details.sql` - Multiple banking details (NEW)

## Troubleshooting

### "Failed to fetch banking details" Error

This usually means the database schema hasn't been applied. Try:

1. Check which database you're using (local or remote)
2. Re-run the appropriate migrations
3. Restart the dev server
4. If using local database, try using the remote database instead (Solution 1 above)

### Tables Don't Exist

If you see "no such table" errors:
1. Stop the dev server
2. Run `./setup-local-db.sh`
3. Start the dev server immediately after

### Changes Not Persisting

The local D1 database may be reset between dev server restarts. Use the remote database for persistent development data.
