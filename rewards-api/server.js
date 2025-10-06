require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin SDK
// Option 1: Using service account key file (recommended for development)
// Place your serviceAccountKey.json in the root directory
try {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (error) {
  // Option 2: Using environment variables (recommended for production)
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  });
}

const db = admin.firestore();

// ==================== REWARDS CONFIGURATION ====================
const XP_PER_REWARD = 1000;
const REWARD_TYPES = {
  COINS: 'coins',
  TROPHIES: 'trophies'
};

// Reward structure: each milestone gives coins and trophies
const REWARD_AMOUNTS = {
  1: { coins: 100, trophies: 10 },   // 1000 XP
  2: { coins: 200, trophies: 20 },   // 2000 XP
  3: { coins: 300, trophies: 30 },   // 3000 XP
  4: { coins: 500, trophies: 50 },   // 4000 XP
  5: { coins: 750, trophies: 75 },   // 5000 XP
  // Add more levels as needed, or use formula below
};

// Calculate reward for any level
function getRewardForLevel(level) {
  // If predefined reward exists, use it
  if (REWARD_AMOUNTS[level]) {
    return REWARD_AMOUNTS[level];
  }
  // Otherwise, use a formula (scales with level)
  return {
    coins: level * 100,
    trophies: level * 10
  };
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Calculate how many reward milestones a player has reached
 * @param {number} xp - Player's total XP
 * @returns {number} - Number of milestones reached
 */
function calculateMilestonesReached(xp) {
  return Math.floor(xp / XP_PER_REWARD);
}

/**
 * Calculate total rewards earned for given milestones
 * @param {number} milestones - Number of milestones
 * @returns {Object} - Total coins and trophies
 */
function calculateTotalRewards(milestones) {
  let totalCoins = 0;
  let totalTrophies = 0;

  for (let i = 1; i <= milestones; i++) {
    const reward = getRewardForLevel(i);
    totalCoins += reward.coins;
    totalTrophies += reward.trophies;
  }

  return { totalCoins, totalTrophies };
}

// ==================== ROUTES ====================

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Mystical Monsters Rewards API is running',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/rewards/:uid
 * Get available rewards for a user based on their XP
 */
app.get('/api/rewards/:uid', async (req, res) => {
  try {
    const { uid } = req.params;

    // Fetch user document from Firestore
    const userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        error: 'User not found',
        uid: uid
      });
    }

    const userData = userDoc.data();
    const currentXp = userData.exp || 0;
    const claimedMilestones = userData.claimedRewardMilestones || 0;

    // Calculate milestones reached
    const milestonesReached = calculateMilestonesReached(currentXp);
    const unclaimedMilestones = milestonesReached - claimedMilestones;

    // Calculate rewards for unclaimed milestones
    let pendingCoins = 0;
    let pendingTrophies = 0;
    const rewardDetails = [];

    for (let i = claimedMilestones + 1; i <= milestonesReached; i++) {
      const reward = getRewardForLevel(i);
      pendingCoins += reward.coins;
      pendingTrophies += reward.trophies;
      rewardDetails.push({
        milestone: i,
        xpRequired: i * XP_PER_REWARD,
        coins: reward.coins,
        trophies: reward.trophies
      });
    }

    // Next milestone info
    const nextMilestone = milestonesReached + 1;
    const xpForNextReward = nextMilestone * XP_PER_REWARD;
    const xpNeeded = xpForNextReward - currentXp;

    res.json({
      success: true,
      user: {
        uid: uid,
        username: userData.username,
        currentXp: currentXp,
        currentCoins: userData.coins || 0,
        currentTrophies: userData.trophies || 0
      },
      rewards: {
        milestonesReached: milestonesReached,
        claimedMilestones: claimedMilestones,
        unclaimedMilestones: unclaimedMilestones,
        pendingCoins: pendingCoins,
        pendingTrophies: pendingTrophies,
        rewardDetails: rewardDetails
      },
      nextReward: {
        milestone: nextMilestone,
        xpRequired: xpForNextReward,
        xpNeeded: xpNeeded,
        reward: getRewardForLevel(nextMilestone)
      }
    });

  } catch (error) {
    console.error('Error fetching rewards:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * POST /api/rewards/claim
 * Claim pending rewards for a user
 * Body: { uid: string }
 */
app.post('/api/rewards/claim', async (req, res) => {
  try {
    const { uid } = req.body;

    if (!uid) {
      return res.status(400).json({
        error: 'Missing required field: uid'
      });
    }

    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({
        error: 'User not found',
        uid: uid
      });
    }

    const userData = userDoc.data();
    const currentXp = userData.exp || 0;
    const currentCoins = userData.coins || 0;
    const currentTrophies = userData.trophies || 0;
    const claimedMilestones = userData.claimedRewardMilestones || 0;

    // Calculate milestones reached
    const milestonesReached = calculateMilestonesReached(currentXp);

    if (milestonesReached <= claimedMilestones) {
      return res.status(400).json({
        error: 'No rewards available to claim',
        message: `You need ${((claimedMilestones + 1) * XP_PER_REWARD) - currentXp} more XP to earn the next reward`
      });
    }

    // Calculate rewards to claim
    let coinsToAdd = 0;
    let trophiesToAdd = 0;
    const claimedRewards = [];

    for (let i = claimedMilestones + 1; i <= milestonesReached; i++) {
      const reward = getRewardForLevel(i);
      coinsToAdd += reward.coins;
      trophiesToAdd += reward.trophies;
      claimedRewards.push({
        milestone: i,
        xpRequired: i * XP_PER_REWARD,
        coins: reward.coins,
        trophies: reward.trophies
      });
    }

    // Update user document
    await userRef.update({
      coins: currentCoins + coinsToAdd,
      trophies: currentTrophies + trophiesToAdd,
      claimedRewardMilestones: milestonesReached,
      lastRewardClaimDate: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({
      success: true,
      message: 'Rewards claimed successfully!',
      claimed: {
        milestones: milestonesReached - claimedMilestones,
        totalCoins: coinsToAdd,
        totalTrophies: trophiesToAdd,
        details: claimedRewards
      },
      updated: {
        coins: currentCoins + coinsToAdd,
        trophies: currentTrophies + trophiesToAdd,
        claimedMilestones: milestonesReached
      }
    });

  } catch (error) {
    console.error('Error claiming rewards:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/rewards/leaderboard
 * Get top players by XP (optional feature)
 */
app.get('/api/rewards/leaderboard', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const snapshot = await db.collection('users')
      .orderBy('exp', 'desc')
      .limit(limit)
      .get();

    const leaderboard = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      leaderboard.push({
        uid: doc.id,
        username: data.username,
        exp: data.exp || 0,
        trophies: data.trophies || 0,
        milestonesReached: calculateMilestonesReached(data.exp || 0)
      });
    });

    res.json({
      success: true,
      leaderboard: leaderboard
    });

  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested endpoint does not exist'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🎮 Mystical Monsters Rewards API is running on port ${PORT}`);
  console.log(`📊 Reward system: ${XP_PER_REWARD} XP per milestone`);
  console.log(`🔥 Health check: http://localhost:${PORT}/api/health`);
});
