import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { authAPI } from '../services/api';
import { Button, Input, Card } from '../components/ui';

const ForgotPasswordPage = () => {
  const [submitted, setSubmitted] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  const onSubmit = async ({ email }) => {
    try {
      const res = await authAPI.forgotPassword(email);
      setSubmitted(true);
      if (res.data.resetUrl) {
        toast.info('Dev mode: check console for reset link', { autoClose: 5000 });
        console.log('Reset URL:', res.data.resetUrl);
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">📧</div>
          <h2 className="text-2xl font-display font-bold mb-3">Check your email</h2>
          <p className="text-slate-400 mb-6">
            If that email address is registered, you'll receive a password reset link shortly.
          </p>
          <Link to="/login" className="text-primary-400 hover:text-primary-300 transition-colors font-medium">
            ← Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-display font-bold">Forgot your password?</h1>
          <p className="text-slate-400 mt-2">Enter your email and we'll send a reset link.</p>
        </div>
        <Card>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email' } })}
            />
            <Button type="submit" loading={isSubmitting} className="w-full">
              Send reset link
            </Button>
          </form>
        </Card>
        <p className="text-center text-sm text-slate-400 mt-6">
          <Link to="/login" className="text-primary-400 hover:text-primary-300 transition-colors">
            ← Back to login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
