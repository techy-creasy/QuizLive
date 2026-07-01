const jwt = require('jsonwebtoken');

/**
 * Generate a signed JWT token for a user
 */
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

/**
 * Verify and decode a JWT token
 */
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
};

/**
 * Generate a random 6-character room code
 */
const generateRoomCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude ambiguous chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

/**
 * Calculate score based on response time and max timer
 * Faster answers get more points
 */
const calculateScore = (basePoints, responseTime, maxTime) => {
  if (responseTime <= 0) return 0;
  const timeBonus = Math.max(0, 1 - (responseTime / (maxTime * 1000)));
  return Math.round(basePoints * (0.5 + 0.5 * timeBonus));
};

/**
 * Sort leaderboard: highest score first, then lowest response time
 */
const sortLeaderboard = (entries) => {
  return [...entries].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.totalResponseTime - b.totalResponseTime;
  }).map((entry, index) => ({ ...entry, rank: index + 1 }));
};

module.exports = { generateToken, verifyToken, generateRoomCode, calculateScore, sortLeaderboard };
