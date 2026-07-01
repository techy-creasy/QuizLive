const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true,
  },
  isCorrect: {
    type: Boolean,
    default: false,
  },
}, { _id: true });

const questionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: [true, 'Question text is required'],
    trim: true,
  },
  type: {
    type: String,
    enum: ['multiple-choice', 'true-false', 'poll'],
    default: 'multiple-choice',
  },
  options: {
    type: [optionSchema],
    validate: {
      validator: function (options) {
        if (this.type === 'poll') return options.length >= 2;
        return options.length >= 2 && options.length <= 6;
      },
      message: 'Questions must have between 2 and 6 options',
    },
  },
  correctAnswer: {
    type: Number, // index of correct option
    default: null, // null for poll type
  },
  timer: {
    type: Number,
    default: 30,
    min: [5, 'Timer must be at least 5 seconds'],
    max: [120, 'Timer cannot exceed 120 seconds'],
  },
  points: {
    type: Number,
    default: 100,
    min: [0, 'Points cannot be negative'],
    max: [1000, 'Points cannot exceed 1000'],
  },
  order: {
    type: Number,
    default: 0,
  },
}, { _id: true });

const quizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Quiz title is required'],
    trim: true,
    minlength: [3, 'Title must be at least 3 characters'],
    maxlength: [100, 'Title must not exceed 100 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description must not exceed 500 characters'],
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  questions: {
    type: [questionSchema],
    validate: {
      validator: function (questions) {
        return questions.length >= 1;
      },
      message: 'Quiz must have at least 1 question',
    },
  },
  coverImage: {
    type: String,
    default: null,
  },
  isPublic: {
    type: Boolean,
    default: false,
  },
  randomizeQuestions: {
    type: Boolean,
    default: false,
  },
  randomizeOptions: {
    type: Boolean,
    default: false,
  },
  tags: [String],
  playCount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual for question count
quizSchema.virtual('questionCount').get(function () {
  return this.questions ? this.questions.length : 0;
});

// Index for search
quizSchema.index({ creator: 1, createdAt: -1 });
quizSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Quiz', quizSchema);
