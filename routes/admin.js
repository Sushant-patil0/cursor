const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Activity = require('../models/Activity');
const Challenge = require('../models/Challenge');
const auth = require('../middleware/auth');

// Admin middleware - check if user is admin
const adminAuth = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.isAdmin) {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    next();
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all users (admin only)
router.get('/users', auth, adminAuth, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user by ID (admin only)
router.get('/users/:id', auth, adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user role (admin only)
router.put('/users/:id/role', auth, adminAuth, async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    user.role = role;
    await user.save();
    
    res.json({ message: 'User role updated successfully', user });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get system statistics (admin only)
router.get('/stats', auth, adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalActivities = await Activity.countDocuments();
    const totalChallenges = await Challenge.countDocuments();
    
    const activeUsers = await User.countDocuments({ 
      lastActivity: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } 
    });
    
    const totalEmissions = await Activity.aggregate([
      { $group: { _id: null, total: { $sum: '$emissions' } } }
    ]);
    
    res.json({
      totalUsers,
      totalActivities,
      totalChallenges,
      activeUsers,
      totalEmissions: totalEmissions[0]?.total || 0
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get recent activities (admin only)
router.get('/recent-activities', auth, adminAuth, async (req, res) => {
  try {
    const activities = await Activity.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(20);
    
    res.json(activities);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete user (admin only)
router.delete('/users/:id', auth, adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Delete user's activities
    await Activity.deleteMany({ user: req.params.id });
    
    // Delete user
    await User.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'User and associated data deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
