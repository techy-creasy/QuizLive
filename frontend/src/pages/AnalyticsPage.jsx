import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, ArcElement,
  Tooltip, Legend, Title,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { analyticsAPI, quizAPI } from '../services/api';
import { Card, Badge, Avatar, Button, Spinner, EmptyState } from '../components/ui';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, Title);

const CHART_COLORS = {
  primary: 'rgba(37, 99, 235, 0.8)',
  accent: 'rgba(236, 72, 153, 0.8)',
  green: 'rgba(34, 197, 94, 0.8)',
  yellow: 'rgba(234, 179, 8, 0.8)',
  red: 'rgba(239, 68, 68, 0.8)',
  border: {
    primary: 'rgb(37, 99, 235)',
    accent: 'rgb(236, 72, 153)',
    green: 'rgb(34, 197, 94)',
  },
};

const chartDefaults = {
  responsive: true,
  plugins: {
    legend: { labels: { color: '#94a3b8' } },
    tooltip: {
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      borderWidth: 1,
      titleColor: '#f1f5f9',
      bodyColor: '#94a3b8',
    },
  },
  scales: {
    x: { ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' } },
    y: { ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' } },
  },
};

const StatCard = ({ label, value, sub, color = 'blue' }) => {
  const colors = {
    blue: 'text-primary-400', green: 'text-green-400',
    yellow: 'text-yellow-400', pink: 'text-pink-400',
  };
  return (
    <Card className="p-5">
      <div className={`text-3xl font-display font-bold ${colors[color]}`}>{value}</div>
      <div className="text-sm font-medium text-slate-300 mt-1">{label}</div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </Card>
  );
};

const AnalyticsPage = () => {
  const { quizId } = useParams();
  const [analytics, setAnalytics] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      analyticsAPI.getQuizAnalytics(quizId),
      quizAPI.getById(quizId),
    ]).then(([aRes, qRes]) => {
      setAnalytics(aRes.data);
      setQuiz(qRes.data.quiz);
    }).catch(() => toast.error('Failed to load analytics'))
      .finally(() => setLoading(false));
  }, [quizId]);

  if (loading) return <div className="flex items-center justify-center h-screen"><Spinner size="lg" /></div>;

  if (!analytics || analytics.totalSessions === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <EmptyState
          icon="📊"
          title="No data yet"
          description="Run this quiz at least once to see analytics."
          action={<Link to="/dashboard"><Button>Back to Dashboard</Button></Link>}
        />
      </div>
    );
  }

  // Question accuracy chart
  const accuracyData = {
    labels: analytics.questionStats.map((_, i) => `Q${i + 1}`),
    datasets: [{
      label: 'Accuracy %',
      data: analytics.questionStats.map(q => q.accuracy),
      backgroundColor: analytics.questionStats.map(q =>
        q.accuracy >= 70 ? CHART_COLORS.green :
        q.accuracy >= 40 ? CHART_COLORS.yellow : CHART_COLORS.red
      ),
      borderRadius: 6,
    }],
  };

  // Response time chart
  const responseTimeData = {
    labels: analytics.questionStats.map((_, i) => `Q${i + 1}`),
    datasets: [{
      label: 'Avg Response Time (ms)',
      data: analytics.questionStats.map(q => q.avgResponseTime),
      backgroundColor: CHART_COLORS.primary,
      borderRadius: 6,
    }],
  };

  // Completion doughnut
  const completionData = {
    labels: ['Completed', 'Did not finish'],
    datasets: [{
      data: [analytics.completionRate, 100 - analytics.completionRate],
      backgroundColor: [CHART_COLORS.green, 'rgba(51, 65, 85, 0.6)'],
      borderColor: ['rgb(34,197,94)', 'rgb(51,65,85)'],
      borderWidth: 2,
    }],
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link to="/dashboard" className="text-slate-400 hover:text-slate-200 text-sm transition-colors mb-2 block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-display font-bold">{quiz?.title}</h1>
          <p className="text-slate-400 mt-1">Analytics across {analytics.totalSessions} session{analytics.totalSessions !== 1 ? 's' : ''}</p>
        </div>
        <Link to={`/quizzes/${quizId}/edit`}>
          <Button variant="secondary">Edit Quiz</Button>
        </Link>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Sessions" value={analytics.totalSessions} color="blue" />
        <StatCard label="Total Participants" value={analytics.totalParticipants} color="pink" />
        <StatCard
          label="Average Score"
          value={analytics.averageScore.toLocaleString()}
          sub={`${analytics.averageScorePercent}% of max`}
          color="yellow"
        />
        <StatCard
          label="Completion Rate"
          value={`${analytics.completionRate}%`}
          color="green"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Accuracy by question */}
        <div className="lg:col-span-2 card p-5">
          <h3 className="font-display font-semibold mb-4">Accuracy by Question</h3>
          <Bar
            data={accuracyData}
            options={{
              ...chartDefaults,
              plugins: { ...chartDefaults.plugins, legend: { display: false } },
              scales: {
                ...chartDefaults.scales,
                y: { ...chartDefaults.scales.y, min: 0, max: 100, ticks: { ...chartDefaults.scales.y.ticks, callback: v => `${v}%` } },
              },
            }}
          />
        </div>

        {/* Completion doughnut */}
        <div className="card p-5 flex flex-col items-center justify-center">
          <h3 className="font-display font-semibold mb-4 self-start">Completion Rate</h3>
          <div className="w-48">
            <Doughnut
              data={completionData}
              options={{
                responsive: true,
                plugins: {
                  legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 12 } },
                  tooltip: chartDefaults.plugins.tooltip,
                },
                cutout: '65%',
              }}
            />
          </div>
          <div className="text-center mt-3">
            <span className="text-3xl font-display font-bold text-green-400">{analytics.completionRate}%</span>
            <p className="text-xs text-slate-500">finished all questions</p>
          </div>
        </div>
      </div>

      {/* Response time chart */}
      <div className="card p-5 mb-8">
        <h3 className="font-display font-semibold mb-4">Average Response Time by Question</h3>
        <Bar
          data={responseTimeData}
          options={{
            ...chartDefaults,
            plugins: { ...chartDefaults.plugins, legend: { display: false } },
            scales: {
              ...chartDefaults.scales,
              y: { ...chartDefaults.scales.y, ticks: { ...chartDefaults.scales.y.ticks, callback: v => `${(v / 1000).toFixed(1)}s` } },
            },
          }}
        />
      </div>

      {/* Hardest question */}
      {analytics.mostDifficultQuestion && (
        <Card className="p-5 mb-8 border-red-500/20 bg-red-500/5">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🧩</span>
            <div>
              <h3 className="font-display font-semibold mb-1">Hardest Question</h3>
              <p className="text-slate-300">Q{analytics.mostDifficultQuestion.questionIndex + 1}: {analytics.mostDifficultQuestion.question}</p>
              <div className="flex gap-4 mt-2 text-sm text-slate-400">
                <span>Accuracy: <span className="text-red-400 font-bold">{analytics.mostDifficultQuestion.accuracy}%</span></span>
                <span>Avg time: {(analytics.mostDifficultQuestion.avgResponseTime / 1000).toFixed(1)}s</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Per-question breakdown */}
      <h2 className="text-xl font-display font-semibold mb-4">Question Breakdown</h2>
      <div className="space-y-4">
        {analytics.questionStats.map((q, i) => (
          <Card key={i} className="p-5">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <Badge color={q.accuracy >= 70 ? 'green' : q.accuracy >= 40 ? 'yellow' : 'red'} className="mb-2">
                  Q{i + 1}
                </Badge>
                <p className="font-medium text-slate-200">{q.question}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-2xl font-display font-bold text-primary-400">{q.accuracy}%</div>
                <div className="text-xs text-slate-500">accuracy</div>
              </div>
            </div>
            {/* Option distribution */}
            <div className="space-y-2">
              {q.optionDistribution.map((opt, oi) => {
                const pct = q.totalAnswers > 0 ? Math.round((opt.count / q.totalAnswers) * 100) : 0;
                return (
                  <div key={oi} className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${opt.isCorrect ? 'bg-green-400' : 'bg-slate-500'}`} />
                    <span className="text-sm text-slate-400 w-32 truncate">{opt.option}</span>
                    <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${opt.isCorrect ? 'bg-green-500' : 'bg-blue-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-400 w-12 text-right">{opt.count} ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>

      {/* Top performers */}
      {analytics.participantPerformance?.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-display font-semibold mb-4">Top Performers</h2>
          <Card className="divide-y divide-slate-700/50 overflow-hidden">
            {analytics.participantPerformance.map((p, i) => (
              <div key={i} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <span className="w-7 text-center font-bold text-slate-400">#{i + 1}</span>
                  <Avatar src={p.user?.avatar} name={p.user?.name} />
                  <div>
                    <p className="font-medium text-slate-200">{p.user?.name || 'Unknown'}</p>
                    <p className="text-xs text-slate-500">{p.accuracy}% accuracy · {(p.avgResponseTime / 1000).toFixed(1)}s avg</p>
                  </div>
                </div>
                <span className="font-display font-bold text-primary-400">{p.score.toLocaleString()} pts</span>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;
