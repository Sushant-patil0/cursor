const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'super_admin'],
    default: 'user'
  },
  profile: {
    firstName: {
      type: String,
      trim: true,
      maxlength: 50
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: 50
    },
    avatar: {
      type: String,
      default: ''
    },
    location: {
      country: String,
      city: String,
      timezone: String
    },
    preferences: {
      units: {
        type: String,
        enum: ['metric', 'imperial'],
        default: 'metric'
      },
      notifications: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true }
      }
    }
  },
  stats: {
    totalEmissions: {
      type: Number,
      default: 0
    },
    totalOffset: {
      type: Number,
      default: 0
    },
    netEmissions: {
      type: Number,
      default: 0
    },
    streakDays: {
      type: Number,
      default: 0
    },
    lastActivityDate: {
      type: Date,
      default: Date.now
    }
  },
  achievements: [{
    type: {
      type: String,
      enum: ['emission_reduction', 'streak', 'challenge', 'offset', 'habit']
    },
    title: String,
    description: String,
    earnedAt: {
      type: Date,
      default: Date.now
    },
    icon: String
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create indexes for better query performance
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ role: 1 });
userSchema.index({ 'stats.totalEmissions': -1 });
userSchema.index({ 'stats.streakDays': -1 });
userSchema.index({ lastLogin: -1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to get public profile
userSchema.methods.getPublicProfile = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

// Method to update stats
userSchema.methods.updateStats = function(emissions, offset = 0) {
  this.stats.totalEmissions += emissions;
  this.stats.totalOffset += offset;
  this.stats.netEmissions = this.stats.totalEmissions - this.stats.totalOffset;
  
  // Update streak
  const today = new Date();
  const lastActivity = new Date(this.stats.lastActivityDate);
  const diffTime = Math.abs(today - lastActivity);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) {
    this.stats.streakDays += 1;
  } else if (diffDays > 1) {
    this.stats.streakDays = 1;
  }
  
  this.stats.lastActivityDate = today;
  return this.save();
};

module.exports = mongoose.model('User', userSchema); 