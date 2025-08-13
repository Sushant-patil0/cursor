const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
  log(`\n${'='.repeat(60)}`, 'bright');
  log(`  ${message}`, 'bright');
  log(`${'='.repeat(60)}`, 'bright');
}

function logSection(message) {
  log(`\n${'-'.repeat(40)}`, 'cyan');
  log(`  ${message}`, 'cyan');
  log(`${'-'.repeat(40)}`, 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Test functions
function testFileStructure() {
  logSection('Testing File Structure');
  
  const requiredFiles = [
    'package.json',
    'server.js',
    'env.example',
    'README.md',
    'client/package.json',
    'client/src/App.js',
    'client/src/index.js',
    'client/src/index.css',
    'client/tailwind.config.js',
    'client/src/postcss.config.js',
    'middleware/auth.js',
    'models/User.js',
    'models/Activity.js',
    'models/Challenge.js',
    'models/EmissionFactor.js',
    'routes/auth.js',
    'routes/activities.js',
    'routes/users.js',
    'routes/carbon.js',
    'routes/admin.js',
    'routes/challenges.js',
    'scripts/seed.js',
    'scripts/migrate.js'
  ];

  const requiredDirs = [
    'client/src/components',
    'client/src/contexts',
    'client/src/pages',
    'client/src/utils',
    'client/src/services',
    'client/public'
  ];

  let fileErrors = 0;
  let dirErrors = 0;

  // Check required files
  for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
      logSuccess(`File exists: ${file}`);
    } else {
      logError(`Missing file: ${file}`);
      fileErrors++;
    }
  }

  // Check required directories
  for (const dir of requiredDirs) {
    if (fs.existsSync(dir)) {
      logSuccess(`Directory exists: ${dir}`);
    } else {
      logError(`Missing directory: ${dir}`);
      dirErrors++;
    }
  }

  return { fileErrors, dirErrors };
}

function testPackageFiles() {
  logSection('Testing Package Files');
  
  let errors = 0;

  try {
    // Test root package.json
    const rootPackage = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    if (rootPackage.name && rootPackage.version) {
      logSuccess('Root package.json is valid');
    } else {
      logError('Root package.json missing name or version');
      errors++;
    }

    if (rootPackage.scripts && rootPackage.scripts.start) {
      logSuccess('Root package.json has start script');
    } else {
      logError('Root package.json missing start script');
      errors++;
    }

    if (rootPackage.dependencies && Object.keys(rootPackage.dependencies).length > 0) {
      logSuccess('Root package.json has dependencies');
    } else {
      logError('Root package.json missing dependencies');
      errors++;
    }

  } catch (error) {
    logError(`Error reading root package.json: ${error.message}`);
    errors++;
  }

  try {
    // Test client package.json
    const clientPackage = JSON.parse(fs.readFileSync('client/package.json', 'utf8'));
    
    if (clientPackage.name && clientPackage.version) {
      logSuccess('Client package.json is valid');
    } else {
      logError('Client package.json missing name or version');
      errors++;
    }

    if (clientPackage.dependencies && clientPackage.dependencies.react) {
      logSuccess('Client package.json has React dependency');
    } else {
      logError('Client package.json missing React dependency');
      errors++;
    }

    if (clientPackage.dependencies && clientPackage.dependencies['@tanstack/react-query']) {
      logSuccess('Client package.json has @tanstack/react-query');
    } else {
      logError('Client package.json missing @tanstack/react-query');
      errors++;
    }

  } catch (error) {
    logError(`Error reading client package.json: ${error.message}`);
    errors++;
  }

  return errors;
}

function testEnvironmentSetup() {
  logSection('Testing Environment Setup');
  
  let errors = 0;

  // Check if .env exists
  if (fs.existsSync('.env')) {
    logSuccess('.env file exists');
  } else {
    logWarning('.env file does not exist (you need to create it from env.example)');
    errors++;
  }

  // Check env.example
  if (fs.existsSync('env.example')) {
    logSuccess('env.example file exists');
    
    const envExample = fs.readFileSync('env.example', 'utf8');
    const requiredVars = [
      'MONGODB_URI',
      'JWT_SECRET',
      'NODE_ENV',
      'PORT',
      'FRONTEND_URL'
    ];

    for (const varName of requiredVars) {
      if (envExample.includes(varName)) {
        logSuccess(`env.example contains ${varName}`);
      } else {
        logError(`env.example missing ${varName}`);
        errors++;
      }
    }
  } else {
    logError('env.example file missing');
    errors++;
  }

  return errors;
}

function testDependencies() {
  logSection('Testing Dependencies');
  
  let errors = 0;

  try {
    // Check if node_modules exists in root
    if (fs.existsSync('node_modules')) {
      logSuccess('Root node_modules exists');
    } else {
      logWarning('Root node_modules does not exist (run npm install)');
      errors++;
    }

    // Check if node_modules exists in client
    if (fs.existsSync('client/node_modules')) {
      logSuccess('Client node_modules exists');
    } else {
      logWarning('Client node_modules does not exist (run npm install in client directory)');
      errors++;
    }

  } catch (error) {
    logError(`Error checking dependencies: ${error.message}`);
    errors++;
  }

  return errors;
}

