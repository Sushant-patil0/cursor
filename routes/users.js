const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, email, preferences } = req.body;
    const user = await User.findById(req.user.id);
    
    if (name) user.name = name;
    if (email) user.email = email;
    if (preferences) user.preferences = { ...user.preferences, ...preferences };
    
    await user.save();
    res.json({ message: 'Profile updated successfully', user });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({
      totalActivities: user.activities?.length || 0,
      totalEmissions: user.totalEmissions || 0,
      memberSince: user.createdAt,
      currentStreak: user.currentStreak || 0,
      bestStreak: user.bestStreak || 0
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const users = await User.find()
      .select('name totalEmissions currentStreak')
      .sort({ totalEmissions: 1, currentStreak: -1 })
      .limit(10);
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
