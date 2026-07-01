import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocketEvent, useSocketEmit } from '../hooks/useSocket';
import { Avatar, Badge, Card } from '../components/ui';

const OPTION_COLORS = [
  { bg: 'bg-blue-500 hover:bg-blue-600', border: 'border-blue-400', selected: 'ring-2 ring-blue-300', label: 'A' },
  { bg: 'bg-pink-500 hover:bg-pink-600', border: 'border-pink-400', selected: 'ring-2 ring-pink-300', label: 'B' },
  { bg: 'bg-yellow-500 hover:bg-yellow-600', border: 'border-yellow-400', selected: 'ring-2 ring-yellow-300', label: 'C' },
  { bg: 'bg-green-500 hover:bg-green-600', border: 'border-green-400', selected: 'ring-2 ring-green-300', label: 'D' },
];

const QuizPage = () => {
  const { roomCode } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const emit = useSocketEmit();

  // If we arrived here carrying an already-received question (from the waiting room), use it.
  const initialQuestion = location.state?.initialQuestion || null;

  const [currentQuestion, setCurrentQuestion] = useState(initialQuestion);
  const [timeLeft, setTimeLeft] = useState(initialQuestion?.timer || 0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [answerResult, setAnswerResult] = useState(null); // { isCorrect, pointsEarned, correctAnswer }
  const [leaderboard, setLeaderboard] = useState([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [quizPaused, setQuizPaused] = useState(false);
  const [myRank, setMyRank] = useState(null);

  const timerPct = currentQuestion ? (timeLeft / currentQuestion.timer) * 100 : 0;
  const timerColor = timeLeft > 10 ? '#22c55e' : timeLeft > 5 ? '#eab308' : '#ef4444';

  useEffect(() => {
    // Ensure we're joined to the socket room (handles refresh/reconnect mid-quiz)
    emit('join-room', { roomCode });
  }, [roomCode]);

  useSocketEvent('new-question', (question) => {
    setCurrentQuestion(question);
    setTimeLeft(question.timer);
    setSelectedOption(null);
    setHasAnswered(false);
    setAnswerResult(null);
    setShowLeaderboard(false);
    setQuizPaused(false);
  });

  useSocketEvent('timer-update', ({ timeLeft: t }) => {
    setTimeLeft(t);
  });

  useSocketEvent('answer-received', (result) => {
    setAnswerResult(result);
    setTotalScore(prev => prev + (result.pointsEarned || 0));
  });

  useSocketEvent('leaderboard-updated', ({ leaderboard: lb }) => {
    setLeaderboard(lb);
    setShowLeaderboard(true);
    // Find my rank
    const myEntry = lb.find(e => e.user === user?._id || e.user?._id === user?._id);
    if (myEntry) setMyRank(myEntry.rank);
  });

  useSocketEvent('quiz-ended', ({ leaderboard: lb, roomId }) => {
    navigate(`/rooms/${roomId}/results`);
  });

  useSocketEvent('quiz-paused', () => setQuizPaused(true));
  useSocketEvent('quiz-resumed', () => setQuizPaused(false));

  useSocketEvent('kicked', ({ message }) => {
    navigate('/join');
  });

  const handleAnswer = (optionIndex) => {
    if (hasAnswered || timeLeft === 0) return;
    setSelectedOption(optionIndex);
    setHasAnswered(true);
    emit('submit-answer', {
      roomCode,
      questionIndex: currentQuestion.questionIndex,
      selectedOption: optionIndex,
      questionId: currentQuestion._id,
    });
  };

  if (quizPaused) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⏸</div>
          <h2 className="text-2xl font-display font-bold mb-2">Quiz Paused</h2>
          <p className="text-slate-400">The host has paused the quiz. Hang tight!</p>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">🎯</div>
          <h2 className="text-2xl font-display font-bold mb-2">Get ready!</h2>
          <p className="text-slate-400">The first question is coming up...</p>
        </div>
      </div>
    );
  }

  // Leaderboard between questions
  if (showLeaderboard) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* My result */}
        {answerResult && (
          <div className={`card p-6 mb-6 text-center border-2 ${
            answerResult.isCorrect ? 'border-green-500/50 bg-green-500/5' : 'border-red-500/50 bg-red-500/5'
          }`}>
            <div className="text-4xl mb-2">{answerResult.isCorrect ? '🎉' : '😔'}</div>
            <p className="text-lg font-semibold mb-1">
              {answerResult.isCorrect ? 'Correct!' : currentQuestion?.type === 'poll' ? 'Response recorded!' : 'Not quite!'}
            </p>
            {answerResult.isCorrect && (
              <p className="text-3xl font-display font-bold text-green-400">
                +{answerResult.pointsEarned} pts
              </p>
            )}
            <div className="mt-3 pt-3 border-t border-slate-700 flex justify-between text-sm text-slate-400">
              <span>Your total</span>
              <span className="font-bold text-slate-200">{totalScore.toLocaleString()} pts</span>
            </div>
            {myRank && (
              <div className="mt-2 flex justify-between text-sm text-slate-400">
                <span>Your rank</span>
                <span className="font-bold text-primary-400">#{myRank}</span>
              </div>
            )}
          </div>
        )}

        <Card className="p-5">
          <h3 className="font-display font-semibold text-lg mb-4">🏆 Leaderboard</h3>
          <div className="space-y-2">
            {leaderboard.slice(0, 8).map((entry, i) => {
              const isMe = entry.user === user?._id || entry.user?._id === user?._id;
              return (
                <div
                  key={i}
                  className={`flex items-center justify-between p-3 rounded-xl rank-item ${
                    isMe ? 'bg-primary-500/20 border border-primary-500/30' :
                    i === 0 ? 'bg-yellow-500/15 border border-yellow-500/20' :
                    'bg-slate-700/50'
                  }`}
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 text-center text-sm font-bold">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                    </span>
                    <Avatar src={entry.avatar} name={entry.name} size="sm" />
                    <span className={`font-medium text-sm ${isMe ? 'text-primary-300' : 'text-slate-200'}`}>
                      {entry.name} {isMe && '(you)'}
                    </span>
                  </div>
                  <span className="font-display font-bold text-sm text-primary-400">
                    {entry.score.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-center text-slate-500 text-xs mt-4">Waiting for host to continue...</p>
        </Card>
      </div>
    );
  }

  // Active question
  return (
    <div className="min-h-screen flex flex-col max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Badge color="purple">Q{currentQuestion.questionIndex + 1}/{currentQuestion.totalQuestions}</Badge>
        <div className="flex items-center gap-3">
          <Badge color="yellow">{currentQuestion.points} pts</Badge>
          <div
            className="text-2xl font-display font-bold w-12 h-12 rounded-full border-4 flex items-center justify-center transition-colors duration-1000"
            style={{ borderColor: timerColor, color: timerColor }}
          >
            {timeLeft}
          </div>
        </div>
      </div>

      {/* Timer bar */}
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-6">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${timerPct}%`, backgroundColor: timerColor }}
        />
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col">
        <h2 className="text-xl md:text-2xl font-display font-bold text-center mb-8 leading-tight">
          {currentQuestion.question}
        </h2>

        {/* Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {currentQuestion.options.map((opt, i) => {
            const color = OPTION_COLORS[i % OPTION_COLORS.length];
            const isSelected = selectedOption === i;
            const isCorrect = answerResult && answerResult.correctAnswer === i;
            const isWrong = answerResult && isSelected && !answerResult.isCorrect;

            let className = `relative p-5 rounded-2xl text-white font-semibold text-lg transition-all duration-200 flex items-center gap-4 cursor-pointer select-none ${color.bg}`;
            if (hasAnswered && !isSelected) className += ' opacity-50 cursor-default';
            if (isSelected) className += ` ${color.selected}`;
            if (isCorrect && hasAnswered) className += ' !bg-green-500 ring-2 ring-green-300';
            if (isWrong) className += ' !bg-red-500 ring-2 ring-red-300';

            return (
              <button
                key={i}
                className={className}
                onClick={() => handleAnswer(i)}
                disabled={hasAnswered || timeLeft === 0}
              >
                <span className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-base font-bold flex-shrink-0">
                  {color.label}
                </span>
                <span className="text-left leading-tight">{opt.text}</span>
                {isCorrect && hasAnswered && <span className="ml-auto text-xl">✓</span>}
                {isWrong && <span className="ml-auto text-xl">✗</span>}
              </button>
            );
          })}
        </div>

        {/* After answering */}
        {hasAnswered && !showLeaderboard && (
          <div className={`mt-6 p-4 rounded-xl text-center border ${
            answerResult?.isCorrect ? 'bg-green-500/10 border-green-500/30' : 'bg-slate-700/50 border-slate-600'
          }`}>
            {answerResult ? (
              <>
                <p className="font-semibold text-lg">
                  {answerResult.isCorrect ? '✅ Correct!' : currentQuestion.type === 'poll' ? '📊 Response recorded!' : '❌ Wrong answer'}
                </p>
                {answerResult.isCorrect && (
                  <p className="text-green-400 font-display font-bold text-2xl mt-1">
                    +{answerResult.pointsEarned} pts
                  </p>
                )}
              </>
            ) : (
              <p className="text-slate-400">Answer submitted! Waiting for results...</p>
            )}
          </div>
        )}

        {/* Timed out */}
        {!hasAnswered && timeLeft === 0 && (
          <div className="mt-6 p-4 rounded-xl text-center border border-red-500/30 bg-red-500/10">
            <p className="text-red-400 font-semibold">⏰ Time's up! You didn't answer in time.</p>
          </div>
        )}

        {/* Score indicator */}
        <div className="mt-6 text-center text-slate-500 text-sm">
          Total score: <span className="text-primary-400 font-bold">{totalScore.toLocaleString()} pts</span>
        </div>
      </div>
    </div>
  );
};

export default QuizPage;
