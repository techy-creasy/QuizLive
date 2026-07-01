const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const Submission = require('../models/Submission');

router.use(protect);

// Get user stats
router.get('/me/stats', async (req, res, next) => {
  try {
    const submissions = await Submission.find({ user: req.user._id })
      .populate('quiz', 'title')
      .sort({ createdAt: -1 })
      .limit(10);

    const totalGames = submissions.length;
    const totalScore = submissions.reduce((sum, s) => sum + s.totalScore, 0);
    const avgScore = totalGames > 0 ? Math.round(totalScore / totalGames) : 0;

    res.json({
      totalGames,
      totalScore,
      avgScore,
      recentGames: submissions,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
