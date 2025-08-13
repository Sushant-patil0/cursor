const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    enum: ['transport', 'energy', 'food', 'shopping', 'waste', 'other'],
    required: true
  },
  subcategory: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    required: true
  },
  emissionFactor: {
    type: Number,
    required: true,
    min: 0
  },
  totalEmissions: {
    type: Number,
    required: true,
    min: 0
  },
  location: {
    country: String,
    city: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  metadata: {
    // Transport specific
    vehicleType: String,
    fuelType: String,
    distance: Number,
    passengers: Number,
    
    // Energy specific
    energySource: String,
    efficiency: Number,
    
    // Food specific
    foodType: String,
    origin: String,
    packaging: String,
    
    // Shopping specific
    productType: String,
    brand: String,
    deliveryMethod: String,
    
    // Waste specific
    wasteType: String,
    disposalMethod: String,
    recycled: Boolean
  },
  tags: [{
    type: String,
    trim: true
  }],
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringPattern: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly']
    },
    interval: Number,
    endDate: Date
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  attachments: [{
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    url: String
  }],
  verified: {
    type: Boolean,
    default: false
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: Date
}, {
  timestamps: true
});

// Indexes for better query performance
activitySchema.index({ user: 1, date: -1 });
activitySchema.index({ user: 1, category: 1, date: -1 });
activitySchema.index({ date: -1 });

// Virtual for formatted date
activitySchema.virtual('formattedDate').get(function() {
  return this.date.toLocaleDateString();
});

// Method to calculate emissions
activitySchema.methods.calculateEmissions = function() {
  this.totalEmissions = this.quantity * this.emissionFactor;
  return this.totalEmissions;
};

// Method to get activity summary
activitySchema.methods.getSummary = function() {
  return {
    id: this._id,
    category: this.category,
    subcategory: this.subcategory,
    title: this.title,
    date: this.date,
    quantity: this.quantity,
    unit: this.unit,
    totalEmissions: this.totalEmissions,
    tags: this.tags
  };
};

// Static method to get user's total emissions for a period
activitySchema.statics.getUserEmissions = async function(userId, startDate, endDate) {
  const activities = await this.find({
    user: userId,
    date: { $gte: startDate, $lte: endDate }
  });
  
  const totalEmissions = activities.reduce((sum, activity) => sum + activity.totalEmissions, 0);
  const categoryBreakdown = activities.reduce((acc, activity) => {
    if (!acc[activity.category]) acc[activity.category] = 0;
    acc[activity.category] += activity.totalEmissions;
    return acc;
  }, {});
  
  return {
    totalEmissions,
    categoryBreakdown,
    activityCount: activities.length
  };
};

module.exports = mongoose.model('Activity', activitySchema); 