# Fix DATABASE_URL - Service Name Mismatch

## ❌ The Problem

Your services are:
- Main app: `StoryBook-Backend`
- Postgres: `Postgres` (capital P)

But DATABASE_URL uses: `postgres.railway.internal` (lowercase)

**Railway service names are case-sensitive!** This is why the connection fails.

---

## ✅ The Fix

### Update DATABASE_URL in StoryBook-Backend

1. **Go to Railway dashboard**
2. **Click on `StoryBook-Backend` service**
3. **Go to "Variables" tab**
4. **Find `DATABASE_URL`**
5. **Change from:**
   ```
   postgresql://postgres:password@postgres.railway.internal:5432/railway
   ```
   Or if it's using:
   ```
   ${{postgres.DATABASE_URL}}
   ```

6. **To:**
   ```
   ${{Postgres.DATABASE_URL}}
   ```
   (Capital P to match your service name!)

7. **Click "Save" or "Update"**
8. **Redeploy the service** (Railway should auto-redeploy)

---

## 🎯 Why This Works

Railway's variable reference `${{Postgres.DATABASE_URL}}` automatically:
- Uses the correct service name (`Postgres`)
- Gets the correct internal network address
- Includes the correct credentials
- Works with Railway's internal networking

---

## ✅ After Fix

Once you update and redeploy:

1. **The connection should work**
2. **No more timeout errors**
3. **Database migrations will run**
4. **App will start successfully**

---

## 🧪 Verify It Works

After redeploying, check the logs:

```bash
railway run --service StoryBook-Backend npx prisma db execute --stdin --schema ./prisma/schema.prisma
```

Type: `SELECT 1;` and press Enter

**Should return:** Success (no error)

---

## 📝 Summary

**Change:**
- `${{postgres.DATABASE_URL}}` ❌ (lowercase)
- To: `${{Postgres.DATABASE_URL}}` ✅ (capital P)

**That's it!** Just update the variable and redeploy. 🚀

