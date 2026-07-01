import { Link } from 'react-router-dom';
import { Button } from '../components/ui';

const NotFoundPage = () => (
  <div className="min-h-screen flex items-center justify-center p-4">
    <div className="text-center">
      <div className="text-8xl font-display font-extrabold text-slate-700 mb-4">404</div>
      <div className="text-5xl mb-4">🔍</div>
      <h1 className="text-2xl font-display font-bold mb-2">Page not found</h1>
      <p className="text-slate-400 mb-8 max-w-sm">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div className="flex gap-3 justify-center">
        <Link to="/"><Button variant="secondary">Go Home</Button></Link>
        <Link to="/join"><Button>Join a Quiz</Button></Link>
      </div>
    </div>
  </div>
);

export default NotFoundPage;
