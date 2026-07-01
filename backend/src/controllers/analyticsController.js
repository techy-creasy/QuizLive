const Quiz = require('../models/Quiz');
const Room = require('../models/Room');
const Submission = require('../models/Submission');

/**
 * @route   GET /api/analytics/:quizId
 * @desc    Get analytics for a quiz
 * @access  Private (Host - owner only)
 */
const getQuizAnalytics = async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.quizId);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    if (quiz.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get all completed rooms for this quiz
    const rooms = await Room.find({ quiz: req.params.quizId, status: 'ended' });
    const roomIds = rooms.map(r => r._id);

    if (roomIds.length === 0) {
      return res.json({
        totalSessions: 0,
        totalParticipants: 0,
        averageScore: 0,
        completionRate: 0,
        questionStats: [],
        participantPerformance: [],
        averageResponseTime: 0,
      });
    }

    // Get all submissions
    const submissions = await Submission.find({ room: { $in: roomIds } })
      .populate('user', 'name avatar');

    const totalParticipants = submissions.length;
    if (totalParticipants === 0) {
      return res.json({ totalSessions: rooms.length, totalParticipants: 0 });
    }

    // Average score
    const totalScore = submissions.reduce((sum, s) => sum + s.totalScore, 0);
    const maxPossibleScore = quiz.questions.reduce((sum, q) => sum + q.points, 0);
    const averageScore = totalScore / totalParticipants;
    const averageScorePercent = maxPossibleScore > 0 ? (averageScore / maxPossibleScore) * 100 : 0;

    // Average response time
    const totalResponseTime = submissions.reduce((sum, s) => sum + s.totalResponseTime, 0);
    const averageResponseTime = totalResponseTime / totalParticipants;

    // Question-level stats
    const questionStats = quiz.questions.map((question, index) => {
      const allAnswers = submissions.flatMap(s =>
        s.answers.filter(a => a.questionIndex === index)
      );

      const totalAnswers = allAnswers.length;
      const correctAnswers = allAnswers.filter(a => a.isCorrect).length;
      const accuracy = totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0;

      const avgResponseTime = totalAnswers > 0
        ? allAnswers.reduce((sum, a) => sum + a.responseTime, 0) / totalAnswers
        : 0;

      // Option distribution
      const optionDistribution = question.options.map((opt, optIdx) => ({
        option: opt.text,
        count: allAnswers.filter(a => a.selectedOption === optIdx).length,
        isCorrect: optIdx === question.correctAnswer,
      }));

      return {
        questionIndex: index,
        question: question.question,
        accuracy: Math.round(accuracy),
        totalAnswers,
        correctAnswers,
        avgResponseTime: Math.round(avgResponseTime),
        optionDistribution,
      };
    });

    // Most difficult question (lowest accuracy)
    const mostDifficult = [...questionStats].sort((a, b) => a.accuracy - b.accuracy)[0];

    // Completion rate: participants who answered all questions
    const completedCount = submissions.filter(s => s.completedAt).length;
    const completionRate = (completedCount / totalParticipants) * 100;

    // Top performers
    const participantPerformance = submissions
      .map(s => ({
        user: s.user,
        score: s.totalScore,
        correctAnswers: s.correctAnswers,
        accuracy: quiz.questions.length > 0
          ? Math.round((s.correctAnswers / quiz.questions.length) * 100)
          : 0,
        avgResponseTime: s.answers.length > 0
          ? Math.round(s.totalResponseTime / s.answers.length)
          : 0,
        rank: s.finalRank,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    res.json({
      totalSessions: rooms.length,
      totalParticipants,
      averageScore: Math.round(averageScore),
      averageScorePercent: Math.round(averageScorePercent),
      maxPossibleScore,
      averageResponseTime: Math.round(averageResponseTime),
      completionRate: Math.round(completionRate),
      questionStats,
      mostDifficultQuestion: mostDifficult,
      participantPerformance,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/analytics/dashboard
 * @desc    Get host dashboard analytics
 * @access  Private (Host)
 */
const getDashboardAnalytics = async (req, res, next) => {
  try {
    const totalQuizzes = await Quiz.countDocuments({ creator: req.user._id });
    const quizzes = await Quiz.find({ creator: req.user._id }).select('_id');
    const quizIds = quizzes.map(q => q._id);

    const totalSessions = await Room.countDocuments({
      quiz: { $in: quizIds },
      status: 'ended',
    });

    const totalParticipants = await Submission.countDocuments({
      quiz: { $in: quizIds },
    });

    // Recent sessions
    const recentSessions = await Room.find({
      quiz: { $in: quizIds },
      status: 'ended',
    })
      .populate('quiz', 'title')
      .sort({ endedAt: -1 })
      .limit(5);

    res.json({
      totalQuizzes,
      totalSessions,
      totalParticipants,
      recentSessions,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getQuizAnalytics, getDashboardAnalytics };