function testCodeQuality() {
  logSection('Testing Code Quality');
  
  let errors = 0;

  try {
    // Test server.js syntax
    const serverCode = fs.readFileSync('server.js', 'utf8');
    
    if (serverCode.includes('require(') && serverCode.includes('app.listen')) {
      logSuccess('server.js has basic Express setup');
    } else {
      logError('server.js missing basic Express setup');
      errors++;
    }

    if (serverCode.includes('mongoose.connect')) {
      logSuccess('server.js has MongoDB connection');
    } else {
      logError('server.js missing MongoDB connection');
      errors++;
    }

    if (serverCode.includes('helmet')) {
      logSuccess('server.js has security middleware');
    } else {
      logError('server.js missing security middleware');
      errors++;
    }

  } catch (error) {
    logError(`Error reading server.js: ${error.message}`);
    errors++;
  }

  try {
    // Test App.js syntax
    const appCode = fs.readFileSync('client/src/App.js', 'utf8');
    
    if (appCode.includes('import React') && appCode.includes('Router')) {
      logSuccess('App.js has React Router setup');
    } else {
      logError('App.js missing React Router setup');
      errors++;
    }

    if (appCode.includes('@tanstack/react-query')) {
      logSuccess('App.js uses @tanstack/react-query');
    } else {
      logError('App.js not using @tanstack/react-query');
      errors++;
    }

  } catch (error) {
    logError(`Error reading App.js: ${error.message}`);
    errors++;
  }

  return errors;
}

function testDatabaseModels() {
  logSection('Testing Database Models');
  
  let errors = 0;

  const models = ['User.js', 'Activity.js', 'Challenge.js', 'EmissionFactor.js'];
  
  for (const model of models) {
    try {
      const modelPath = `models/${model}`;
      if (fs.existsSync(modelPath)) {
        const modelCode = fs.readFileSync(modelPath, 'utf8');
        
        if (modelCode.includes('mongoose.Schema')) {
          logSuccess(`${model} has Mongoose schema`);
        } else {
          logError(`${model} missing Mongoose schema`);
          errors++;
        }

        if (modelCode.includes('mongoose.model')) {
          logSuccess(`${model} has model export`);
        } else {
          logError(`${model} missing model export`);
          errors++;
        }
      } else {
        logError(`Model file missing: ${model}`);
        errors++;
      }
    } catch (error) {
      logError(`Error reading ${model}: ${error.message}`);
      errors++;
    }
  }

  return errors;
}

function testRoutes() {
  logSection('Testing API Routes');
  
  let errors = 0;

  const routes = ['auth.js', 'activities.js', 'users.js', 'carbon.js', 'admin.js', 'challenges.js'];
  
  for (const route of routes) {
    try {
      const routePath = `routes/${route}`;
      if (fs.existsSync(routePath)) {
        const routeCode = fs.readFileSync(routePath, 'utf8');
        
        if (routeCode.includes('express.Router()')) {
          logSuccess(`${route} has Express router setup`);
        } else {
          logError(`${route} missing Express router setup`);
          errors++;
        }

        if (routeCode.includes('module.exports')) {
          logSuccess(`${route} has proper exports`);
        } else {
          logError(`${route} missing proper exports`);
          errors++;
        }
      } else {
        logError(`Route file missing: ${route}`);
        errors++;
      }
    } catch (error) {
      logError(`Error reading ${route}: ${error.message}`);
      errors++;
    }
  }

  return errors;
}

function testFrontendPages() {
  logSection('Testing Frontend Pages');
  
  let errors = 0;

  const pages = [
    'Dashboard.js', 'Activities.js', 'AddActivity.js', 'Profile.js', 
    'Reports.js', 'Challenges.js', 'Admin.js', 'Community.js', 'Settings.js'
  ];
  
  for (const page of pages) {
    try {
      const pagePath = `client/src/pages/${page}`;
      if (fs.existsSync(pagePath)) {
        const pageCode = fs.readFileSync(pagePath, 'utf8');
        
        if (pageCode.includes('import React')) {
          logSuccess(`${page} has React import`);
        } else {
          logError(`${page} missing React import`);
          errors++;
        }

        if (pageCode.includes('export default') || pageCode.includes('export {')) {
          logSuccess(`${page} has proper exports`);
        } else {
          logError(`${page} missing proper exports`);
          errors++;
        }
      } else {
        logError(`Page file missing: ${page}`);
        errors++;
      }
    } catch (error) {
      logError(`Error reading ${page}: ${error.message}`);
      errors++;
    }
  }

  return errors;
}

function generateReport(totalErrors) {
  logHeader('SETUP TEST REPORT');
  
  if (totalErrors === 0) {
    log('\n🎉 CONGRATULATIONS! Your project setup is complete and ready to run!', 'green');
    log('\n📋 Next steps:', 'bright');
    log('   1. Create your .env file from env.example', 'cyan');
    log('   2. Run: npm install (in root directory)', 'cyan');
    log('   3. Run: cd client && npm install', 'cyan');
    log('   4. Start MongoDB service', 'cyan');
    log('   5. Run: npm run dev (in root directory)', 'cyan');
    log('   6. Run: npm start (in client directory)', 'cyan');
    log('   7. Optional: npm run seed (to populate database)', 'cyan');
  } else {
    log(`\n⚠️  Your project has ${totalErrors} issue(s) that need to be fixed.`, 'yellow');
    log('\n🔧 Please review the errors above and fix them before proceeding.', 'yellow');
  }

  log('\n📚 For detailed setup instructions, see README.md', 'blue');
}

// Main test execution
async function runTests() {
  logHeader('CARBON TRACKER SETUP VERIFICATION');
  
  let totalErrors = 0;

  totalErrors += testFileStructure();
  totalErrors += testPackageFiles();
  totalErrors += testEnvironmentSetup();
  totalErrors += testDependencies();
  totalErrors += testCodeQuality();
  totalErrors += testDatabaseModels();
  totalErrors += testRoutes();
  totalErrors += testFrontendPages();

  generateReport(totalErrors);
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests };
