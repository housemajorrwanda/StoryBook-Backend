# Fix DATABASE_URL - Use Postgres Service Variables

## ❌ The Problem

Your `StoryBook-Backend` has:
```
DATABASE_URL="${{Postgres.DATABASE_URL}}"
```

But Railway might not expose `DATABASE_URL` from the Postgres service as a referenceable variable.

---

## ✅ The Solution

Use the Postgres service's individual variables to construct the DATABASE_URL:

### Update StoryBook-Backend DATABASE_URL

**Change from:**
```
DATABASE_URL="${{Postgres.DATABASE_URL}}"
```

**To:**
```
DATABASE_URL="postgresql://${{Postgres.PGUSER}}:${{Postgres.POSTGRES_PASSWORD}}@${{Postgres.RAILWAY_PRIVATE_DOMAIN}}:5432/${{Postgres.PGDATABASE}}"
```

Or simpler, using the variables you showed:
```
DATABASE_URL="postgresql://${{Postgres.POSTGRES_USER}}:${{Postgres.POSTGRES_PASSWORD}}@${{Postgres.RAILWAY_PRIVATE_DOMAIN}}:5432/${{Postgres.POSTGRES_DB}}"
```

---

## 🎯 Step-by-Step Fix

1. **Go to Railway dashboard**
2. **Click on `StoryBook-Backend` service**
3. **Go to "Variables" tab**
4. **Find `DATABASE_URL`**
5. **Update to:**
   ```
   DATABASE_URL="postgresql://${{Postgres.POSTGRES_USER}}:${{Postgres.POSTGRES_PASSWORD}}@${{Postgres.RAILWAY_PRIVATE_DOMAIN}}:5432/${{Postgres.POSTGRES_DB}}"
   ```
6. **Save/Redeploy**

---

## 📝 What This Does

This constructs the connection string using:
- `${{Postgres.POSTGRES_USER}}` → `postgres`
- `${{Postgres.POSTGRES_PASSWORD}}` → `yRpUjImrHldVDBOeMEuLRuHgDyNuppmj`
- `${{Postgres.RAILWAY_PRIVATE_DOMAIN}}` → Internal domain (e.g., `postgres.railway.internal`)
- `${{Postgres.POSTGRES_DB}}` → `railway`

**Result:** `postgresql://postgres:password@postgres.railway.internal:5432/railway`

---

## ✅ Also Fix AI URLs

I notice your AI URLs are pointing to the main app instead of the separate services:

**Current (WRONG):**
```
AI_EMBEDDING_URL="https://storybook-backend-production-574d.up.railway.app/api/embeddings"
AI_TRANSCRIBE_URL="https://storybook-backend-production-574d.up.railway.app/api/transcribe"
```

**Should be (if you have separate services):**
```
AI_EMBEDDING_URL="https://your-embedding-service.up.railway.app/embeddings"
AI_TRANSCRIBE_URL="https://your-transcription-service.up.railway.app/transcribe"
```

**And fix the model name:**
```
AI_TRANSCRIBE_MODEL="large-v3"
```
(Not `faster-whisper-large-v3`)

---

## 🧪 Test After Fix

After redeploying, test the connection:

```bash
railway run --service StoryBook-Backend npx prisma db execute --stdin --schema ./prisma/schema.prisma
```

Type: `SELECT 1;` and press Enter

**Should work now!** ✅

---

## 📋 Summary of Changes Needed

1. **DATABASE_URL:** Use Postgres service variables
2. **AI_EMBEDDING_URL:** Point to embedding service (not main app)
3. **AI_TRANSCRIBE_URL:** Point to transcription service (not main app)
4. **AI_TRANSCRIBE_MODEL:** Change to `large-v3`

---

**Update DATABASE_URL first - that's the main issue!** 🚀

