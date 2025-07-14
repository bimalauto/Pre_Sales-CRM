import React, { useState } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../firebase/config';

interface ResetPasswordFormProps {
  onBackToLogin?: () => void;
}

const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({ onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { showMessage } = useNotification();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
      showMessage('Password reset email sent!', 'success');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
      showMessage(err.message || 'Failed to send reset email', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow border border-gray-200 mt-8">
      <h2 className="text-2xl font-bold text-blue-900 mb-4 text-center">Reset Password</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            name="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your email"
          />
        </div>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        {success && <div className="text-green-600 text-sm mb-2">Password reset email sent! Check your inbox.</div>}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Sending...' : 'Send Reset Email'}
        </button>
        <button
          type="button"
          onClick={onBackToLogin}
          className="w-full mt-3 text-sm text-indigo-600 hover:underline focus:outline-none"
        >
          Back to login
        </button>
      </form>
    </div>
  );
};

export default ResetPasswordForm;
