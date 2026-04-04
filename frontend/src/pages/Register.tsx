import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import { FiUser, FiLock, FiEye, FiEyeOff, FiPhone } from 'react-icons/fi';
import { authService } from '../services/authService';
import { useAuthStore } from '../stores/useAuthStore';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const formik = useFormik({
    initialValues: { username: '', phone: '', password: '', confirmPassword: '' },
    validationSchema: Yup.object({
      username: Yup.string()
        .min(3, 'At least 3 characters')
        .max(30, 'Max 30 characters')
        .matches(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, underscores')
        .required('Username is required'),
      phone: Yup.string()
        .matches(/^\+?[\d\s\-()]{7,15}$/, 'Invalid phone number')
        .optional(),
      password: Yup.string()
        .min(6, 'At least 6 characters')
        .required('Password is required'),
      confirmPassword: Yup.string()
        .oneOf([Yup.ref('password')], 'Passwords must match')
        .required('Please confirm password'),
    }),
    onSubmit: async (values) => {
      setIsLoading(true);
      try {
        const data = await authService.register({
          username: values.username,
          phone: values.phone || undefined,
          password: values.password,
        });
        login(data.token, data.user);
        toast.success('Account created! Set up your profile 🎉');
        navigate('/profile-setup');
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Registration failed');
      } finally {
        setIsLoading(false);
      }
    },
  });

  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center p-4">
      {/* Ambient blobs */}
      <div className="fixed top-[-100px] right-[-100px] w-[500px] h-[500px] rounded-full bg-purple-600/10 blur-3xl pointer-events-none" />
      <div className="fixed bottom-[-100px] left-[-100px] w-[400px] h-[400px] rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/kurakani.png" alt="Kurakani Logo" className="w-16 h-16 rounded-2xl object-contain mb-4 shadow-glow inline-block" />
          <h1 className="text-3xl font-black gradient-text">Join Kurakani</h1>
          <p className="text-gray-400 mt-2 text-sm">Create your account and start chatting</p>
        </div>

        {/* Card */}
        <div className="glass-card rounded-3xl p-8">
          <form onSubmit={formik.handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Username <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input
                  id="register-username"
                  type="text"
                  {...formik.getFieldProps('username')}
                  className="input-field pl-10"
                  placeholder="your_username"
                  autoComplete="username"
                />
              </div>
              {formik.touched.username && formik.errors.username && (
                <p className="text-red-400 text-xs mt-1">{formik.errors.username}</p>
              )}
            </div>

            {/* Phone (optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Phone Number <span className="text-gray-500 text-xs">(optional)</span>
              </label>
              <div className="relative">
                <FiPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input
                  id="register-phone"
                  type="tel"
                  {...formik.getFieldProps('phone')}
                  className="input-field pl-10"
                  placeholder="+1 234 567 8900"
                  autoComplete="tel"
                />
              </div>
              {formik.touched.phone && formik.errors.phone && (
                <p className="text-red-400 text-xs mt-1">{formik.errors.phone}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  {...formik.getFieldProps('password')}
                  className="input-field pl-10 pr-10"
                  placeholder="Min 6 characters"
                  autoComplete="new-password"
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

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Confirm Password <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input
                  id="register-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  {...formik.getFieldProps('confirmPassword')}
                  className="input-field pl-10"
                  placeholder="Repeat password"
                  autoComplete="new-password"
                />
              </div>
              {formik.touched.confirmPassword && formik.errors.confirmPassword && (
                <p className="text-red-400 text-xs mt-1">{formik.errors.confirmPassword}</p>
              )}
            </div>

            {/* Submit */}
            <button
              id="register-submit-btn"
              type="submit"
              disabled={isLoading || !formik.isValid}
              className="btn-primary w-full mt-2"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating account...
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <p className="text-center text-gray-400 text-sm mt-6">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-cyan-400 font-semibold hover:text-cyan-300 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
