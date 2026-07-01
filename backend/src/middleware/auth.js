const { verifyToken } = require('../utils/helpers');
const User = require('../models/User');

/**
 * Protect routes - verify JWT token
 */
const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ error: 'Not authorized, no token provided' });
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'User no longer exists' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Not authorized, token invalid' });
  }
};

/**
 * Restrict to host role only
 */
const hostOnly = (req, res, next) => {
  if (req.user.role !== 'host') {
    return res.status(403).json({ error: 'Access denied. Host role required.' });
  }
  next();
};

/**
 * Optional auth - attach user if token present, but don't block
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (token) {
      const decoded = verifyToken(token);
      req.user = await User.findById(decoded.id);
    }
  } catch (_) {
    // Ignore auth errors for optional routes
  }
  next();
};

module.exports = { protect, hostOnly, optionalAuth };
