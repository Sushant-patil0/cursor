const express = require('express');
const router = express.Router();
const EmissionFactor = require('../models/EmissionFactor');
const auth = require('../middleware/auth');

// Get emission factors
router.get('/factors', async (req, res) => {
  try {
    const factors = await EmissionFactor.find();
    res.json(factors);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Calculate carbon footprint for an activity
router.post('/calculate', auth, async (req, res) => {
  try {
    const { activityType, value, unit, date } = req.body;
    
    const factor = await EmissionFactor.findOne({ 
      activityType, 
      unit 
    });
    
    if (!factor) {
      return res.status(400).json({ 
        message: 'Emission factor not found for this activity type and unit' 
      });
    }
    
    const emissions = value * factor.factor;
    
    res.json({
      activityType,
      value,
      unit,
      emissions,
      factor: factor.factor,
      date: date || new Date()
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get carbon offset options
router.get('/offset-options', async (req, res) => {
  try {
    const offsetOptions = [
      {
        id: 1,
        name: 'Tree Planting',
        description: 'Plant trees to absorb CO2',
        costPerTon: 25,
        effectiveness: 'High',
        duration: '20-50 years'
      },
      {
        id: 2,
        name: 'Renewable Energy',
        description: 'Support renewable energy projects',
        costPerTon: 15,
        effectiveness: 'High',
        duration: 'Immediate'
      },
      {
        id: 3,
        name: 'Ocean Conservation',
        description: 'Protect marine ecosystems',
        costPerTon: 30,
        effectiveness: 'Medium',
        duration: 'Ongoing'
      }
    ];
    
    res.json(offsetOptions);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Calculate offset cost
router.post('/offset-cost', auth, async (req, res) => {
  try {
    const { emissions, offsetType } = req.body;
    
    const offsetOptions = {
      'tree-planting': 25,
      'renewable-energy': 15,
      'ocean-conservation': 30
    };
    
    const costPerTon = offsetOptions[offsetType] || 25;
    const totalCost = emissions * costPerTon;
    
    res.json({
      emissions,
      offsetType,
      costPerTon,
      totalCost: Math.round(totalCost * 100) / 100
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
