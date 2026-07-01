const { Server } = require('socket.io');
const { verifyToken } = require('../utils/helpers');
const User = require('../models/User');
const Room = require('../models/Room');
const Quiz = require('../models/Quiz');
const Submission = require('../models/Submission');
const { calculateScore, sortLeaderboard } = require('../utils/helpers');

// In-memory store for active timers and question state
const activeTimers = new Map(); // roomCode -> timer interval
const questionStartTimes = new Map(); // "roomCode-questionIndex" -> timestamp when question started
const pausedTimerState = new Map(); // roomCode -> { timeLeft, questionIndex, question, actualQuestionIndex, quiz }

let io;

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Auth middleware for socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(new Error('Authentication error: No token'));

      const decoded = verifyToken(token);
      const user = await User.findById(decoded.id);
      if (!user) return next(new Error('Authentication error: User not found'));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 User connected: ${socket.user.name} (${socket.id})`);

    // ─────────────────────────────────────────
    // HOST EVENTS
    // ─────────────────────────────────────────

    /**
     * Host creates and opens a room
     */
    socket.on('create-room', async ({ roomCode }) => {
      try {
        const room = await Room.findOne({ roomCode })
          .populate('quiz')
          .populate('host', 'name avatar');

        if (!room) return socket.emit('error', { message: 'Room not found' });
        if (room.host._id.toString() !== socket.user._id.toString()) {
          return socket.emit('error', { message: 'Not authorized as host' });
        }

        socket.join(roomCode);
        socket.roomCode = roomCode;
        socket.isHost = true;

        // Update host socket ID in room
        await Room.findOneAndUpdate({ roomCode }, { $set: { status: 'waiting' } });

        socket.emit('room-created', { room });
        console.log(`🏠 Host ${socket.user.name} opened room ${roomCode}`);
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    /**
     * Host starts the quiz
     */
    socket.on('start-quiz', async ({ roomCode }) => {
      try {
        const room = await Room.findOne({ roomCode })
          .populate('quiz');

        if (!room) return socket.emit('error', { message: 'Room not found' });
        if (room.host.toString() !== socket.user._id.toString()) {
          return socket.emit('error', { message: 'Not authorized' });
        }

        await Room.findOneAndUpdate(
          { roomCode },
          { status: 'active', currentQuestionIndex: -1, startedAt: new Date() }
        );

        io.to(roomCode).emit('quiz-started', {
          message: 'The quiz is starting!',
          totalQuestions: room.quiz.questions.length,
        });

        console.log(`🎯 Quiz started in room ${roomCode}`);
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    /**
     * Host advances to the next question
     */
    socket.on('next-question', async ({ roomCode }) => {
      try {
        const room = await Room.findOne({ roomCode }).populate('quiz');
        if (!room) return socket.emit('error', { message: 'Room not found' });
        if (room.host.toString() !== socket.user._id.toString()) {
          return socket.emit('error', { message: 'Not authorized' });
        }

        // Clear any existing timer
        clearRoomTimer(roomCode);

        const nextIndex = room.currentQuestionIndex + 1;
        const questionOrder = room.questionOrder;
        const quiz = room.quiz;

        if (nextIndex >= quiz.questions.length) {
          // Quiz is over - trigger end
          return handleQuizEnd(roomCode, room, socket);
        }

        // Get the actual question (respecting shuffle order)
        const actualQuestionIndex = questionOrder[nextIndex] ?? nextIndex;
        const question = quiz.questions[actualQuestionIndex];

        await Room.findOneAndUpdate(
          { roomCode },
          { currentQuestionIndex: nextIndex }
        );

        // Record question start time for response time calculation
        const startTime = Date.now();
        questionStartTimes.set(`${roomCode}-${nextIndex}`, startTime);

        // Send question to all clients (without correct answer)
        const questionData = {
          questionIndex: nextIndex,
          totalQuestions: quiz.questions.length,
          question: question.question,
          type: question.type,
          options: question.options.map((opt, i) => ({ id: i, text: opt.text })),
          timer: question.timer,
          points: question.points,
        };

        io.to(roomCode).emit('new-question', questionData);

        // Start server-controlled countdown timer
        startQuestionTimer(roomCode, nextIndex, question, actualQuestionIndex, room);

        console.log(`❓ Question ${nextIndex + 1}/${quiz.questions.length} sent to room ${roomCode}`);
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    /**
     * Host pauses the quiz
     */
    socket.on('pause-quiz', async ({ roomCode }) => {
      try {
        // Snapshot is already kept up to date by startQuestionTimer's interval tick;
        // clearing the interval here just stops it from ticking further, the
        // pausedTimerState map retains the last-known timeLeft for resume.
        clearRoomTimer(roomCode, true);
        await Room.findOneAndUpdate({ roomCode }, { status: 'paused' });
        io.to(roomCode).emit('quiz-paused', { message: 'Quiz paused by host' });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    /**
     * Host resumes the quiz
     */
    socket.on('resume-quiz', async ({ roomCode }) => {
      try {
        await Room.findOneAndUpdate({ roomCode }, { status: 'active' });
        io.to(roomCode).emit('quiz-resumed', { message: 'Quiz resumed' });

        // Restart the countdown from where it left off, if a question was in progress
        const snapshot = pausedTimerState.get(roomCode);
        if (snapshot && snapshot.timeLeft > 0 && !activeTimers.has(roomCode)) {
          const room = await Room.findOne({ roomCode }).populate('quiz');
          if (room) {
            startQuestionTimer(
              roomCode,
              snapshot.questionIndex,
              snapshot.question,
              snapshot.actualQuestionIndex,
              room,
              snapshot.timeLeft
            );
          }
        }
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    /**
     * Host kicks a participant
     */
    socket.on('kick-participant', async ({ roomCode, userId }) => {
      try {
        const room = await Room.findOne({ roomCode });
        if (!room || room.host.toString() !== socket.user._id.toString()) return;

        // Find kicked user's socket and disconnect from room
        const participantSocket = findSocketByUserId(userId, roomCode);
        if (participantSocket) {
          participantSocket.emit('kicked', { message: 'You have been removed from the quiz by the host.' });
          participantSocket.leave(roomCode);
        }

        await Room.findOneAndUpdate(
          { roomCode },
          { $pull: { participants: { user: userId } } }
        );

        io.to(roomCode).emit('participant-left', { userId, name: 'A participant' });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    /**
     * Host ends the quiz manually
     */
    socket.on('end-quiz', async ({ roomCode }) => {
      try {
        const room = await Room.findOne({ roomCode }).populate('quiz');
        if (!room) return;
        if (room.host.toString() !== socket.user._id.toString()) return;

        clearRoomTimer(roomCode);
        await handleQuizEnd(roomCode, room, socket);
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // ─────────────────────────────────────────
    // PARTICIPANT EVENTS
    // ─────────────────────────────────────────

    /**
     * Participant joins a room
     */
    socket.on('join-room', async ({ roomCode }) => {
      try {
        const room = await Room.findOne({ roomCode })
          .populate('host', 'name avatar')
          .populate('participants.user', 'name avatar')
          .populate('quiz', 'title description');

        if (!room) return socket.emit('error', { message: 'Room not found' });

        socket.join(roomCode);
        socket.roomCode = roomCode;
        socket.isHost = false;

        // Update participant's socket ID and connection status
        await Room.findOneAndUpdate(
          { roomCode, 'participants.user': socket.user._id },
          {
            $set: {
              'participants.$.socketId': socket.id,
              'participants.$.isConnected': true,
            }
          }
        );

        // Add to leaderboard if not already there
        const hasLeaderboardEntry = room.leaderboard.some(
          e => e.user?.toString() === socket.user._id.toString()
        );
        if (!hasLeaderboardEntry) {
          await Room.findOneAndUpdate(
            { roomCode },
            {
              $push: {
                leaderboard: {
                  user: socket.user._id,
                  name: socket.user.name,
                  avatar: socket.user.avatar,
                  score: 0,
                  totalResponseTime: 0,
                  correctAnswers: 0,
                }
              }
            }
          );
        }

        socket.emit('room-joined', { room, userId: socket.user._id });

        // Notify everyone about new participant
        io.to(roomCode).emit('participant-joined', {
          user: {
            _id: socket.user._id,
            name: socket.user.name,
            avatar: socket.user.avatar,
          },
          participantCount: room.participants.length + 1,
        });

        console.log(`👤 ${socket.user.name} joined room ${roomCode}`);
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    /**
     * Participant submits an answer
     */
    socket.on('submit-answer', async ({ roomCode, questionIndex, selectedOption, questionId }) => {
      try {
        const room = await Room.findOne({ roomCode }).populate('quiz');
        if (!room) return socket.emit('error', { message: 'Room not found' });

        const startTimeKey = `${roomCode}-${questionIndex}`;
        const startTime = questionStartTimes.get(startTimeKey);
        const responseTime = startTime ? Date.now() - startTime : 0;

        const actualQuestionIndex = room.questionOrder[questionIndex] ?? questionIndex;
        const question = room.quiz.questions[actualQuestionIndex];

        if (!question) return socket.emit('error', { message: 'Question not found' });

        const isCorrect = question.type !== 'poll' && selectedOption === question.correctAnswer;
        const pointsEarned = isCorrect ? calculateScore(question.points, responseTime, question.timer) : 0;

        // Update submission
        const submission = await Submission.findOneAndUpdate(
          { user: socket.user._id, room: room._id },
          {
            $push: {
              answers: {
                questionId: question._id,
                questionIndex: actualQuestionIndex,
                selectedOption,
                isCorrect,
                pointsEarned,
                responseTime,
              }
            },
            $inc: {
              totalScore: pointsEarned,
              totalResponseTime: responseTime,
              correctAnswers: isCorrect ? 1 : 0,
            }
          },
          { new: true, upsert: true }
        );

        // Update leaderboard in room
        await Room.findOneAndUpdate(
          { roomCode, 'leaderboard.user': socket.user._id },
          {
            $inc: {
              'leaderboard.$.score': pointsEarned,
              'leaderboard.$.totalResponseTime': responseTime,
              'leaderboard.$.correctAnswers': isCorrect ? 1 : 0,
            }
          }
        );

        // Confirm receipt to participant
        socket.emit('answer-received', {
          isCorrect,
          pointsEarned,
          correctAnswer: question.type !== 'poll' ? question.correctAnswer : null,
          responseTime,
        });

        // Notify host of answer received
        io.to(roomCode).emit('answer-submitted', {
          userId: socket.user._id,
          questionIndex,
        });

        console.log(`✅ ${socket.user.name} answered Q${questionIndex + 1} in room ${roomCode} (${isCorrect ? 'correct' : 'wrong'})`);
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    /**
     * Chat message in waiting room
     */
    socket.on('chat-message', async ({ roomCode, message }) => {
      try {
        if (!message || message.trim().length === 0) return;
        if (message.length > 200) return;

        const chatMessage = {
          user: socket.user._id,
          name: socket.user.name,
          message: message.trim(),
          timestamp: new Date(),
        };

        await Room.findOneAndUpdate(
          { roomCode },
          { $push: { chatMessages: chatMessage } }
        );

        io.to(roomCode).emit('chat-message', chatMessage);
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // ─────────────────────────────────────────
    // DISCONNECT
    // ─────────────────────────────────────────

    socket.on('disconnect', async () => {
      try {
        if (socket.roomCode) {
          // Mark participant as disconnected
          await Room.findOneAndUpdate(
            { roomCode: socket.roomCode, 'participants.user': socket.user._id },
            { $set: { 'participants.$.isConnected': false } }
          );

          io.to(socket.roomCode).emit('participant-left', {
            userId: socket.user._id,
            name: socket.user.name,
          });
        }
        console.log(`🔌 User disconnected: ${socket.user.name}`);
      } catch (err) {
        console.error('Disconnect handler error:', err);
      }
    });
  });

  return io;
};

// ─────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────

/**
 * Start server-controlled countdown timer for a question
 */
const startQuestionTimer = (roomCode, questionIndex, question, actualQuestionIndex, room, startingTime = null) => {
  let timeLeft = startingTime ?? question.timer;

  // Track live state so pause-quiz can snapshot the exact remaining time
  pausedTimerState.set(roomCode, { timeLeft, questionIndex, question, actualQuestionIndex, quiz: room.quiz });

  const interval = setInterval(async () => {
    timeLeft--;

    // Keep snapshot current in case of pause
    pausedTimerState.set(roomCode, { timeLeft, questionIndex, question, actualQuestionIndex, quiz: room.quiz });

    // Emit timer update every second
    io.to(roomCode).emit('timer-update', { timeLeft, questionIndex });

    if (timeLeft <= 0) {
      clearInterval(interval);
      activeTimers.delete(roomCode);
      pausedTimerState.delete(roomCode);

      // Time's up! Calculate and broadcast leaderboard
      try {
        await broadcastLeaderboard(roomCode, questionIndex, actualQuestionIndex, room.quiz);
      } catch (err) {
        console.error('Error broadcasting leaderboard:', err);
      }
    }
  }, 1000);

  activeTimers.set(roomCode, interval);
};

/**
 * Clear the active timer for a room.
 * By default also clears the paused-resume snapshot; pass keepSnapshot=true
 * when pausing so resume-quiz can pick up where it left off.
 */
const clearRoomTimer = (roomCode, keepSnapshot = false) => {
  const timer = activeTimers.get(roomCode);
  if (timer) {
    clearInterval(timer);
    activeTimers.delete(roomCode);
  }
  if (!keepSnapshot) {
    pausedTimerState.delete(roomCode);
  }
};

/**
 * Calculate and broadcast leaderboard after a question ends
 */
const broadcastLeaderboard = async (roomCode, questionIndex, actualQuestionIndex, quiz) => {
  const room = await Room.findOne({ roomCode });
  if (!room) return;

  const sorted = sortLeaderboard(
    room.leaderboard.map(e => ({
      user: e.user,
      name: e.name,
      avatar: e.avatar,
      score: e.score,
      totalResponseTime: e.totalResponseTime,
      correctAnswers: e.correctAnswers,
    }))
  );

  // Update ranks in room
  await Room.findOneAndUpdate(
    { roomCode },
    { leaderboard: sorted }
  );

  const question = quiz?.questions?.[actualQuestionIndex];

  io.to(roomCode).emit('leaderboard-updated', {
    leaderboard: sorted,
    questionIndex,
    correctAnswer: question?.correctAnswer ?? null,
    questionEnded: true,
  });
};

/**
 * Handle quiz end - finalize scores and emit results
 */
const handleQuizEnd = async (roomCode, room, socket) => {
  try {
    clearRoomTimer(roomCode);

    const updatedRoom = await Room.findOneAndUpdate(
      { roomCode },
      { status: 'ended', endedAt: new Date() },
      { new: true }
    );

    const sorted = sortLeaderboard(
      updatedRoom.leaderboard.map(e => ({
        user: e.user,
        name: e.name,
        avatar: e.avatar,
        score: e.score,
        totalResponseTime: e.totalResponseTime,
        correctAnswers: e.correctAnswers,
      }))
    );

    // Save final ranks to submissions
    await Promise.all(
      sorted.map((entry, idx) =>
        Submission.findOneAndUpdate(
          { user: entry.user, room: updatedRoom._id },
          { finalRank: idx + 1, completedAt: new Date() }
        )
      )
    );

    io.to(roomCode).emit('quiz-ended', {
      leaderboard: sorted,
      roomId: updatedRoom._id,
      message: 'Quiz complete! Great job everyone!',
    });

    console.log(`🏁 Quiz ended in room ${roomCode}`);
  } catch (err) {
    socket.emit('error', { message: err.message });
  }
};

/**
 * Find a socket in a room by user ID
 */
const findSocketByUserId = (userId, roomCode) => {
  const sockets = io.sockets.sockets;
  for (const [, s] of sockets) {
    if (s.user?._id?.toString() === userId && s.roomCode === roomCode) {
      return s;
    }
  }
  return null;
};

const getIO = () => io;

module.exports = { initializeSocket, getIO };
