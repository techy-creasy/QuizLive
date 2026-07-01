import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { quizAPI, analyticsAPI } from '../services/api';
import { Button, Card, Badge, Avatar, Spinner, EmptyState } from '../components/ui';
import { QuizCard } from '../components/quiz/QuizCard';

const StatCard = ({ label, value, icon, color = 'blue' }) => {
  const colors = {
    blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/20',
    green: 'from-green-500/20 to-green-500/5 border-green-500/20',
    purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/20',
    pink: 'from-pink-500/20 to-pink-500/5 border-pink-500/20',
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-2xl p-5`}>
      <div className="text-2xl mb-3">{icon}</div>
      <div className="text-3xl font-display font-bold text-white mb-1">{value}</div>
      <div className="text-sm text-slate-400">{label}</div>
    </div>
  );
};

const DashboardPage = () => {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [quizRes, statsRes] = await Promise.all([
          quizAPI.getAll({ limit: 20 }),
          analyticsAPI.getDashboard(),
        ]);
        setQuizzes(quizRes.data.quizzes);
        setStats(statsRes.data);
      } catch (err) {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleDelete = async (quizId) => {
    if (!confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) return;
    try {
      await quizAPI.delete(quizId);
      setQuizzes(prev => prev.filter(q => q._id !== quizId));
      toast.success('Quiz deleted');
    } catch {
      toast.error('Failed to delete quiz');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold">
            Welcome back, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-slate-400 mt-1">Here's what's happening with your quizzes.</p>
        </div>
        <Link to="/quizzes/new">
          <Button size="lg">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Quiz
          </Button>
        </Link>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Quizzes" value={stats.totalQuizzes} icon="📚" color="blue" />
          <StatCard label="Sessions Run" value={stats.totalSessions} icon="🎯" color="green" />
          <StatCard label="Total Players" value={stats.totalParticipants} icon="👥" color="purple" />
          <StatCard label="Avg. Score" value={stats.avgScore ? `${stats.avgScore}` : '—'} icon="⭐" color="pink" />
        </div>
      )}

      {/* Quizzes */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-display font-semibold">Your Quizzes</h2>
        <Link to="/quizzes" className="text-sm text-primary-400 hover:text-primary-300 transition-colors">
          View all →
        </Link>
      </div>

      {quizzes.length === 0 ? (
        <EmptyState
          icon="🧠"
          title="No quizzes yet"
          description="Create your first quiz and start hosting live sessions!"
          action={
            <Link to="/quizzes/new">
              <Button>Create your first quiz</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {quizzes.map(quiz => (
            <QuizCard key={quiz._id} quiz={quiz} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Recent sessions */}
      {stats?.recentSessions?.length > 0 && (
        <div className="mt-10">
          <h2 className="text-xl font-display font-semibold mb-4">Recent Sessions</h2>
          <Card className="divide-y divide-slate-700/50">
            {stats.recentSessions.map(session => (
              <div key={session._id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-200">{session.quiz?.title || 'Untitled Quiz'}</p>
                  <p className="text-sm text-slate-400">
                    {new Date(session.endedAt).toLocaleDateString()} · {session.participants?.length || 0} participants
                  </p>
                </div>
                <Link to={`/rooms/${session._id}/results`}>
                  <Button variant="secondary" size="sm">View Results</Button>
                </Link>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
