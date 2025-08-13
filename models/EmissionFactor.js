const mongoose = require('mongoose');

const emissionFactorSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: ['transport', 'energy', 'food', 'shopping', 'waste', 'other'],
    required: true
  },
  subcategory: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  factor: {
    value: {
      type: Number,
      required: true,
      min: 0
    },
    unit: {
      type: String,
      required: true
    },
    perUnit: {
      type: String,
      required: true
    }
  },
  region: {
    country: String,
    state: String,
    city: String
  },
  source: {
    name: String,
    url: String,
    year: Number,
    reliability: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium'
    }
  },
  conditions: {
    minValue: Number,
    maxValue: Number,
    unit: String,
    notes: String
  },
  alternatives: [{
    name: String,
    factor: Number,
    unit: String,
    description: String
  }],
  tags: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  version: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

emissionFactorSchema.index({ category: 1, subcategory: 1 });
emissionFactorSchema.index({ region: 1 });
emissionFactorSchema.index({ tags: 1 });

// Method to get emission factor with unit conversion
emissionFactorSchema.methods.calculateEmissions = function(quantity, fromUnit, toUnit = 'kg CO2e') {
  let convertedQuantity = quantity;
  
  // Basic unit conversions (can be expanded)
  if (fromUnit !== this.factor.perUnit) {
    convertedQuantity = this.convertUnit(quantity, fromUnit, this.factor.perUnit);
  }
  
  return convertedQuantity * this.factor.value;
};

// Basic unit conversion method
emissionFactorSchema.methods.convertUnit = function(value, fromUnit, toUnit) {
  const conversions = {
    // Distance
    'km': { 'miles': 0.621371, 'm': 1000 },
    'miles': { 'km': 1.60934, 'm': 1609.34 },
    'm': { 'km': 0.001, 'miles': 0.000621371 },
    
    // Weight
    'kg': { 'g': 1000, 'lbs': 2.20462 },
    'g': { 'kg': 0.001, 'lbs': 0.00220462 },
    'lbs': { 'kg': 0.453592, 'g': 453.592 },
    
    // Volume
    'L': { 'mL': 1000, 'gal': 0.264172 },
    'mL': { 'L': 0.001, 'gal': 0.000264172 },
    'gal': { 'L': 3.78541, 'mL': 3785.41 },
    
    // Energy
    'kWh': { 'Wh': 1000, 'MJ': 3.6 },
    'Wh': { 'kWh': 0.001, 'MJ': 0.0036 },
    'MJ': { 'kWh': 0.277778, 'Wh': 277.778 }
  };
  
  if (conversions[fromUnit] && conversions[fromUnit][toUnit]) {
    return value * conversions[fromUnit][toUnit];
  }
  
  return value; // Return original if conversion not found
};

// Static method to find emission factor
emissionFactorSchema.statics.findFactor = function(category, subcategory, region = null) {
  const query = { category, subcategory, isActive: true };
  
  if (region) {
    query.$or = [
      { 'region.country': region.country },
      { 'region.country': { $exists: false } }
    ];
  }
  
  return this.findOne(query).sort({ 'region.country': -1, version: -1 });
};

// Static method to get all factors for a category
emissionFactorSchema.statics.getCategoryFactors = function(category) {
  return this.find({ category, isActive: true }).sort({ subcategory: 1, name: 1 });
};

module.exports = mongoose.model('EmissionFactor', emissionFactorSchema); 