const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  category: {
    type: String,
    enum: ['emission_reduction', 'habit_formation', 'community', 'innovation'],
    required: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard', 'expert'],
    required: true
  },
  type: {
    type: String,
    enum: ['individual', 'team', 'community'],
    required: true
  },
  goal: {
    target: {
      type: Number,
      required: true,
      min: 0
    },
    unit: {
      type: String,
      required: true
    },
    description: String
  },
  duration: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    isRecurring: {
      type: Boolean,
      default: false
    },
    recurringPattern: {
      frequency: {
        type: String,
        enum: ['weekly', 'monthly', 'quarterly']
      },
      interval: Number
    }
  },
  rewards: {
    points: {
      type: Number,
      default: 0
    },
    badges: [{
      name: String,
      description: String,
      icon: String
    }],
    certificates: [{
      name: String,
      description: String,
      template: String
    }]
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    progress: {
      current: {
        type: Number,
        default: 0
      },
      percentage: {
        type: Number,
        default: 0
      },
      completed: {
        type: Boolean,
        default: false
      },
      completedAt: Date
    },
    achievements: [{
      type: String,
      earnedAt: {
        type: Date,
        default: Date.now
      }
    }]
  }],
  leaderboard: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    score: Number,
    rank: Number,
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  }],
  rules: [{
    type: String,
    trim: true
  }],
  tips: [{
    title: String,
    description: String,
    category: String
  }],
  resources: [{
    title: String,
    description: String,
    url: String,
    type: {
      type: String,
      enum: ['article', 'video', 'tool', 'guide']
    }
  }],
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'completed', 'archived'],
    default: 'draft'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  moderators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  tags: [{
    type: String,
    trim: true
  }],
  visibility: {
    type: String,
    enum: ['public', 'private', 'invite_only'],
    default: 'public'
  },
  maxParticipants: {
    type: Number,
    default: 0 // 0 means unlimited
  },
  currentParticipants: {
    type: Number,
    default: 0
  },
  featured: {
    type: Boolean,
    default: false
  },
  featuredAt: Date
}, {
  timestamps: true
});

challengeSchema.index({ status: 1, startDate: -1 });
challengeSchema.index({ category: 1, difficulty: 1 });
challengeSchema.index({ 'participants.user': 1 });

challengeSchema.methods.addParticipant = function(userId) {
  if (this.maxParticipants > 0 && this.currentParticipants >= this.maxParticipants) {
    throw new Error('Challenge is full');
  }
  
  if (!this.participants.find(p => p.user.toString() === userId.toString())) {
    this.participants.push({ user: userId });
    this.currentParticipants += 1;
    return this.save();
  }
  return Promise.resolve(this);
};

challengeSchema.methods.updateParticipantProgress = function(userId, progress) {
  const participant = this.participants.find(p => p.user.toString() === userId.toString());
  if (participant) {
    participant.progress.current = progress;
    participant.progress.percentage = Math.min((progress / this.goal.target) * 100, 100);
    
    if (participant.progress.percentage >= 100 && !participant.progress.completed) {
      participant.progress.completed = true;
      participant.progress.completedAt = new Date();
    }
    
    return this.save();
  }
  return Promise.resolve(this);
};

challengeSchema.methods.updateLeaderboard = function() {
  this.leaderboard = this.participants
    .map(p => ({
      user: p.user,
      score: p.progress.current,
      lastUpdated: new Date()
    }))
    .sort((a, b) => b.score - a.score)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
  
  return this.save();
};

module.exports = mongoose.model('Challenge', challengeSchema); 