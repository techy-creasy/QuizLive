import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const FEATURES = [
  {
    icon: '⚡',
    title: 'Real-Time Sync',
    desc: 'Questions, timers, and scores update instantly across all devices using WebSockets.',
  },
  {
    icon: '🏆',
    title: 'Live Leaderboard',
    desc: 'Watch rankings update after every question. Speed matters — faster answers score more.',
  },
  {
    icon: '📊',
    title: 'Deep Analytics',
    desc: 'Hosts get detailed insights: accuracy per question, average response times, completion rates.',
  },
  {
    icon: '🎯',
    title: 'Flexible Quiz Types',
    desc: 'Multiple choice, true/false, and poll mode. Randomize questions and options for fairness.',
  },
  {
    icon: '🔗',
    title: 'Simple to Join',
    desc: 'Participants join with a 6-character room code. No app download required.',
  },
  {
    icon: '🛡️',
    title: 'Secure by Design',
    desc: 'JWT auth, bcrypt hashing, rate limiting, and server-controlled timers prevent cheating.',
  },
];

const LandingPage = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative max-w-5xl mx-auto px-4 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-primary-500/10 border border-primary-500/20 rounded-full px-4 py-1.5 text-sm text-primary-400 font-medium mb-8">
          <span className="w-2 h-2 bg-primary-400 rounded-full animate-pulse" />
          Live quizzes, zero lag
        </div>

        <h1 className="text-5xl md:text-7xl font-display font-extrabold text-white leading-tight mb-6">
          Quiz your team<br />
          <span className="bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
            in real time
          </span>
        </h1>

        <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Create engaging quiz sessions in minutes. Participants join with a room code, 
          answer synchronized questions, and compete on a live leaderboard.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {user ? (
            user.role === 'host' ? (
              <Link to="/dashboard" className="btn-primary text-lg px-8 py-4">
                Go to Dashboard →
              </Link>
            ) : (
              <Link to="/join" className="btn-primary text-lg px-8 py-4">
                Join a Quiz →
              </Link>
            )
          ) : (
            <>
              <Link to="/register?role=host" className="btn-primary text-lg px-8 py-4">
                Start hosting free
              </Link>
              <Link to="/join" className="btn-secondary text-lg px-8 py-4">
                Join as participant
              </Link>
            </>
          )}
        </div>

        {/* Decorative glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary-500/5 rounded-full blur-3xl pointer-events-none -z-10" />
      </section>

      {/* Mock quiz preview */}
      <section className="max-w-4xl mx-auto px-4 mb-24">
        <div className="card p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-accent-500/10 rounded-full blur-2xl" />
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Question 3 of 10</p>
              <h3 className="text-2xl font-display font-bold">Which planet has the most moons?</h3>
            </div>
            <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <span className="text-2xl font-display font-bold text-amber-400">12</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {['Jupiter', 'Saturn ✓', 'Uranus', 'Neptune'].map((opt, i) => (
              <div
                key={i}
                className={`p-4 rounded-xl border text-center font-semibold transition-all ${
                  opt.includes('✓')
                    ? 'bg-green-500/20 border-green-500/40 text-green-300'
                    : 'bg-slate-700/50 border-slate-600 text-slate-300'
                }`}
              >
                {opt}
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center gap-4">
            <div className="flex -space-x-2">
              {['A', 'B', 'C', 'D', 'E'].map((l, i) => (
                <div key={i} className="w-7 h-7 rounded-full bg-primary-500/30 border-2 border-slate-800 flex items-center justify-center text-xs font-bold text-primary-400">
                  {l}
                </div>
              ))}
            </div>
            <span className="text-sm text-slate-400">24 of 31 answered</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 pb-24">
        <h2 className="text-3xl font-display font-bold text-center mb-3">Everything you need</h2>
        <p className="text-slate-400 text-center mb-12">Built for hosts who want insight, and participants who want fun.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-5 hover:border-slate-600 transition-all">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-display font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-slate-800 py-20">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-display font-bold mb-4">Ready to run your first quiz?</h2>
          <p className="text-slate-400 mb-8">Sign up as a host and create your quiz in under 5 minutes.</p>
          <Link to="/register?role=host" className="btn-primary text-lg px-10 py-4">
            Create your first quiz →
          </Link>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
