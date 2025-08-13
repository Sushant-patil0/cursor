const express = require('express');
const router = express.Router();
const Challenge = require('../models/Challenge');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Get all challenges
router.get('/', async (req, res) => {
  try {
    const challenges = await Challenge.find({ isActive: true })
      .populate('participants.user', 'name email')
      .sort({ createdAt: -1 });
    res.json(challenges);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get challenge by ID
router.get('/:id', async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id)
      .populate('participants.user', 'name email')
      .populate('createdBy', 'name email');
    
    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }
    
    res.json(challenge);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new challenge (admin only)
router.post('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.isAdmin) {
      return res.status(403).json({ message: 'Only admins can create challenges' });
    }
    
    const { title, description, goal, duration, reward, category } = req.body;
    
    const challenge = new Challenge({
      title,
      description,
      goal,
      duration,
      reward,
      category,
      createdBy: req.user.id,
      startDate: new Date(),
      endDate: new Date(Date.now() + duration * 24 * 60 * 60 * 1000)
    });
    
    await challenge.save();
    res.json(challenge);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Join challenge
router.post('/:id/join', auth, async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }
    
    if (!challenge.isActive) {
      return res.status(400).json({ message: 'Challenge is not active' });
    }
    
    const isAlreadyJoined = challenge.participants.some(
      p => p.user.toString() === req.user.id
    );
    
    if (isAlreadyJoined) {
      return res.status(400).json({ message: 'Already joined this challenge' });
    }
    
    challenge.participants.push({
      user: req.user.id,
      joinedAt: new Date(),
      progress: 0
    });
    
    await challenge.save();
    res.json({ message: 'Successfully joined challenge', challenge });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update challenge progress
router.put('/:id/progress', auth, async (req, res) => {
  try {
    const { progress } = req.body;
    const challenge = await Challenge.findById(req.params.id);
    
    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }
    
    const participant = challenge.participants.find(
      p => p.user.toString() === req.user.id
    );
    
    if (!participant) {
      return res.status(400).json({ message: 'Not participating in this challenge' });
    }
    
    participant.progress = progress;
    participant.lastUpdated = new Date();
    
    // Check if goal is achieved
    if (progress >= challenge.goal && !participant.completed) {
      participant.completed = true;
      participant.completedAt = new Date();
    }
    
    await challenge.save();
    res.json({ message: 'Progress updated successfully', challenge });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Leave challenge
router.delete('/:id/leave', auth, async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }
    
    challenge.participants = challenge.participants.filter(
      p => p.user.toString() !== req.user.id
    );
    
    await challenge.save();
    res.json({ message: 'Successfully left challenge', challenge });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's challenges
router.get('/user/me', auth, async (req, res) => {
  try {
    const challenges = await Challenge.find({
      'participants.user': req.user.id
    }).populate('participants.user', 'name email');
    
    res.json(challenges);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
