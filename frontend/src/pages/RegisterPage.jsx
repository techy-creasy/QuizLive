import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { Button, Input, Card } from '../components/ui';

const RegisterPage = () => {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultRole = searchParams.get('role') || 'participant';

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { role: defaultRole },
  });

  const role = watch('role');

  const onSubmit = async (data) => {
    try {
      const user = await registerUser(data);
      toast.success(`Account created! Welcome, ${user.name}!`);
      navigate(user.role === 'host' ? '/dashboard' : '/join', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
              <span className="text-white font-bold text-lg">Q</span>
            </div>
            <span className="font-display font-bold text-2xl">Quiz<span className="text-primary-400">Live</span></span>
          </div>
          <h1 className="text-2xl font-display font-bold mt-4">Create your account</h1>
          <p className="text-slate-400 mt-1">Join thousands of quiz hosts and players</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Role selection */}
            <div>
              <label className="label">I want to...</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'host', label: '🎯 Host quizzes', desc: 'Create & run live quiz sessions' },
                  { value: 'participant', label: '🎮 Play quizzes', desc: 'Join sessions and compete' },
                ].map(opt => (
                  <label
                    key={opt.value}
                    className={`cursor-pointer p-3 rounded-xl border-2 transition-all ${
                      role === opt.value
                        ? 'border-primary-500 bg-primary-500/10'
                        : 'border-slate-600 hover:border-slate-500'
                    }`}
                  >
                    <input type="radio" value={opt.value} className="sr-only" {...register('role')} />
                    <div className="font-medium text-sm mb-0.5">{opt.label}</div>
                    <div className="text-xs text-slate-400">{opt.desc}</div>
                  </label>
                ))}
              </div>
            </div>

            <Input
              label="Full name"
              placeholder="Alex Johnson"
              error={errors.name?.message}
              {...register('name', {
                required: 'Name is required',
                minLength: { value: 2, message: 'Name must be at least 2 characters' },
              })}
            />

            <Input
              label="Email address"
              type="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register('email', {
                required: 'Email is required',
                pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email address' },
              })}
            />

            <Input
              label="Password"
              type="password"
              placeholder="At least 6 characters"
              error={errors.password?.message}
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 6, message: 'Password must be at least 6 characters' },
              })}
            />

            <Button type="submit" loading={isSubmitting} className="w-full" size="lg">
              Create account
            </Button>

            <p className="text-xs text-center text-slate-500">
              By signing up, you agree to our Terms and Privacy Policy.
            </p>
          </form>
        </Card>

        <p className="text-center text-sm text-slate-400 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
