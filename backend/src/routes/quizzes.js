const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { getQuizzes, getQuiz, createQuiz, updateQuiz, deleteQuiz, getQuizHistory } = require('../controllers/quizController');
const { protect, hostOnly } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const questionValidation = [
  body('questions').isArray({ min: 1 }).withMessage('At least one question required'),
  body('questions.*.question').notEmpty().withMessage('Question text required'),
  body('questions.*.options').isArray({ min: 2 }).withMessage('At least 2 options required'),
  body('questions.*.options.*.text').notEmpty().withMessage('Option text required'),
  body('questions.*.timer').optional().isInt({ min: 5, max: 120 }),
  body('questions.*.points').optional().isInt({ min: 0, max: 1000 }),
];

router.use(protect);

router.get('/', getQuizzes);
router.get('/:id', getQuiz);
router.get('/:id/history', hostOnly, getQuizHistory);

router.post('/', hostOnly, [
  body('title').trim().isLength({ min: 3, max: 100 }).withMessage('Title must be 3-100 characters'),
  body('description').optional().trim().isLength({ max: 500 }),
  ...questionValidation,
  validate,
], createQuiz);

router.put('/:id', hostOnly, [
  body('title').optional().trim().isLength({ min: 3, max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
  validate,
], updateQuiz);

router.delete('/:id', hostOnly, deleteQuiz);

module.exports = router;
