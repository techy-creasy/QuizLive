import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { quizAPI } from '../services/api';
import { Button, Spinner, EmptyState, Input } from '../components/ui';
import { QuizCard } from '../components/quiz/QuizCard';

const PAGE_SIZE = 9;

const MyQuizzesPage = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchQuizzes = useCallback(async (searchTerm, pageNum) => {
    setLoading(true);
    try {
      const res = await quizAPI.getAll({
        limit: PAGE_SIZE,
        page: pageNum,
        ...(searchTerm ? { search: searchTerm } : {}),
      });
      setQuizzes(res.data.quizzes);
      setTotalPages(res.data.totalPages || 1);
      setTotal(res.data.total || 0);
    } catch {
      toast.error('Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuizzes(search, page);
  }, [page]);

  // Debounced search
  useEffect(() => {
    const handle = setTimeout(() => {
      setPage(1);
      fetchQuizzes(search, 1);
    }, 350);
    return () => clearTimeout(handle);
  }, [search]);

  const handleDelete = async (quizId) => {
    if (!confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) return;
    try {
      await quizAPI.delete(quizId);
      toast.success('Quiz deleted');
      fetchQuizzes(search, page);
    } catch {
      toast.error('Failed to delete quiz');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold">My Quizzes</h1>
          <p className="text-slate-400 mt-1">{total} quiz{total !== 1 ? 'zes' : ''} total</p>
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

      {/* Search */}
      <div className="mb-6 max-w-md">
        <Input
          placeholder="Search your quizzes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          }
        />
      </div>

      {/* Quiz grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      ) : quizzes.length === 0 ? (
        <EmptyState
          icon={search ? '🔍' : '🧠'}
          title={search ? 'No quizzes found' : 'No quizzes yet'}
          description={
            search
              ? `Nothing matched "${search}". Try a different search term.`
              : 'Create your first quiz and start hosting live sessions!'
          }
          action={
            !search && (
              <Link to="/quizzes/new">
                <Button>Create your first quiz</Button>
              </Link>
            )
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {quizzes.map(quiz => (
              <QuizCard key={quiz._id} quiz={quiz} onDelete={handleDelete} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                ← Previous
              </Button>
              <span className="text-sm text-slate-400 px-3">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                Next →
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MyQuizzesPage;
