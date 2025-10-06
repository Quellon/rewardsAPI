# Mystical Monsters - Rewards API 🎮

A Node.js REST API that manages XP-based rewards for the Mystical Monsters card game. Players receive rewards (coins and trophies) for every 1000 XP milestone they reach.

## Features

- ✅ XP milestone tracking (every 1000 XP)
- ✅ Automatic reward calculation
- ✅ Claim rewards endpoint
- ✅ Firebase Firestore integration
- ✅ Leaderboard support
- ✅ Scalable reward system

## Reward System

| XP Milestone | Level | Coins | Trophies |
|-------------|-------|-------|----------|
| 1,000 XP    | 1     | 100   | 10       |
| 2,000 XP    | 2     | 200   | 20       |
| 3,000 XP    | 3     | 300   | 30       |
| 4,000 XP    | 4     | 500   | 50       |
| 5,000 XP    | 5     | 750   | 75       |
| 6,000+ XP   | 6+    | level × 100 | level × 10 |

## Installation

1. **Clone the repository** (if not already done)

2. **Navigate to the API directory:**
   ```bash
   cd rewards-api
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Set up Firebase Admin SDK:**

   **Option A: Using Service Account Key (Recommended for Development)**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project
   - Go to **Project Settings** → **Service Accounts**
   - Click **Generate New Private Key**
   - Save the JSON file as `serviceAccountKey.json` in the `rewards-api` folder

   **Option B: Using Environment Variables (Recommended for Production)**
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Fill in your Firebase credentials in `.env`

5. **Start the server:**
   ```bash
   npm start
   ```

   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

## API Endpoints

### 1. Health Check
**GET** `/api/health`

Check if the API is running.

**Response:**
```json
{
  "status": "ok",
  "message": "Mystical Monsters Rewards API is running",
  "timestamp": "2025-10-06T10:30:00.000Z"
}
```

---

### 2. Get User Rewards
**GET** `/api/rewards/:uid`

Get available rewards for a user based on their XP.

**Parameters:**
- `uid` (path) - Firebase user ID

**Example Request:**
```bash
curl http://localhost:3000/api/rewards/1934TcnXyPdbUfRg7d8GVa6Hu143
```

**Example Response:**
```json
{
  "success": true,
  "user": {
    "uid": "1934TcnXyPdbUfRg7d8GVa6Hu143",
    "username": "Kian Campbell",
    "currentXp": 2050,
    "currentCoins": 1175,
    "currentTrophies": 664
  },
  "rewards": {
    "milestonesReached": 2,
    "claimedMilestones": 0,
    "unclaimedMilestones": 2,
    "pendingCoins": 300,
    "pendingTrophies": 30,
    "rewardDetails": [
      {
        "milestone": 1,
        "xpRequired": 1000,
        "coins": 100,
        "trophies": 10
      },
      {
        "milestone": 2,
        "xpRequired": 2000,
        "coins": 200,
        "trophies": 20
      }
    ]
  },
  "nextReward": {
    "milestone": 3,
    "xpRequired": 3000,
    "xpNeeded": 950,
    "reward": {
      "coins": 300,
      "trophies": 30
    }
  }
}
```

---

### 3. Claim Rewards
**POST** `/api/rewards/claim`

Claim all pending rewards for a user.

**Request Body:**
```json
{
  "uid": "1934TcnXyPdbUfRg7d8GVa6Hu143"
}
```

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/rewards/claim \
  -H "Content-Type: application/json" \
  -d '{"uid":"1934TcnXyPdbUfRg7d8GVa6Hu143"}'
```

**Example Response:**
```json
{
  "success": true,
  "message": "Rewards claimed successfully!",
  "claimed": {
    "milestones": 2,
    "totalCoins": 300,
    "totalTrophies": 30,
    "details": [
      {
        "milestone": 1,
        "xpRequired": 1000,
        "coins": 100,
        "trophies": 10
      },
      {
        "milestone": 2,
        "xpRequired": 2000,
        "coins": 200,
        "trophies": 20
      }
    ]
  },
  "updated": {
    "coins": 1475,
    "trophies": 694,
    "claimedMilestones": 2
  }
}
```

---

### 4. Leaderboard
**GET** `/api/rewards/leaderboard?limit=10`

Get top players by XP.

**Query Parameters:**
- `limit` (optional) - Number of players to return (default: 10)

**Example Request:**
```bash
curl http://localhost:3000/api/rewards/leaderboard?limit=5
```

**Example Response:**
```json
{
  "success": true,
  "leaderboard": [
    {
      "uid": "1934TcnXyPdbUfRg7d8GVa6Hu143",
      "username": "Kian Campbell",
      "exp": 2050,
      "trophies": 694,
      "milestonesReached": 2
    }
  ]
}
```

---

