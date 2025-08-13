const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Activity = require('../models/Activity');
const Challenge = require('../models/Challenge');
const EmissionFactor = require('../models/EmissionFactor');

// Sample data
const sampleUsers = [
  {
    username: 'admin',
    email: 'admin@carbontracker.com',
    password: 'Admin123!',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    profile: {
      bio: 'System Administrator',
      location: 'Global',
      avatar: 'https://via.placeholder.com/150/10B981/FFFFFF?text=A'
    }
  },
  {
    username: 'demo_user',
    email: 'demo@carbontracker.com',
    password: 'Demo123!',
    firstName: 'Demo',
    lastName: 'User',
    role: 'user',
    profile: {
      bio: 'Demo user for testing',
      location: 'San Francisco, CA',
      avatar: 'https://via.placeholder.com/150/3B82F6/FFFFFF?text=D'
    }
  },
  {
    username: 'eco_warrior',
    email: 'eco@carbontracker.com',
    password: 'Eco123!',
    firstName: 'Eco',
    lastName: 'Warrior',
    role: 'user',
    profile: {
      bio: 'Passionate about reducing carbon footprint',
      location: 'Portland, OR',
      avatar: 'https://via.placeholder.com/150/10B981/FFFFFF?text=E'
    }
  }
];

const sampleEmissionFactors = [
  {
    category: 'transportation',
    subcategory: 'car',
    fuelType: 'gasoline',
    factor: 2.31, // kg CO2 per liter
    unit: 'kg CO2e/liter',
    source: 'EPA',
    lastUpdated: new Date()
  },
  {
    category: 'transportation',
    subcategory: 'car',
    fuelType: 'diesel',
    factor: 2.68, // kg CO2 per liter
    unit: 'kg CO2e/liter',
    source: 'EPA',
    lastUpdated: new Date()
  },
  {
    category: 'transportation',
    subcategory: 'public_transit',
    type: 'bus',
    factor: 0.14, // kg CO2 per km
    unit: 'kg CO2e/km',
    source: 'EPA',
    lastUpdated: new Date()
  },
  {
    category: 'transportation',
    subcategory: 'public_transit',
    type: 'train',
    factor: 0.04, // kg CO2 per km
    unit: 'kg CO2e/km',
    source: 'EPA',
    lastUpdated: new Date()
  },
  {
    category: 'energy',
    subcategory: 'electricity',
    region: 'US',
    factor: 0.92, // kg CO2 per kWh
    unit: 'kg CO2e/kWh',
    source: 'EPA',
    lastUpdated: new Date()
  },
  {
    category: 'energy',
    subcategory: 'natural_gas',
    factor: 2.02, // kg CO2 per cubic meter
    unit: 'kg CO2e/m³',
    source: 'EPA',
    lastUpdated: new Date()
  },
  {
    category: 'waste',
    subcategory: 'landfill',
    factor: 0.5, // kg CO2 per kg waste
    unit: 'kg CO2e/kg',
    source: 'EPA',
    lastUpdated: new Date()
  },
  {
    category: 'food',
    subcategory: 'meat',
    type: 'beef',
    factor: 13.3, // kg CO2 per kg
    unit: 'kg CO2e/kg',
    source: 'FAO',
    lastUpdated: new Date()
  },
  {
    category: 'food',
    subcategory: 'meat',
    type: 'chicken',
    factor: 2.9, // kg CO2 per kg
    unit: 'kg CO2e/kg',
    source: 'FAO',
    lastUpdated: new Date()
  }
];

const sampleChallenges = [
  {
    title: '30-Day Car-Free Challenge',
    description: 'Go car-free for 30 days and explore alternative transportation methods.',
    type: 'transportation',
    duration: 30,
    target: 'car_free_days',
    targetValue: 30,
    reward: {
      type: 'badge',
      name: 'Car-Free Champion',
      points: 500
    },
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    participants: [],
    isActive: true
  },
  {
    title: 'Energy Conservation Week',
    description: 'Reduce your electricity consumption by 20% for one week.',
    type: 'energy',
    duration: 7,
    target: 'energy_reduction',
    targetValue: 20,
    reward: {
      type: 'badge',
      name: 'Energy Saver',
      points: 200
    },
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    participants: [],
    isActive: true
  },
  {
    title: 'Zero Waste Month',
    description: 'Minimize your waste production and practice sustainable living.',
    type: 'waste',
    duration: 30,
    target: 'waste_reduction',
    targetValue: 80,
    reward: {
      type: 'badge',
      name: 'Zero Waste Hero',
      points: 300
    },
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    participants: [],
    isActive: true
  }
];

