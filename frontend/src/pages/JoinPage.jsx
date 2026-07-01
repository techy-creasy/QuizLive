import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { roomAPI } from '../services/api';
import { Button, Input, Card } from '../components/ui';

const JoinPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultCode = searchParams.get('code') || '';

  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue } = useForm({
    defaultValues: { roomCode: defaultCode },
  });

  useEffect(() => {
    if (defaultCode) setValue('roomCode', defaultCode.toUpperCase());
  }, [defaultCode]);

  const onSubmit = async ({ roomCode }) => {
    try {
      const res = await roomAPI.join(roomCode.toUpperCase().trim());
      const room = res.data.room;
      toast.success(`Joined "${room.quiz?.title || 'Quiz'}"!`);
      navigate(`/room/${room.roomCode}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not join that room. Check the code and try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎮</div>
          <h1 className="text-3xl font-display font-bold">Join a Quiz</h1>
          <p className="text-slate-400 mt-2">Enter the room code from your host to get started.</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Room Code</label>
              <input
                className="input-field text-center text-3xl font-display font-bold tracking-[0.3em] uppercase"
                placeholder="ABC123"
                maxLength={6}
                error={errors.roomCode?.message}
                {...register('roomCode', {
                  required: 'Room code is required',
                  minLength: { value: 6, message: 'Room code must be 6 characters' },
                  maxLength: { value: 6, message: 'Room code must be 6 characters' },
                  onChange: (e) => {
                    e.target.value = e.target.value.toUpperCase();
                  },
                })}
              />
              {errors.roomCode && (
                <p className="mt-1 text-sm text-red-400">{errors.roomCode.message}</p>
              )}
            </div>

            <Button type="submit" loading={isSubmitting} className="w-full" size="lg">
              Join Quiz →
            </Button>
          </form>
        </Card>

        <p className="text-center text-slate-500 text-sm mt-6">
          Want to host a quiz instead?{' '}
          <a href="/register?role=host" className="text-primary-400 hover:text-primary-300 transition-colors">
            Create an account
          </a>
        </p>
      </div>
    </div>
  );
};

export default JoinPage;
