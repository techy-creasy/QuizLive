const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  questionIndex: Number,
  selectedOption: Number, // index of selected option, null if no answer
  isCorrect: {
    type: Boolean,
    default: false,
  },
  pointsEarned: {
    type: Number,
    default: 0,
  },
  responseTime: {
    type: Number, // milliseconds
    default: 0,
  },
}, { _id: false });

const submissionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true,
  },
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true,
  },
  answers: [answerSchema],
  totalScore: {
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
  finalRank: Number,
  completedAt: Date,
}, {
  timestamps: true,
});

// Compound index - one submission per user per room
submissionSchema.index({ user: 1, room: 1 }, { unique: true });
submissionSchema.index({ room: 1, totalScore: -1 });

module.exports = mongoose.model('Submission', submissionSchema);