const sampleActivities = [
  {
    user: null, // Will be set after user creation
    category: 'transportation',
    subcategory: 'car',
    description: 'Daily commute to work',
    quantity: 25,
    unit: 'km',
    date: new Date(),
    emissions: 5.78, // Calculated based on emission factor
    location: 'San Francisco, CA',
    tags: ['commute', 'daily']
  },
  {
    user: null, // Will be set after user creation
    category: 'energy',
    subcategory: 'electricity',
    description: 'Home electricity usage',
    quantity: 15,
    unit: 'kWh',
    date: new Date(),
    emissions: 13.8, // Calculated based on emission factor
    location: 'San Francisco, CA',
    tags: ['home', 'daily']
  },
  {
    user: null, // Will be set after user creation
    category: 'food',
    subcategory: 'meat',
    description: 'Beef consumption',
    quantity: 0.5,
    unit: 'kg',
    date: new Date(),
    emissions: 6.65, // Calculated based on emission factor
    location: 'San Francisco, CA',
    tags: ['food', 'meat']
  }
];

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await User.deleteMany({});
    await Activity.deleteMany({});
    await Challenge.deleteMany({});
    await EmissionFactor.deleteMany({});
    console.log('✅ Existing data cleared');

    // Create emission factors
    console.log('📊 Creating emission factors...');
    const emissionFactors = await EmissionFactor.insertMany(sampleEmissionFactors);
    console.log(`✅ Created ${emissionFactors.length} emission factors`);

    // Create users
    console.log('👥 Creating users...');
    const users = [];
    for (const userData of sampleUsers) {
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      const user = new User({
        ...userData,
        password: hashedPassword,
        stats: {
          totalEmissions: 0,
          totalActivities: 0,
          streakDays: 0,
          lastActivity: null
        }
      });
      users.push(await user.save());
    }
    console.log(`✅ Created ${users.length} users`);

    // Create challenges
    console.log('🏆 Creating challenges...');
    const challenges = await Challenge.insertMany(sampleChallenges);
    console.log(`✅ Created ${challenges.length} challenges`);

    // Create activities with user references
    console.log('📝 Creating activities...');
    const activities = [];
    for (let i = 0; i < sampleActivities.length; i++) {
      const activityData = {
        ...sampleActivities[i],
        user: users[i % users.length]._id
      };
      const activity = new Activity(activityData);
      activities.push(await activity.save());
    }
    console.log(`✅ Created ${activities.length} activities`);

    // Update user stats
    console.log('📊 Updating user statistics...');
    for (const user of users) {
      const userActivities = activities.filter(a => a.user.toString() === user._id.toString());
      const totalEmissions = userActivities.reduce((sum, a) => sum + a.emissions, 0);
      
      await User.findByIdAndUpdate(user._id, {
        'stats.totalEmissions': totalEmissions,
        'stats.totalActivities': userActivities.length,
        'stats.lastActivity': userActivities.length > 0 ? userActivities[userActivities.length - 1].date : null
      });
    }
    console.log('✅ User statistics updated');

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   👥 Users: ${users.length}`);
    console.log(`   📊 Emission Factors: ${emissionFactors.length}`);
    console.log(`   🏆 Challenges: ${challenges.length}`);
    console.log(`   📝 Activities: ${activities.length}`);
    
    console.log('\n🔑 Default Login Credentials:');
    console.log('   Admin: admin@carbontracker.com / Admin123!');
    console.log('   Demo: demo@carbontracker.com / Demo123!');
    console.log('   Eco: eco@carbontracker.com / Eco123!');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
