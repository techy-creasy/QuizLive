import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { roomAPI } from '../services/api';
import { getSocket } from '../services/socket';
import { useSocketEvent, useSocketEmit } from '../hooks/useSocket';
import { Button, Avatar, Badge, Card, Spinner } from '../components/ui';

const OPTION_COLORS = [
  'bg-blue-500 hover:bg-blue-600',
  'bg-pink-500 hover:bg-pink-600',
  'bg-yellow-500 hover:bg-yellow-600',
  'bg-green-500 hover:bg-green-600',
];

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

const ParticipantList = ({ participants, onKick }) => (
  <div className="space-y-2 max-h-64 overflow-y-auto">
    {participants.map((p) => (
      <div key={p.user?._id || p.user} className="flex items-center justify-between p-2 rounded-lg bg-slate-700/50">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${p.isConnected ? 'bg-green-400' : 'bg-slate-500'}`} />
          <Avatar src={p.avatar} name={p.name} size="sm" />
          <span className="text-sm font-medium text-slate-200">{p.name}</span>
        </div>
        <button
          onClick={() => onKick(p.user?._id || p.user)}
          className="text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1 rounded hover:bg-red-500/10"
        >
          Kick
        </button>
      </div>
    ))}
    {participants.length === 0 && (
      <p className="text-center text-slate-500 text-sm py-4">Waiting for participants to join...</p>
    )}
  </div>
);

const AnswerBar = ({ option, count, total, isCorrect, color }) => {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-slate-300">{option}</span>
        <span className="text-sm text-slate-400">{count} ({pct}%)</span>
      </div>
      <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${isCorrect ? 'bg-green-500' : 'bg-blue-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

const HostRoomPage = () => {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const emit = useSocketEmit();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quizStatus, setQuizStatus] = useState('waiting'); // waiting | active | paused | ended
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [participants, setParticipants] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [questionEnded, setQuestionEnded] = useState(false);
  const [answerDistribution, setAnswerDistribution] = useState({});

  useEffect(() => {
    const loadRoom = async () => {
      try {
        const res = await roomAPI.getByCode(roomCode);
        setRoom(res.data.room);
        setParticipants(res.data.room.participants || []);
        // Join socket room as host
        emit('create-room', { roomCode });
      } catch {
        toast.error('Room not found');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    loadRoom();
  }, [roomCode]);

  // Copy invite link
  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/join?code=${roomCode}`);
    toast.success('Invite link copied!');
  };

  // Socket event handlers
  useSocketEvent('participant-joined', ({ user, participantCount }) => {
    setParticipants(prev => {
      if (prev.find(p => (p.user?._id || p.user) === user._id)) return prev;
      return [...prev, { user, name: user.name, avatar: user.avatar, isConnected: true }];
    });
    toast.info(`${user.name} joined!`, { autoClose: 2000 });
  });

  useSocketEvent('participant-left', ({ userId, name }) => {
    setParticipants(prev =>
      prev.map(p => (p.user?._id || p.user) === userId ? { ...p, isConnected: false } : p)
    );
  });

  useSocketEvent('new-question', (question) => {
    setCurrentQuestion(question);
    setQuizStatus('active');
    setTimeLeft(question.timer);
    setQuestionEnded(false);
    setAnsweredCount(0);
    setAnswerDistribution({});
    setShowLeaderboard(false);
  });

  useSocketEvent('timer-update', ({ timeLeft: t }) => {
    setTimeLeft(t);
  });

  useSocketEvent('answer-submitted', ({ userId }) => {
    setAnsweredCount(prev => prev + 1);
  });

  useSocketEvent('leaderboard-updated', ({ leaderboard: lb, correctAnswer, questionEnded: ended }) => {
    setLeaderboard(lb);
    setQuestionEnded(true);
    setShowLeaderboard(true);
    setTimeLeft(0);
  });

  useSocketEvent('quiz-ended', ({ leaderboard: lb, roomId }) => {
    setLeaderboard(lb);
    setQuizStatus('ended');
    toast.success('Quiz ended! Redirecting to results...');
    setTimeout(() => navigate(`/rooms/${roomId}/results`), 2000);
  });

  useSocketEvent('quiz-paused', () => setQuizStatus('paused'));
  useSocketEvent('quiz-resumed', () => setQuizStatus('active'));

  const handleStart = () => {
    emit('start-quiz', { roomCode });
    setQuizStatus('active');
    toast.success('Quiz started!');
  };

  const handleNextQuestion = () => {
    setShowLeaderboard(false);
    setQuestionEnded(false);
    emit('next-question', { roomCode });
  };

  const handlePause = () => {
    emit(quizStatus === 'paused' ? 'resume-quiz' : 'pause-quiz', { roomCode });
  };

  const handleEnd = () => {
    if (!confirm('Are you sure you want to end the quiz?')) return;
    emit('end-quiz', { roomCode });
  };

  const handleKick = (userId) => {
    emit('kick-participant', { roomCode, userId });
    setParticipants(prev => prev.filter(p => (p.user?._id || p.user) !== userId));
    toast.success('Participant removed');
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <Spinner size="lg" />
    </div>
  );

  const quiz = room?.quiz;
  const totalQuestions = quiz?.questions?.length || 0;
  const currentQIndex = currentQuestion?.questionIndex ?? -1;
  const timerPct = currentQuestion ? (timeLeft / currentQuestion.timer) * 100 : 0;
  const timerColor = timeLeft > 10 ? 'bg-green-500' : timeLeft > 5 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold">{quiz?.title}</h1>
          <div className="flex items-center gap-3 mt-1">
            <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-4 py-1.5">
              <span className="text-slate-400 text-sm">Room Code:</span>
              <span className="font-display font-bold text-xl text-primary-400 tracking-widest">{roomCode}</span>
            </div>
            <Button variant="secondary" size="sm" onClick={copyLink}>
              📋 Copy Link
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          {quizStatus === 'waiting' && (
            <Button onClick={handleStart} size="lg">
              ▶ Start Quiz
            </Button>
          )}
          {(quizStatus === 'active' || quizStatus === 'paused') && (
            <>
              <Button variant="secondary" onClick={handlePause}>
                {quizStatus === 'paused' ? '▶ Resume' : '⏸ Pause'}
              </Button>
              <Button variant="danger" onClick={handleEnd}>
                ⏹ End Quiz
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main area */}
        <div className="lg:col-span-2 space-y-4">
          {/* Status bar */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Badge color={quizStatus === 'active' ? 'green' : quizStatus === 'paused' ? 'yellow' : quizStatus === 'ended' ? 'red' : 'blue'}>
                  {quizStatus === 'waiting' ? '⏳ Waiting' : quizStatus === 'active' ? '🔴 Live' : quizStatus === 'paused' ? '⏸ Paused' : '✅ Ended'}
                </Badge>
                {currentQuestion && (
                  <span className="text-sm text-slate-400">
                    Question {currentQIndex + 1} of {totalQuestions}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-400">
                <span>👥 {participants.filter(p => p.isConnected).length} online</span>
                {currentQuestion && !questionEnded && (
                  <span>✅ {answeredCount}/{participants.length} answered</span>
                )}
              </div>
            </div>

            {/* Timer bar */}
            {currentQuestion && !questionEnded && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-400">Time remaining</span>
                  <span className={`font-bold ${timeLeft <= 5 ? 'text-red-400' : 'text-slate-200'}`}>
                    {timeLeft}s
                  </span>
                </div>
                <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${timerColor}`}
                    style={{ width: `${timerPct}%` }}
                  />
                </div>
              </div>
            )}
          </Card>

          {/* Waiting state */}
          {quizStatus === 'waiting' && (
            <Card className="p-8 text-center">
              <div className="text-6xl mb-4">🎮</div>
              <h2 className="text-2xl font-display font-bold mb-2">Waiting for players</h2>
              <p className="text-slate-400 mb-6">Share the room code with participants, then start when ready.</p>
              <div className="text-6xl font-display font-extrabold text-primary-400 tracking-[0.3em] mb-6">
                {roomCode}
              </div>
              <p className="text-slate-500 text-sm">Or share this link: <span className="text-primary-400">{window.location.origin}/join?code={roomCode}</span></p>
            </Card>
          )}

          {/* Current question display */}
          {currentQuestion && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Badge color="purple">Q{currentQIndex + 1}/{totalQuestions}</Badge>
                <Badge color="yellow">{currentQuestion.points} pts</Badge>
              </div>
              <h2 className="text-xl font-display font-bold mb-6">{currentQuestion.question}</h2>
              <div className="grid grid-cols-2 gap-3">
                {currentQuestion.options.map((opt, i) => (
                  <div
                    key={i}
                    className={`p-4 rounded-xl text-white font-semibold flex items-center gap-3 ${OPTION_COLORS[i % 4]}`}
                  >
                    <span className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-sm font-bold">
                      {OPTION_LABELS[i]}
                    </span>
                    {opt.text}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Leaderboard after question */}
          {showLeaderboard && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-lg">🏆 Leaderboard</h3>
                <Button onClick={handleNextQuestion} size="sm">
                  {currentQIndex + 1 >= totalQuestions ? 'End Quiz →' : 'Next Question →'}
                </Button>
              </div>
              <div className="space-y-2">
                {leaderboard.slice(0, 10).map((entry, i) => (
                  <div
                    key={entry.user || i}
                    className={`flex items-center justify-between p-3 rounded-xl rank-item ${
                      i === 0 ? 'bg-yellow-500/15 border border-yellow-500/30' :
                      i === 1 ? 'bg-slate-400/10 border border-slate-400/20' :
                      i === 2 ? 'bg-orange-500/10 border border-orange-500/20' :
                      'bg-slate-700/50'
                    }`}
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold bg-slate-700">
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                      </span>
                      <Avatar src={entry.avatar} name={entry.name} size="sm" />
                      <span className="font-medium text-slate-200">{entry.name}</span>
                    </div>
                    <span className="font-display font-bold text-primary-400">{entry.score.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Next question prompt */}
          {quizStatus === 'active' && !currentQuestion && (
            <Card className="p-8 text-center">
              <p className="text-slate-400 mb-4">Quiz started! Click to show the first question.</p>
              <Button onClick={handleNextQuestion} size="lg">
                Show Question 1 →
              </Button>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Participants */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-semibold">Participants</h3>
              <Badge color="blue">{participants.length}</Badge>
            </div>
            <ParticipantList participants={participants} onKick={handleKick} />
          </Card>

          {/* Quick stats */}
          {currentQuestion && (
            <Card className="p-4">
              <h3 className="font-display font-semibold mb-3">Answer Progress</h3>
              <div className="text-center">
                <div className="text-4xl font-display font-bold text-primary-400">
                  {answeredCount}
                </div>
                <div className="text-slate-400 text-sm">of {participants.length} answered</div>
                <div className="mt-3 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 rounded-full transition-all duration-500"
                    style={{ width: `${participants.length > 0 ? (answeredCount / participants.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </Card>
          )}

          {/* Quiz progress */}
          <Card className="p-4">
            <h3 className="font-display font-semibold mb-3">Progress</h3>
            <div className="flex gap-1 flex-wrap">
              {Array.from({ length: totalQuestions }).map((_, i) => (
                <div
                  key={i}
                  className={`w-6 h-6 rounded text-xs flex items-center justify-center font-bold ${
                    i < currentQIndex ? 'bg-green-500/30 text-green-400' :
                    i === currentQIndex ? 'bg-primary-500 text-white' :
                    'bg-slate-700 text-slate-500'
                  }`}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default HostRoomPage;
