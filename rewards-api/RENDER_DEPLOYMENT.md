# Deploying Rewards API to Render 🚀

This guide will walk you through deploying your Mystical Monsters Rewards API to Render's free tier.

## Prerequisites

- ✅ GitHub account
- ✅ Render account (sign up at [render.com](https://render.com))
- ✅ Firebase service account credentials

---

## Step 1: Push Code to GitHub

1. **Navigate to the project root:**
   ```bash
   cd /Users/quellonnaicker/Source/prog7314-poe-part-2-Kian-JL-Campbell
   ```

2. **Check git status:**
   ```bash
   git status
   ```

3. **Add the rewards-api folder:**
   ```bash
   git add rewards-api/
   ```

4. **Commit the changes:**
   ```bash
   git commit -m "Add rewards API for XP-based reward system"
   ```

5. **Push to GitHub:**
   ```bash
   git push origin main
   ```

   > If you haven't set up a remote repository yet:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git push -u origin main
   ```

---

## Step 2: Prepare Firebase Credentials

You'll need your Firebase credentials as environment variables for Render.

### Option A: Extract from serviceAccountKey.json (Recommended)

1. **Open your `serviceAccountKey.json` file**
2. **Copy these values:**
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (entire key including `-----BEGIN PRIVATE KEY-----`)
   - `client_email` → `FIREBASE_CLIENT_EMAIL`

### Option B: Get from Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** → **Service Accounts**
4. Click **Generate New Private Key**
5. Save the values as described above

---

## Step 3: Deploy to Render

### 3.1 Create New Web Service

1. **Go to [Render Dashboard](https://dashboard.render.com/)**

2. **Click "New +" → "Web Service"**

3. **Connect your GitHub repository:**
   - Click "Connect account" if first time
   - Select your repository: `prog7314-poe-part-2-Kian-JL-Campbell`

4. **Configure the service:**

   | Field | Value |
   |-------|-------|
   | **Name** | `mystical-monsters-rewards-api` (or any name you prefer) |
   | **Region** | Choose closest to you (e.g., Oregon, Frankfurt) |
   | **Branch** | `main` |
   | **Root Directory** | `rewards-api` ⚠️ **IMPORTANT** |
   | **Runtime** | `Node` |
   | **Build Command** | `npm install` |
   | **Start Command** | `npm start` |
   | **Plan** | `Free` |

### 3.2 Add Environment Variables

In the **Environment Variables** section, click "Add Environment Variable" and add these:

| Key | Value | Notes |
|-----|-------|-------|
| `PORT` | `10000` | Render default port |
| `FIREBASE_PROJECT_ID` | `your-project-id` | From serviceAccountKey.json |
| `FIREBASE_CLIENT_EMAIL` | `your-client-email@...` | From serviceAccountKey.json |
| `FIREBASE_PRIVATE_KEY` | `-----BEGIN PRIVATE KEY-----\n...` | **See note below** ⚠️ |
| `NODE_ENV` | `production` | Optional |

#### ⚠️ Important: FIREBASE_PRIVATE_KEY Format

The private key must be entered **exactly** as it appears in the JSON file, including:
- `-----BEGIN PRIVATE KEY-----`
- All `\n` characters (newlines)
- `-----END PRIVATE KEY-----`

**Example:**
```
-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n
```

> **Tip:** Copy the entire `private_key` value from your JSON file including the quotes, then paste it into Render. Remove the outer quotes but keep everything else.

### 3.3 Deploy

1. **Click "Create Web Service"**
2. Render will automatically:
   - Clone your repository
   - Run `npm install`
   - Start your server with `npm start`
3. **Wait for deployment** (2-3 minutes)

---

## Step 4: Verify Deployment

Once deployed, Render will give you a URL like:
```
https://mystical-monsters-rewards-api.onrender.com
```

### Test the API:

1. **Health Check:**
   ```bash
   curl https://YOUR_RENDER_URL.onrender.com/api/health
   ```

2. **Get Rewards (replace UID):**
   ```bash
   curl https://YOUR_RENDER_URL.onrender.com/api/rewards/1934TcnXyPdbUfRg7d8GVa6Hu143
   ```

You should see JSON responses! 🎉

---

## Step 5: Update Android App

Update your Android app to use the Render URL instead of localhost.

### In your Android project:

**Create `NetworkConfig.kt`:**
```kotlin
package com.ctrlaltelite.gametest

object NetworkConfig {
    // Production URL (Render)
    const val BASE_URL = "https://YOUR_RENDER_URL.onrender.com/"

    // Development URL (uncomment for local testing)
    // const val BASE_URL = "http://10.0.2.2:3000/" // Android emulator
}
```

**Update Retrofit initialization:**
```kotlin
private val apiService by lazy {
    Retrofit.Builder()
        .baseUrl(NetworkConfig.BASE_URL)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
        .create(RewardsApiService::class.java)
}
```

---

## Important Notes

### ⚠️ Free Tier Limitations

Render's free tier has some limitations:

1. **Cold Starts:** Service sleeps after 15 minutes of inactivity
   - First request after sleep takes 30-60 seconds
   - Subsequent requests are fast

2. **Monthly Hours:** 750 hours/month (enough for a single service)

3. **Performance:** Shared CPU resources

### 🔄 Auto-Deploy on Push

Render automatically redeploys when you push to your `main` branch:

```bash
# Make changes to your API
git add rewards-api/
git commit -m "Update reward amounts"
git push origin main
# Render will auto-deploy in ~2 minutes
```

### 📊 Monitoring

1. **View Logs:** Go to Render Dashboard → Your Service → Logs
2. **Check Status:** Dashboard shows deployment status
3. **Metrics:** Basic metrics available in dashboard

---

## Troubleshooting

### Problem: "Application failed to respond"

**Solution:** Check that:
- Root Directory is set to `rewards-api`
- Environment variables are correct
- PORT is set to `10000`

### Problem: "Firebase authentication error"

**Solution:**
- Verify `FIREBASE_PRIVATE_KEY` includes `\n` characters
- Check that all three Firebase env vars are set correctly
- Make sure the private key is the entire value from JSON

### Problem: "Module not found"

**Solution:**
- Make sure Build Command is `npm install`
- Check that `package.json` is in the `rewards-api` folder

### Problem: API is slow on first request

**Solution:**
- This is normal for free tier (cold start)
- Consider upgrading to paid tier ($7/month) for always-on service
- Or implement a keep-alive ping from your Android app

---

## Viewing Logs

To see your API logs in real-time:

1. Go to Render Dashboard
2. Click on your service
3. Click "Logs" tab
4. You'll see all console.log output and errors

---

## Custom Domain (Optional)

Render allows custom domains even on free tier:

1. Go to your service settings
2. Click "Custom Domain"
3. Add your domain (e.g., `api.mysticalmonsters.com`)
4. Follow DNS configuration instructions

---

## Next Steps

✅ API is deployed!
✅ Update Android app with production URL
✅ Test rewards flow end-to-end
✅ Monitor logs for any errors

### Recommended Enhancements:

1. **Add authentication:** Verify requests are from your app
2. **Rate limiting:** Prevent abuse
3. **Caching:** Speed up responses
4. **Monitoring:** Use services like Sentry for error tracking

---

## Support

If you encounter issues:
- Check Render logs first
- Review Render's [Node.js deployment guide](https://render.com/docs/deploy-node-express-app)
- Check Firebase Admin SDK [documentation](https://firebase.google.com/docs/admin/setup)

---

## Summary Checklist

- [ ] Push code to GitHub
- [ ] Create Render account
- [ ] Create new Web Service on Render
- [ ] Set Root Directory to `rewards-api`
- [ ] Add all environment variables
- [ ] Deploy and wait for build
- [ ] Test API endpoints
- [ ] Update Android app with Render URL
- [ ] Test rewards flow from app

Good luck with your deployment! 🚀
