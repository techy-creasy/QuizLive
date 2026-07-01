const Room = require('../models/Room');
const Quiz = require('../models/Quiz');
const Submission = require('../models/Submission');
const { generateRoomCode } = require('../utils/helpers');

/**
 * @route   POST /api/rooms
 * @desc    Create a new room (host starts a session)
 * @access  Private (Host)
 */
const createRoom = async (req, res, next) => {
  try {
    const { quizId, settings } = req.body;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    if (quiz.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to host this quiz' });
    }

    // Generate unique room code
    let roomCode;
    let attempts = 0;
    do {
      roomCode = generateRoomCode();
      attempts++;
      if (attempts > 10) throw new Error('Failed to generate unique room code');
    } while (await Room.findOne({ roomCode, status: { $ne: 'ended' } }));

    // Generate question order (shuffle if needed)
    const questionOrder = quiz.questions.map((_, i) => i);
    if (quiz.randomizeQuestions) {
      for (let i = questionOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questionOrder[i], questionOrder[j]] = [questionOrder[j], questionOrder[i]];
      }
    }

    const room = await Room.create({
      roomCode,
      host: req.user._id,
      quiz: quizId,
      questionOrder,
      settings: settings || {},
    });

    await room.populate([
      { path: 'quiz', populate: { path: 'creator', select: 'name avatar' } },
      { path: 'host', select: 'name avatar' },
    ]);

    // Increment quiz play count
    await Quiz.findByIdAndUpdate(quizId, { $inc: { playCount: 1 } });

    res.status(201).json({ message: 'Room created', room });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/rooms/join
 * @desc    Join a room using room code
 * @access  Private
 */
const joinRoom = async (req, res, next) => {
  try {
    const { roomCode } = req.body;

    const room = await Room.findOne({ roomCode: roomCode.toUpperCase() })
      .populate('quiz', 'title description questions')
      .populate('host', 'name avatar');

    if (!room) {
      return res.status(404).json({ error: 'Room not found. Check the code and try again.' });
    }

    if (room.status === 'ended') {
      return res.status(400).json({ error: 'This quiz session has already ended.' });
    }

    if (room.status === 'active' && !room.settings.allowLateJoin) {
      return res.status(400).json({ error: 'This quiz is already in progress and does not allow late joins.' });
    }

    // Check if already a participant
    const isParticipant = room.participants.some(
      p => p.user.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
      room.participants.push({
        user: req.user._id,
        name: req.user.name,
        avatar: req.user.avatar,
        isConnected: true,
      });
      await room.save();

      // Create submission record
      await Submission.findOneAndUpdate(
        { user: req.user._id, room: room._id },
        {
          user: req.user._id,
          room: room._id,
          quiz: room.quiz._id,
        },
        { upsert: true, new: true }
      );
    }

    res.json({ message: 'Joined room successfully', room });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/rooms/:id
 * @desc    Get room details
 * @access  Private
 */
const getRoom = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate('quiz')
      .populate('host', 'name avatar')
      .populate('participants.user', 'name avatar');

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json({ room });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/rooms/code/:code
 * @desc    Get room by room code
 * @access  Private
 */
const getRoomByCode = async (req, res, next) => {
  try {
    const room = await Room.findOne({ roomCode: req.params.code.toUpperCase() })
      .populate('quiz', 'title description questions')
      .populate('host', 'name avatar');

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json({ room });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/rooms/:id/results
 * @desc    Get room results and submissions
 * @access  Private
 */
const getRoomResults = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate('quiz', 'title questions')
      .populate('host', 'name');

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const submissions = await Submission.find({ room: req.params.id })
      .populate('user', 'name avatar')
      .sort({ totalScore: -1, totalResponseTime: 1 });

    res.json({ room, submissions });
  } catch (error) {
    next(error);
  }
};

module.exports = { createRoom, joinRoom, getRoom, getRoomByCode, getRoomResults };
