const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  // Get token from header
  const token = req.header('Authorization')?.replace('Bearer ', '') || req.header('x-auth-token');

  // Check if no token
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Middleware to check if user is admin
module.exports.isAdmin = function(req, res, next) {
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({ message: 'Access denied. Admin role required.' });
  }
  next();
};

// Middleware to check if user is super admin
module.exports.isSuperAdmin = function(req, res, next) {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ message: 'Access denied. Super admin role required.' });
  }
  next();
};

// Middleware to check if user can access resource
module.exports.canAccessResource = function(resourceUserId) {
  return function(req, res, next) {
    if (req.user.role === 'super_admin' || req.user.role === 'admin') {
      return next();
    }
    
    if (req.user.id === resourceUserId) {
      return next();
    }
    
    res.status(403).json({ message: 'Access denied' });
  };
}; 