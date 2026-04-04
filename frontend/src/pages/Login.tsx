import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import { FiUser, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import { authService } from '../services/authService';
import { useAuthStore } from '../stores/useAuthStore';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const formik = useFormik({
    initialValues: { identifier: '', password: '' },
    validationSchema: Yup.object({
      identifier: Yup.string().required('Username or phone required'),
      password: Yup.string().min(6, 'At least 6 characters').required('Password required'),
    }),
    onSubmit: async (values) => {
      setIsLoading(true);
      try {
        const data = await authService.login(values);
        login(data.token, data.user);
        toast.success(`Welcome back, ${data.user.displayName || data.user.username}! 🌟`);
        if (!data.user.profileSetupComplete) {
          navigate('/profile-setup');
        } else {
          navigate('/dashboard');
        }
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Login failed');
      } finally {
        setIsLoading(false);
      }
    },
  });

  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center p-4">
      {/* Ambient blobs */}
      <div className="fixed top-[-150px] left-[-100px] w-[500px] h-[500px] rounded-full bg-cyan-500/8 blur-3xl pointer-events-none" />
      <div className="fixed bottom-[-100px] right-[-100px] w-[400px] h-[400px] rounded-full bg-purple-600/8 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md animate-slide-up">
        {/* Branding */}
        <div className="text-center mb-8">
          <img src="/kurakani.png" alt="Kurakani Logo" className="w-16 h-16 rounded-2xl object-contain mb-4 shadow-glow inline-block" />
          <h1 className="text-3xl font-black gradient-text">Kurakani</h1>
          <p className="text-gray-400 mt-2 text-sm">Sign in to continue messaging</p>
        </div>

        {/* Card */}
        <div className="glass-card rounded-3xl p-8">
          <form onSubmit={formik.handleSubmit} className="space-y-5">
            {/* Identifier */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Username or Phone
              </label>
              <div className="relative">
                <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input
                  id="login-identifier"
                  type="text"
                  {...formik.getFieldProps('identifier')}
                  className="input-field pl-10"
                  placeholder="your_username or +1234567890"
                  autoComplete="username"
                  autoFocus
                />
              </div>
              {formik.touched.identifier && formik.errors.identifier && (
                <p className="text-red-400 text-xs mt-1">{formik.errors.identifier}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <div className="relative">
                <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  {...formik.getFieldProps('password')}
                  className="input-field pl-10 pr-10"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
              {formik.touched.password && formik.errors.password && (
                <p className="text-red-400 text-xs mt-1">{formik.errors.password}</p>
              )}
            </div>

            {/* Submit */}
            <button
              id="login-submit-btn"
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full mt-2"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-white/5" />
            <span className="text-xs text-gray-600">or</span>
            <div className="flex-1 h-px bg-white/5" />
          </div>

          <p className="text-center text-gray-400 text-sm">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="text-cyan-400 font-semibold hover:text-cyan-300 transition-colors"
            >
              Create one
            </Link>
          </p>
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          {[
            { emoji: '💬', label: 'Real-time chat' },
            { emoji: '📞', label: 'Voice calls' },
            { emoji: '🎥', label: 'Video calls' },
          ].map((f) => (
            <div key={f.label} className="glass rounded-xl p-3 text-center">
              <div className="text-lg mb-1">{f.emoji}</div>
              <p className="text-xs text-gray-400">{f.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Login;
