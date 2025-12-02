# Fix Database Connection Timeout

## ❌ The Problem

Your app can't connect to the Postgres database:
- Connection timeout after 60 seconds
- Database URL: `postgresql://postgres:***@postgres.railway.internal:5432/railway`
- Retrying 30 times but failing

---

## 🔍 Common Causes

### 1. Postgres Service Not Running
- Postgres service might be stopped or crashed
- Check Railway dashboard

### 2. Wrong Service Name
- URL uses `postgres.railway.internal` 
- But your Postgres service might have a different name
- Check exact service name in Railway

### 3. Wrong DATABASE_URL Format
- Railway variable reference might be incorrect
- Or DATABASE_URL might not be set properly

### 4. Network Connectivity
- Services might not be in the same Railway project
- Or networking not configured

---

## ✅ Step-by-Step Fix

### Step 1: Check Postgres Service Status

1. **Go to Railway dashboard**
2. **Find your Postgres service**
3. **Check:**
   - ✅ Is it running? (green checkmark)
   - ✅ What's the exact service name?
   - ✅ Are there any error logs?

### Step 2: Verify DATABASE_URL

1. **Go to your main app service** (StoryBook-Backend)
2. **Go to Variables tab**
3. **Check `DATABASE_URL`:**
   - Should be: `${{Postgres.DATABASE_URL}}`
   - Or: `${{Postgres.RAILWAY_PRIVATE_DOMAIN}}`
   - Or the full connection string

### Step 3: Check Service Name

**If your Postgres service is NOT named "Postgres":**

1. **Note the exact service name** (case-sensitive!)
2. **Update DATABASE_URL** to use correct service name:
   ```
   ${{YourPostgresServiceName.DATABASE_URL}}
   ```

### Step 4: Test Database Connection

**Option A: Using Railway CLI**

```bash
railway run --service your-main-app npx prisma db execute --stdin
```

Then type: `SELECT 1;`

**Option B: Check Railway Logs**

1. **Go to Postgres service** → **Deployments** → **View Logs**
2. **Look for connection attempts**
3. **Check for errors**

---

## 🎯 Quick Fixes

### Fix 1: Use Railway's DATABASE_URL Variable

In your main app's environment variables:

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

Railway automatically provides this if services are in the same project.

### Fix 2: Check Postgres Service Name

1. **Go to Postgres service** → **Settings** → **General**
2. **Check the service name**
3. **If it's not "Postgres", update DATABASE_URL:**

   ```
   DATABASE_URL=${{ActualServiceName.DATABASE_URL}}
   ```

### Fix 3: Verify Postgres is Running

1. **Go to Postgres service**
2. **Check deployment status** - should be green ✅
3. **If not running, restart it**

### Fix 4: Check Database Name

The URL shows database name `railway`. Make sure:
- Database exists
- User has permissions
- Database name matches what you expect

---

## 🧪 Test Database Connection

### Using Railway CLI:

```bash
# Link to your project
railway link

# Test connection from your main app
railway run --service StoryBook-Backend npx prisma db execute --stdin
```

Type: `SELECT 1;` and press Enter

### Check Connection String:

```bash
railway run --service StoryBook-Backend echo $DATABASE_URL
```

This shows the actual connection string being used.

---

## 📝 Common DATABASE_URL Formats

### Railway Variable Reference:
```
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

### Direct Connection (if services in same project):
```
DATABASE_URL=postgresql://user:password@postgres.railway.internal:5432/dbname
```

### Public Connection (not recommended):
```
DATABASE_URL=postgresql://user:password@postgres-production.up.railway.app:5432/dbname
```

---

## 🐛 Troubleshooting Checklist

- [ ] Postgres service is running (green checkmark)
- [ ] Postgres service name matches DATABASE_URL reference
- [ ] DATABASE_URL is set correctly in main app
- [ ] Both services are in the same Railway project
- [ ] Database exists and is accessible
- [ ] User has correct permissions
- [ ] Network connectivity between services

---

## 💡 Most Likely Issue

**The Postgres service name doesn't match!**

If your Postgres service is named something other than "Postgres" (like "Postgres-DB" or "postgres"), update:

```
DATABASE_URL=${{ActualServiceName.DATABASE_URL}}
```

---

**Check your Postgres service name first - that's usually the issue!** 🚀

