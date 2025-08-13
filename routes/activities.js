const express = require('express');
const Activity = require('../models/Activity');
const EmissionFactor = require('../models/EmissionFactor');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/activities
// @desc    Create a new activity
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const {
      category,
      subcategory,
      title,
      description,
      date,
      quantity,
      unit,
      location,
      metadata,
      tags,
      notes
    } = req.body;

    // Find emission factor
    const emissionFactor = await EmissionFactor.findFactor(category, subcategory);
    if (!emissionFactor) {
      return res.status(400).json({ 
        message: 'Emission factor not found for this activity type' 
      });
    }

    // Calculate emissions
    const totalEmissions = emissionFactor.calculateEmissions(quantity, unit);

    // Create activity
    const activity = new Activity({
      user: req.user.id,
      category,
      subcategory,
      title,
      description,
      date: date || new Date(),
      quantity,
      unit,
      emissionFactor: emissionFactor.factor.value,
      totalEmissions,
      location,
      metadata,
      tags,
      notes
    });

    await activity.save();

    // Update user stats
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { 'stats.totalEmissions': totalEmissions },
      $set: { 'stats.lastActivityDate': new Date() }
    });

    res.json(activity);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/activities
// @desc    Get user's activities with filters
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const {
      category,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sortBy = 'date',
      sortOrder = 'desc'
    } = req.query;

    const query = { user: req.user.id };
    
    if (category) query.category = category;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const activities = await Activity.find(query)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('user', 'username profile.firstName profile.lastName');

    const total = await Activity.countDocuments(query);

    res.json({
      activities,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/activities/:id
// @desc    Get activity by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id)
      .populate('user', 'username profile.firstName profile.lastName');

    if (!activity) {
      return res.status(404).json({ message: 'Activity not found' });
    }

    // Check if user can access this activity
    if (activity.user._id.toString() !== req.user.id && 
        req.user.role !== 'admin' && 
        req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(activity);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Activity not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/activities/:id
// @desc    Update activity
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);

    if (!activity) {
      return res.status(404).json({ message: 'Activity not found' });
    }

    // Check if user can update this activity
    if (activity.user.toString() !== req.user.id && 
        req.user.role !== 'admin' && 
        req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const {
      category,
      subcategory,
      title,
      description,
      date,
      quantity,
      unit,
      location,
      metadata,
      tags,
      notes
    } = req.body;

    // If category, subcategory, quantity, or unit changed, recalculate emissions
    if (category || subcategory || quantity || unit) {
      const newCategory = category || activity.category;
      const newSubcategory = subcategory || activity.subcategory;
      const newQuantity = quantity || activity.quantity;
      const newUnit = unit || activity.unit;

      const emissionFactor = await EmissionFactor.findFactor(newCategory, newSubcategory);
      if (!emissionFactor) {
        return res.status(400).json({ 
          message: 'Emission factor not found for this activity type' 
        });
      }

      const newEmissions = emissionFactor.calculateEmissions(newQuantity, newUnit);
      const emissionsDiff = newEmissions - activity.totalEmissions;

      // Update user stats
      if (emissionsDiff !== 0) {
        await User.findByIdAndUpdate(req.user.id, {
          $inc: { 'stats.totalEmissions': emissionsDiff }
        });
      }

      activity.totalEmissions = newEmissions;
      activity.emissionFactor = emissionFactor.factor.value;
    }

    // Update other fields
    if (category) activity.category = category;
    if (subcategory) activity.subcategory = subcategory;
    if (title) activity.title = title;
    if (description !== undefined) activity.description = description;
    if (date) activity.date = date;
    if (quantity) activity.quantity = quantity;
    if (unit) activity.unit = unit;
    if (location) activity.location = location;
    if (metadata) activity.metadata = metadata;
    if (tags) activity.tags = tags;
    if (notes !== undefined) activity.notes = notes;

    await activity.save();
    res.json(activity);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Activity not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/activities/:id
// @desc    Delete activity
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);

    if (!activity) {
      return res.status(404).json({ message: 'Activity not found' });
    }

    // Check if user can delete this activity
    if (activity.user.toString() !== req.user.id && 
        req.user.role !== 'admin' && 
        req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update user stats
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { 'stats.totalEmissions': -activity.totalEmissions }
    });

    await activity.remove();
    res.json({ message: 'Activity removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Activity not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/activities/stats/summary
// @desc    Get user's activity summary
// @access  Private
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
    const end = endDate ? new Date(endDate) : new Date();

    const summary = await Activity.getUserEmissions(req.user.id, start, end);

    // Get category breakdown with percentages
    const categoryBreakdown = Object.entries(summary.categoryBreakdown).map(([category, emissions]) => ({
      category,
      emissions,
      percentage: (emissions / summary.totalEmissions) * 100
    }));

    res.json({
      period: { start, end },
      totalEmissions: summary.totalEmissions,
      categoryBreakdown,
      activityCount: summary.activityCount
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/activities/categories
// @desc    Get available activity categories and subcategories
// @access  Public
router.get('/categories', async (req, res) => {
  try {
    const categories = await EmissionFactor.distinct('category');
    const subcategories = {};
    
    for (const category of categories) {
      subcategories[category] = await EmissionFactor.distinct('subcategory', { category });
    }

    res.json({ categories, subcategories });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 