## Firebase Database Structure

The API expects users to be stored in Firestore with the following structure:

```
users/{uid}/
  ├── username: string
  ├── email: string
  ├── exp: number
  ├── coins: number
  ├── trophies: number
  ├── claimedRewardMilestones: number (added by API)
  ├── lastRewardClaimDate: timestamp (added by API)
  ├── uid: string
  ├── provider: string
  └── createdAt: timestamp
```

**New fields added by the API:**
- `claimedRewardMilestones`: Tracks how many reward milestones the user has claimed
- `lastRewardClaimDate`: Timestamp of the last reward claim

---

## Integration with Android App

### Step 1: Add Retrofit/OkHttp to Android Project

Add to `app/build.gradle.kts`:
```kotlin
dependencies {
    // ... existing dependencies
    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.squareup.retrofit2:converter-gson:2.9.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.11.0")
}
```

### Step 2: Create API Service Interface

Create `RewardsApiService.kt`:
```kotlin
import retrofit2.Response
import retrofit2.http.*

data class RewardsResponse(
    val success: Boolean,
    val user: UserData,
    val rewards: RewardsData,
    val nextReward: NextRewardData
)

data class ClaimResponse(
    val success: Boolean,
    val message: String,
    val claimed: ClaimedData,
    val updated: UpdatedData
)

interface RewardsApiService {
    @GET("api/rewards/{uid}")
    suspend fun getRewards(@Path("uid") uid: String): Response<RewardsResponse>

    @POST("api/rewards/claim")
    suspend fun claimRewards(@Body request: ClaimRequest): Response<ClaimResponse>
}
```

### Step 3: Call API from ProfileActivity

```kotlin
// In ProfileActivity.kt
import kotlinx.coroutines.launch
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

class ProfileActivity : AppCompatActivity() {
    private val apiService by lazy {
        Retrofit.Builder()
            .baseUrl("http://10.0.2.2:3000/") // Android emulator
            // .baseUrl("http://localhost:3000/") // Real device (use your IP)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(RewardsApiService::class.java)
    }

    private fun loadRewards() {
        lifecycleScope.launch {
            try {
                val uid = FirebaseAuth.getInstance().currentUser?.uid ?: return@launch
                val response = apiService.getRewards(uid)

                if (response.isSuccessful && response.body()?.success == true) {
                    val rewards = response.body()!!.rewards
                    // Update UI with rewards
                    updateRewardsUI(rewards)
                }
            } catch (e: Exception) {
                Log.e("ProfileActivity", "Error loading rewards", e)
            }
        }
    }

    private fun claimRewards() {
        lifecycleScope.launch {
            try {
                val uid = FirebaseAuth.getInstance().currentUser?.uid ?: return@launch
                val response = apiService.claimRewards(ClaimRequest(uid))

                if (response.isSuccessful && response.body()?.success == true) {
                    Toast.makeText(this, "Rewards claimed!", Toast.LENGTH_SHORT).show()
                    loadRewards() // Refresh
                }
            } catch (e: Exception) {
                Log.e("ProfileActivity", "Error claiming rewards", e)
            }
        }
    }
}
```

---

## Testing

### Test with cURL

1. **Health Check:**
   ```bash
   curl http://localhost:3000/api/health
   ```

2. **Get Rewards (replace with your user UID):**
   ```bash
   curl http://localhost:3000/api/rewards/YOUR_UID_HERE
   ```

3. **Claim Rewards:**
   ```bash
   curl -X POST http://localhost:3000/api/rewards/claim \
     -H "Content-Type: application/json" \
     -d '{"uid":"YOUR_UID_HERE"}'
   ```

### Test with Postman

1. Import the endpoints into Postman
2. Set base URL: `http://localhost:3000`
3. Test each endpoint with sample data

---

## Deployment

### Deploy to Railway/Render/Heroku

1. Push code to GitHub
2. Connect your hosting platform to the repository
3. Set environment variables in the platform dashboard
4. Deploy!

### Environment Variables for Production
```
PORT=3000
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email
```

---

## Error Handling

The API returns standardized error responses:

```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

**Common Status Codes:**
- `200` - Success
- `400` - Bad request (missing parameters, no rewards available)
- `404` - User not found
- `500` - Internal server error

---

## Customization

### Change XP per Reward
Edit `server.js`:
```javascript
const XP_PER_REWARD = 1000; // Change this value
```

### Customize Reward Amounts
Edit the `REWARD_AMOUNTS` object in `server.js`:
```javascript
const REWARD_AMOUNTS = {
  1: { coins: 150, trophies: 15 },  // Custom rewards
  2: { coins: 300, trophies: 30 },
  // ...
};
```

---

## License

MIT License - Created by Mystical Monsters Team

---

## Support

For issues or questions, please contact the development team.
