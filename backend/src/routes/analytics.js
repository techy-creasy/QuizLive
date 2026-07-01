const express = require('express');
const router = express.Router();
const { getQuizAnalytics, getDashboardAnalytics } = require('../controllers/analyticsController');
const { protect, hostOnly } = require('../middleware/auth');

router.use(protect, hostOnly);

router.get('/dashboard', getDashboardAnalytics);
router.get('/:quizId', getQuizAnalytics);

module.exports = router;
