const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  socketId: String,
  name: String,
  avatar: String,
  isConnected: {
    type: Boolean,
    default: true,
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: false });

const leaderboardEntrySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  name: String,
  avatar: String,
  score: {
    type: Number,
    default: 0,
  },
  totalResponseTime: {
    type: Number,
    default: 0,
  },
  correctAnswers: {
    type: Number,
    default: 0,
  },
  rank: Number,
}, { _id: false });

const chatMessageSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  name: String,
  message: String,
  timestamp: {
    type: Date,
    default: Date.now,
  },
}, { _id: true });

const roomSchema = new mongoose.Schema({
  roomCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true,
  },
  participants: [participantSchema],
  status: {
    type: String,
    enum: ['waiting', 'active', 'paused', 'ended'],
    default: 'waiting',
  },
  currentQuestionIndex: {
    type: Number,
    default: -1,
  },
  questionOrder: [Number], // shuffled or original order of question indices
  leaderboard: [leaderboardEntrySchema],
  chatMessages: [chatMessageSchema],
  settings: {
    showLeaderboardAfterEach: {
      type: Boolean,
      default: true,
    },
    allowLateJoin: {
      type: Boolean,
      default: true,
    },
  },
  startedAt: Date,
  endedAt: Date,
}, {
  timestamps: true,
});

// Index for room code lookups
roomSchema.index({ roomCode: 1 });
roomSchema.index({ host: 1, status: 1 });

module.exports = mongoose.model('Room', roomSchema);
