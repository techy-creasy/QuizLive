import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { roomAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Avatar, Badge, Card, Button, Spinner, EmptyState } from '../components/ui';

const MEDAL = ['🥇', '🥈', '🥉'];

const exportCSV = (submissions, roomCode) => {
  const header = ['Rank', 'Name', 'Score', 'Correct Answers', 'Avg Response Time (ms)'];
  const rows = submissions.map((s, i) => [
    i + 1,
    s.user?.name || 'Unknown',
    s.totalScore,
    s.correctAnswers,
    s.answers?.length > 0 ? Math.round(s.totalResponseTime / s.answers.length) : 0,
  ]);
  const csv = [header, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `quizlive-results-${roomCode}.csv`;
  a.click();
};

const ResultsPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [room, setRoom] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    roomAPI.getResults(id).then(res => {
      setRoom(res.data.room);
      setSubmissions(res.data.submissions);
    }).catch(() => {
      toast.error('Failed to load results');
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center h-screen"><Spinner size="lg" /></div>
  );

  if (!room) return (
    <EmptyState icon="🔍" title="Results not found" description="This session may no longer be available." />
  );

  const mySubmission = submissions.find(s => s.user?._id === user?._id);
  const totalQuestions = room.quiz?.questions?.length || 0;
  const isHost = room.host?._id === user?._id || room.host === user?._id;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">🏁</div>
        <h1 className="text-3xl font-display font-bold mb-1">{room.quiz?.title}</h1>
        <p className="text-slate-400">{submissions.length} participants · {totalQuestions} questions</p>
      </div>

      {/* My result card */}
      {mySubmission && (
        <div className="card p-6 mb-6 border-primary-500/30 bg-primary-500/5 text-center">
          <p className="text-slate-400 text-sm mb-2">Your result</p>
          <div className="text-5xl font-display font-extrabold text-primary-400 mb-2">
            {mySubmission.totalScore.toLocaleString()}
          </div>
          <p className="text-slate-300 text-sm mb-3">points</p>
          <div className="flex justify-center gap-6 text-sm text-slate-400">
            <div>
              <span className="block text-xl font-bold text-slate-200">
                {mySubmission.finalRank ? `#${mySubmission.finalRank}` : '—'}
              </span>
              <span>Rank</span>
            </div>
            <div>
              <span className="block text-xl font-bold text-slate-200">
                {mySubmission.correctAnswers}/{totalQuestions}
              </span>
              <span>Correct</span>
            </div>
            <div>
              <span className="block text-xl font-bold text-slate-200">
                {totalQuestions > 0 ? Math.round((mySubmission.correctAnswers / totalQuestions) * 100) : 0}%
              </span>
              <span>Accuracy</span>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-display font-semibold">Final Leaderboard</h2>
        {isHost && (
          <Button variant="secondary" size="sm" onClick={() => exportCSV(submissions, room.roomCode)}>
            📥 Export CSV
          </Button>
        )}
      </div>

      <Card className="divide-y divide-slate-700/50 overflow-hidden">
        {submissions.map((s, i) => {
          const isMe = s.user?._id === user?._id;
          const accuracy = totalQuestions > 0 ? Math.round((s.correctAnswers / totalQuestions) * 100) : 0;
          return (
            <div
              key={s._id || i}
              className={`flex items-center justify-between p-4 transition-colors ${
                isMe ? 'bg-primary-500/10' : 'hover:bg-slate-700/30'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 text-center">
                  {i < 3 ? (
                    <span className="text-2xl">{MEDAL[i]}</span>
                  ) : (
                    <span className="font-display font-bold text-slate-400">#{i + 1}</span>
                  )}
                </div>
                <Avatar src={s.user?.avatar} name={s.user?.name} size="md" />
                <div>
                  <p className={`font-semibold ${isMe ? 'text-primary-300' : 'text-slate-100'}`}>
                    {s.user?.name || 'Unknown'} {isMe && <span className="text-xs text-primary-400">(you)</span>}
                  </p>
                  <p className="text-xs text-slate-500">
                    {s.correctAnswers}/{totalQuestions} correct · {accuracy}% accuracy
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-display font-bold text-xl text-primary-400">
                  {s.totalScore.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500">pts</p>
              </div>
            </div>
          );
        })}
        {submissions.length === 0 && (
          <div className="p-8 text-center text-slate-500">No submissions recorded</div>
        )}
      </Card>

      {/* Actions */}
      <div className="flex gap-3 mt-8 justify-center">
        {isHost ? (
          <>
            <Link to="/dashboard"><Button variant="secondary">← Dashboard</Button></Link>
            <Link to={`/analytics/${room.quiz?._id}`}><Button>View Analytics →</Button></Link>
          </>
        ) : (
          <Link to="/join"><Button>Join another quiz</Button></Link>
        )}
      </div>
    </div>
  );
};

export default ResultsPage;
