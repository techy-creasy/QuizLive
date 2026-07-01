const Quiz = require('../models/Quiz');
const Room = require('../models/Room');
const Submission = require('../models/Submission');

/**
 * @route   GET /api/quizzes
 * @desc    Get all quizzes for the logged-in host
 * @access  Private (Host)
 */
const getQuizzes = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const query = { creator: req.user._id };

    if (search) {
      query.$text = { $search: search };
    }

    const quizzes = await Quiz.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('creator', 'name avatar')
      .lean();

    const total = await Quiz.countDocuments(query);

    res.json({
      quizzes,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      total,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/quizzes/:id
 * @desc    Get a single quiz
 * @access  Private
 */
const getQuiz = async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id).populate('creator', 'name avatar');
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // Only creator can see answers
    const isCreator = quiz.creator._id.toString() === req.user._id.toString();
    if (!isCreator) {
      // Hide correct answers for non-creators
      const sanitized = quiz.toObject();
      sanitized.questions = sanitized.questions.map(q => {
        const { correctAnswer, ...rest } = q;
        return rest;
      });
      return res.json({ quiz: sanitized });
    }

    res.json({ quiz });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/quizzes
 * @desc    Create a new quiz
 * @access  Private (Host)
 */
const createQuiz = async (req, res, next) => {
  try {
    const { title, description, questions, randomizeQuestions, randomizeOptions, tags } = req.body;

    const quiz = await Quiz.create({
      title,
      description,
      creator: req.user._id,
      questions: questions.map((q, index) => ({
        ...q,
        order: index,
      })),
      randomizeQuestions: randomizeQuestions || false,
      randomizeOptions: randomizeOptions || false,
      tags: tags || [],
    });

    await quiz.populate('creator', 'name avatar');

    res.status(201).json({
      message: 'Quiz created successfully',
      quiz,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/quizzes/:id
 * @desc    Update a quiz
 * @access  Private (Host - owner only)
 */
const updateQuiz = async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    if (quiz.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to edit this quiz' });
    }

    const allowedUpdates = ['title', 'description', 'questions', 'randomizeQuestions', 'randomizeOptions', 'tags', 'isPublic', 'coverImage'];
    const updates = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const updated = await Quiz.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('creator', 'name avatar');

    res.json({ message: 'Quiz updated successfully', quiz: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/quizzes/:id
 * @desc    Delete a quiz
 * @access  Private (Host - owner only)
 */
const deleteQuiz = async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    if (quiz.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to delete this quiz' });
    }

    await Quiz.findByIdAndDelete(req.params.id);

    res.json({ message: 'Quiz deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/quizzes/:id/history
 * @desc    Get quiz play history
 * @access  Private (Host - owner only)
 */
const getQuizHistory = async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    if (quiz.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const rooms = await Room.find({ quiz: req.params.id, status: 'ended' })
      .populate('participants.user', 'name avatar')
      .sort({ endedAt: -1 })
      .limit(20);

    res.json({ history: rooms });
  } catch (error) {
    next(error);
  }
};

module.exports = { getQuizzes, getQuiz, createQuiz, updateQuiz, deleteQuiz, getQuizHistory };
