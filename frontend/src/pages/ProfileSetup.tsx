import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import { FiCamera, FiUser, FiEdit3, FiArrowRight } from 'react-icons/fi';
import { userService } from '../services/userService';
import { useAuthStore } from '../stores/useAuthStore';

const ProfileSetup: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();
  const [previewUrl, setPreviewUrl] = useState<string>(user?.profilePic || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formik = useFormik({
    initialValues: {
      displayName: user?.displayName || user?.username || '',
      status: user?.status || 'Hey there! I am using Kurakani.',
      bio: user?.bio || '',
    },
    validationSchema: Yup.object({
      displayName: Yup.string()
        .min(1, 'Display name is required')
        .max(50, 'Max 50 characters')
        .required('Display name required'),
      status: Yup.string().max(140, 'Max 140 characters'),
      bio: Yup.string().max(250, 'Max 250 characters'),
    }),
    onSubmit: async (values) => {
      setIsLoading(true);
      try {
        const formData = new FormData();
        formData.append('displayName', values.displayName);
        formData.append('status', values.status);
        formData.append('bio', values.bio);
        if (selectedFile) {
          formData.append('profilePic', selectedFile);
        }

        const data = await userService.updateProfile(formData);
        updateUser(data.user);
        toast.success('Profile set up! Welcome to Kurakani 🌟');
        navigate('/dashboard');
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to save profile');
      } finally {
        setIsLoading(false);
      }
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const initials = (formik.values.displayName || user?.username || 'U')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center p-4">
      {/* Blobs */}
      <div className="fixed top-0 right-0 w-96 h-96 rounded-full bg-cyan-500/6 blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-96 h-96 rounded-full bg-purple-600/6 blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg animate-slide-up">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-purple-600 mb-4">
            <span className="text-xl font-black text-white">A</span>
          </div>
          <h1 className="text-2xl font-black text-white">Set Up Your Profile</h1>
          <p className="text-gray-400 text-sm mt-1">Let people know who you are</p>
        </div>

        <div className="glass-card rounded-3xl p-8">
          <form onSubmit={formik.handleSubmit} className="space-y-6">
            {/* Avatar upload */}
            <div className="flex flex-col items-center gap-3">
              <div
                className="relative w-28 h-28 cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
              >
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Profile preview"
                    className="w-28 h-28 rounded-full object-cover ring-2 ring-cyan-500/40"
                  />
                ) : (
                  <div className="w-28 h-28 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-3xl font-bold text-white ring-2 ring-cyan-500/40">
                    {initials}
                  </div>
                )}
                {/* Overlay */}
                <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <FiCamera size={22} className="text-white" />
                </div>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors font-medium flex items-center gap-1"
              >
                <FiCamera size={14} />
                {previewUrl ? 'Change photo' : 'Upload photo'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="profile-pic-input"
              />
            </div>

            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Display Name <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input
                  id="display-name-input"
                  type="text"
                  {...formik.getFieldProps('displayName')}
                  className="input-field pl-10"
                  placeholder="How should others see you?"
                />
              </div>
              {formik.touched.displayName && formik.errors.displayName && (
                <p className="text-red-400 text-xs mt-1">{formik.errors.displayName}</p>
              )}
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Status
                <span className="text-gray-500 text-xs ml-2">
                  ({formik.values.status.length}/140)
                </span>
              </label>
              <div className="relative">
                <FiEdit3 className="absolute left-3.5 top-3.5 text-gray-500" size={16} />
                <input
                  id="status-input"
                  type="text"
                  {...formik.getFieldProps('status')}
                  className="input-field pl-10"
                  placeholder="Your status message..."
                />
              </div>
              {formik.touched.status && formik.errors.status && (
                <p className="text-red-400 text-xs mt-1">{formik.errors.status}</p>
              )}
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Bio
                <span className="text-gray-500 text-xs ml-2">
                  ({formik.values.bio.length}/250)
                </span>
              </label>
              <textarea
                id="bio-input"
                {...formik.getFieldProps('bio')}
                rows={3}
                className="input-field resize-none"
                placeholder="Tell people a little about yourself..."
              />
              {formik.touched.bio && formik.errors.bio && (
                <p className="text-red-400 text-xs mt-1">{formik.errors.bio}</p>
              )}
            </div>

            {/* Submit */}
            <button
              id="profile-setup-submit-btn"
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </span>
              ) : (
                <>
                  Continue to Dashboard
                  <FiArrowRight size={16} />
                </>
              )}
            </button>

            {/* Skip */}
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="w-full text-center text-sm text-gray-500 hover:text-gray-400 transition-colors"
            >
              Skip for now
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetup;
