# Database Connection Debug - Found the Issue!

## ❌ The Error

```
Can't reach database server at `postgres.railway.internal:5432`
```

**This means:** Your app can't connect to the Postgres service using Railway's internal networking.

---

## 🔍 Root Causes

### 1. Postgres Service Name Mismatch (Most Likely!)

The DATABASE_URL uses: `postgres.railway.internal:5432`

But your Postgres service might be named differently in Railway!

**Railway service names are case-sensitive:**
- ✅ `postgres` (lowercase)
- ❌ `Postgres` (capital P)
- ❌ `Postgres-DB`
- ❌ `postgres-db`

### 2. Postgres Service Not Running

Check if Postgres service is actually running in Railway.

### 3. Services Not in Same Project

Both services must be in the same Railway project for internal networking to work.

---

## ✅ How to Fix

### Step 1: Check Postgres Service Name

1. **Go to Railway dashboard**
2. **Find your Postgres service**
3. **Check the exact service name:**
   - Go to **Settings** → **General**
   - Note the **exact name** (case-sensitive!)

### Step 2: Update DATABASE_URL

**If service name is NOT "postgres":**

1. **Go to StoryBook-Backend** → **Variables**
2. **Find `DATABASE_URL`**
3. **Update to use correct service name:**

   **Option A: Use Railway variable (Recommended)**
   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   ```
   (Replace "Postgres" with your actual service name)

   **Option B: Manual connection string**
   ```
   DATABASE_URL=postgresql://postgres:password@ActualServiceName.railway.internal:5432/railway
   ```

### Step 3: Verify Postgres is Running

1. **Go to Postgres service**
2. **Check deployment status:**
   - Should show green checkmark ✅
   - Should show "Running" status
3. **If not running, restart it**

### Step 4: Check Both Services in Same Project

1. **Verify both services are in the same Railway project**
2. **If Postgres is in a different project, move it or use public connection**

---

## 🧪 Test After Fix

```bash
railway run --service StoryBook-Backend npx prisma db execute --stdin --schema ./prisma/schema.prisma
```

Type: `SELECT 1;` and press Enter

**Should return:** Success (no error)

---

## 📝 Quick Checklist

- [ ] Postgres service is running (green checkmark)
- [ ] Postgres service name matches DATABASE_URL
- [ ] Both services in same Railway project
- [ ] DATABASE_URL uses correct service name
- [ ] Test connection works

---

## 💡 Most Likely Fix

**Your Postgres service is probably named "Postgres" (capital P), but DATABASE_URL uses "postgres" (lowercase).**

**Fix:**
1. Check exact service name in Railway
2. Update DATABASE_URL to: `${{ActualServiceName.DATABASE_URL}}`

---

**Check your Postgres service name in Railway - that's the issue!** 🚀

