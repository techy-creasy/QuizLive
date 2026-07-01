import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { Button, Input, Card, Avatar, Badge } from '../components/ui';

const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { name: user?.name || '' },
  });

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      const res = await authAPI.updateProfile(data);
      updateUser(res.data.user);
      toast.success('Profile updated!');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-display font-bold mb-8">Profile</h1>

      <div className="flex items-center gap-5 mb-8">
        <Avatar src={user?.avatar} name={user?.name} size="lg" className="!h-20 !w-20" />
        <div>
          <h2 className="text-xl font-display font-semibold">{user?.name}</h2>
          <p className="text-slate-400 text-sm">{user?.email}</p>
          <Badge color={user?.role === 'host' ? 'blue' : 'green'} className="mt-2">
            {user?.role === 'host' ? '🎯 Host' : '🎮 Participant'}
          </Badge>
        </div>
      </div>

      <Card className="mb-6">
        <h3 className="font-display font-semibold mb-4">Edit Profile</h3>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Display name"
            placeholder="Your name"
            error={errors.name?.message}
            {...register('name', {
              required: 'Name is required',
              minLength: { value: 2, message: 'Name must be at least 2 characters' },
            })}
          />
          <div>
            <label className="label">Email</label>
            <input
              className="input-field opacity-60 cursor-not-allowed"
              value={user?.email}
              disabled
            />
            <p className="text-xs text-slate-500 mt-1">Email cannot be changed.</p>
          </div>
          <Button type="submit" loading={saving}>Save Changes</Button>
        </form>
      </Card>

      <Card>
        <h3 className="font-display font-semibold mb-2">Account Info</h3>
        <div className="space-y-2 text-sm text-slate-400">
          <div className="flex justify-between">
            <span>Role</span>
            <span className="text-slate-200 capitalize">{user?.role}</span>
          </div>
          <div className="flex justify-between">
            <span>Member since</span>
            <span className="text-slate-200">{new Date(user?.createdAt || Date.now()).toLocaleDateString()}</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ProfilePage;
