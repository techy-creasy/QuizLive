import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { roomAPI } from '../../services/api';
import { Button, Badge } from '../ui';

export const QuizCard = ({ quiz, onDelete }) => {
  const [starting, setStarting] = useState(false);
  const navigate = useNavigate();

  const handleStart = async () => {
    setStarting(true);
    try {
      const res = await roomAPI.create({ quizId: quiz._id });
      const room = res.data.room;
      navigate(`/host/${room.roomCode}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to start quiz');
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="card p-5 hover:border-slate-600 transition-all group">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-slate-100 truncate group-hover:text-white transition-colors">
            {quiz.title}
          </h3>
          {quiz.description && (
            <p className="text-sm text-slate-400 mt-0.5 truncate">{quiz.description}</p>
          )}
        </div>
        <Badge color="blue">{quiz.questions?.length ?? quiz.questionCount ?? 0} Q</Badge>
      </div>

      <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
        <span>🎯 {quiz.playCount || 0} plays</span>
        <span>📅 {new Date(quiz.createdAt).toLocaleDateString()}</span>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleStart} loading={starting} size="sm" className="flex-1">
          ▶ Start Live
        </Button>
        <Link to={`/quizzes/${quiz._id}/edit`}>
          <Button variant="secondary" size="sm">Edit</Button>
        </Link>
        <Button variant="danger" size="sm" onClick={() => onDelete(quiz._id)}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </Button>
      </div>
    </div>
  );
};
