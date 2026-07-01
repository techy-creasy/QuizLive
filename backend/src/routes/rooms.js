const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { createRoom, joinRoom, getRoom, getRoomByCode, getRoomResults } = require('../controllers/roomController');
const { protect, hostOnly } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

router.use(protect);

router.post('/', hostOnly, [
  body('quizId').notEmpty().withMessage('Quiz ID required'),
  validate,
], createRoom);

router.post('/join', [
  body('roomCode').notEmpty().trim().withMessage('Room code required'),
  validate,
], joinRoom);

router.get('/code/:code', getRoomByCode);
router.get('/:id', getRoom);
router.get('/:id/results', getRoomResults);

module.exports = router;
