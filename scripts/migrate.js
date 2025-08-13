const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Activity = require('../models/Activity');
const Challenge = require('../models/Challenge');
const EmissionFactor = require('../models/EmissionFactor');

// Migration functions
const migrations = [
  {
    version: 1,
    name: 'Add user profile fields',
    description: 'Add missing profile fields to existing users',
    run: async () => {
      console.log('🔄 Running migration: Add user profile fields');
      
      const usersWithoutProfile = await User.find({
        $or: [
          { 'profile.bio': { $exists: false } },
          { 'profile.location': { $exists: false } },
          { 'profile.avatar': { $exists: false } }
        ]
      });

      for (const user of usersWithoutProfile) {
        await User.findByIdAndUpdate(user._id, {
          $set: {
            'profile.bio': user.profile?.bio || 'No bio provided',
            'profile.location': user.profile?.location || 'Unknown',
            'profile.avatar': user.profile?.avatar || `https://via.placeholder.com/150/10B981/FFFFFF?text=${user.username.charAt(0).toUpperCase()}`
          }
        });
      }

      console.log(`✅ Updated ${usersWithoutProfile.length} users with profile fields`);
    }
  },
  {
    version: 2,
    name: 'Add user statistics',
    description: 'Add missing statistics fields to existing users',
    run: async () => {
      console.log('🔄 Running migration: Add user statistics');
      
      const usersWithoutStats = await User.find({
        $or: [
          { 'stats.totalEmissions': { $exists: false } },
          { 'stats.totalActivities': { $exists: false } },
          { 'stats.streakDays': { $exists: false } },
          { 'stats.lastActivity': { $exists: false } }
        ]
      });

      for (const user of usersWithoutStats) {
        // Calculate actual stats from activities
        const userActivities = await Activity.find({ user: user._id });
        const totalEmissions = userActivities.reduce((sum, activity) => sum + (activity.emissions || 0), 0);
        const lastActivity = userActivities.length > 0 ? userActivities[userActivities.length - 1].date : null;

        await User.findByIdAndUpdate(user._id, {
          $set: {
            'stats.totalEmissions': totalEmissions,
            'stats.totalActivities': userActivities.length,
            'stats.streakDays': 0, // Will be calculated by streak logic
            'stats.lastActivity': lastActivity
          }
        });
      }

      console.log(`✅ Updated ${usersWithoutStats.length} users with statistics`);
    }
  },
  {
    version: 3,
    name: 'Add activity tags',
    description: 'Add tags field to activities that don\'t have it',
    run: async () => {
      console.log('🔄 Running migration: Add activity tags');
      
      const activitiesWithoutTags = await Activity.find({
        tags: { $exists: false }
      });

      for (const activity of activitiesWithoutTags) {
        // Generate default tags based on category and subcategory
        const defaultTags = [activity.category, activity.subcategory];
        if (activity.description) {
          defaultTags.push('manual');
        }

        await Activity.findByIdAndUpdate(activity._id, {
          $set: { tags: defaultTags }
        });
      }

      console.log(`✅ Updated ${activitiesWithoutTags.length} activities with tags`);
    }
  },
  {
    version: 4,
    name: 'Add challenge participants',
    description: 'Initialize empty participants array for challenges',
    run: async () => {
      console.log('🔄 Running migration: Add challenge participants');
      
      const challengesWithoutParticipants = await Challenge.find({
        participants: { $exists: false }
      });

      for (const challenge of challengesWithoutParticipants) {
        await Challenge.findByIdAndUpdate(challenge._id, {
          $set: { participants: [] }
        });
      }

      console.log(`✅ Updated ${challengesWithoutParticipants.length} challenges with participants`);
    }
  },
  {
    version: 5,
    name: 'Add emission factor metadata',
    description: 'Add source and lastUpdated fields to emission factors',
    run: async () => {
      console.log('🔄 Running migration: Add emission factor metadata');
      
      const factorsWithoutMetadata = await EmissionFactor.find({
        $or: [
          { source: { $exists: false } },
          { lastUpdated: { $exists: false } }
        ]
      });

      for (const factor of factorsWithoutMetadata) {
        await EmissionFactor.findByIdAndUpdate(factor._id, {
          $set: {
            source: factor.source || 'Unknown',
            lastUpdated: factor.lastUpdated || new Date()
          }
        });
      }

      console.log(`✅ Updated ${factorsWithoutMetadata.length} emission factors with metadata`);
    }
  }
];

// Migration tracking schema
const migrationSchema = new mongoose.Schema({
  version: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  description: String,
  appliedAt: { type: Date, default: Date.now },
  executionTime: Number
});

const Migration = mongoose.model('Migration', migrationSchema);

async function runMigrations() {
  try {
    console.log('🚀 Starting database migrations...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Get applied migrations
    const appliedMigrations = await Migration.find().sort({ version: 1 });
    const appliedVersions = appliedMigrations.map(m => m.version);

    // Find pending migrations
    const pendingMigrations = migrations.filter(m => !appliedVersions.includes(m.version));

    if (pendingMigrations.length === 0) {
      console.log('✅ No pending migrations found');
      return;
    }

    console.log(`📋 Found ${pendingMigrations.length} pending migrations:`);
    pendingMigrations.forEach(m => {
      console.log(`   v${m.version}: ${m.name}`);
    });

    // Run pending migrations
    for (const migration of pendingMigrations) {
      console.log(`\n🔄 Running migration v${migration.version}: ${migration.name}`);
      const startTime = Date.now();
      
      try {
        await migration.run();
        const executionTime = Date.now() - startTime;
        
        // Record successful migration
        await Migration.create({
          version: migration.version,
          name: migration.name,
          description: migration.description,
          executionTime
        });
        
        console.log(`✅ Migration v${migration.version} completed successfully (${executionTime}ms)`);
      } catch (error) {
        console.error(`❌ Migration v${migration.version} failed:`, error);
        throw error;
      }
    }

    console.log('\n🎉 All migrations completed successfully!');

  } catch (error) {
    console.error('❌ Error running migrations:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  }
}

// Migration status check
async function checkMigrationStatus() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    const appliedMigrations = await Migration.find().sort({ version: 1 });
    const totalMigrations = migrations.length;
    const pendingCount = totalMigrations - appliedMigrations.length;

    console.log('📊 Migration Status:');
    console.log(`   Total migrations: ${totalMigrations}`);
    console.log(`   Applied: ${appliedMigrations.length}`);
    console.log(`   Pending: ${pendingCount}`);

    if (appliedMigrations.length > 0) {
      console.log('\n✅ Applied migrations:');
      appliedMigrations.forEach(m => {
        console.log(`   v${m.version}: ${m.name} (${m.appliedAt.toLocaleDateString()})`);
      });
    }

    if (pendingCount > 0) {
      console.log('\n⏳ Pending migrations:');
      migrations
        .filter(m => !appliedMigrations.find(am => am.version === m.version))
        .forEach(m => {
          console.log(`   v${m.version}: ${m.name}`);
        });
    }

  } catch (error) {
    console.error('❌ Error checking migration status:', error);
  } finally {
    await mongoose.connection.close();
  }
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'status':
      checkMigrationStatus();
      break;
    case 'run':
      runMigrations();
      break;
    default:
      console.log('Usage: node migrate.js [status|run]');
      console.log('  status - Check migration status');
      console.log('  run    - Run pending migrations');
  }
}

module.exports = { runMigrations, checkMigrationStatus };
