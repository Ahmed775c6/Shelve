'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  User, Mail, Lock, Camera, LogOut, 
  Save, X, Eye, EyeOff, UploadCloud,
  Trash2, Check, AlertCircle
} from 'lucide-react';

interface UserData {
  id: string;
  name: string;
  email: string;
  image?: string;
  provider: string;
  createdAt: string;
}

export default function SettingsPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password change state
  const [showPasswordSection, setShowPasswordSection] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }

    if (status === 'authenticated') {
      fetchUserData();
    }
  }, [status, router]);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/user/profile');
      if (res.ok) {
        const data = await res.json();
        setUserData(data);
        setName(data.name);
        if (data.image) {
          setAvatarPreview(data.image);
        }
      } else {
        setError('Failed to load user data');
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpdateProfile = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      let avatarUrl = userData?.image || '';
      
      // Upload new avatar if selected
      if (avatarFile) {
        setUploadingAvatar(true);
        const formData = new FormData();
        formData.append('file', avatarFile);

        const uploadRes = await fetch('/api/uploadthing', {
          method: 'POST',
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          avatarUrl = uploadData.fileUrl;
        } else {
          setError('Failed to upload avatar');
          setSaving(false);
          setUploadingAvatar(false);
          return;
        }
        setUploadingAvatar(false);
      }

      // Update profile
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          image: avatarUrl,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setUserData(updated);
        setSuccess('Profile updated successfully!');
        
        // Update session
        await update({
          ...session,
          user: {
            ...session?.user,
            name: updated.name,
            image: updated.image,
          },
        });
      } else {
        setError('Failed to update profile');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/user/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      if (res.ok) {
        setSuccess('Password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordSection(false);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to change password');
      }
    } catch (err) {
      console.error('Error changing password:', err);
      setError('Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      await signOut({ callbackUrl: '/auth/signin' });
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (status === 'loading' || loading) {
    return (
      <div className="page-shell flex items-center justify-center min-h-[400px]">
        <div className="text-[#9b9890]">Loading settings...</div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="page-shell text-center text-[#9b9890]">
        <p>Failed to load user data</p>
      </div>
    );
  }

  const isGoogleUser = userData.provider === 'google';
  const isGithubUser = userData.provider === 'github';

  return (
    <div className="page-shell max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-[#f0ede8] mb-2">Settings</h1>
        <p className="text-sm text-[#9b9890]">Manage your account settings and preferences</p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-4 p-4 bg-[rgba(74,158,107,0.1)] border border-[rgba(74,158,107,0.25)] rounded-lg flex items-center gap-3 text-sm text-[#4a9e6b]">
          <Check size={16} />
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 p-4 bg-[rgba(224,82,82,0.1)] border border-[rgba(224,82,82,0.25)] rounded-lg flex items-center gap-3 text-sm text-[#e05252]">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="grid gap-6">
        {/* Profile Section */}
        <div className="bg-[#1a1916] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6">
          <h2 className="text-lg font-serif text-[#f0ede8] mb-4">Profile</h2>
          
          <div className="space-y-4">
            {/* Avatar */}
            <div>
              <label className="block text-[11px] text-[#5c5a56] uppercase tracking-wider mb-1.5">
                Profile Picture
              </label>
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <div className="relative w-20 h-20 rounded-full overflow-hidden bg-[#0f0e0c] border border-[rgba(255,255,255,0.07)]">
                  {avatarPreview ? (
                    <img 
                      src={avatarPreview} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-gradient-to-br from-[#1e3a5f] to-[#2d5a8e]">
                      <User size={32} className="text-white/60" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleAvatarSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-1.5 bg-[#222119] border border-[rgba(255,255,255,0.07)] rounded-lg text-sm text-[#9b9890] hover:text-[#f0ede8] hover:border-[rgba(255,255,255,0.12)] transition-colors"
                    disabled={uploadingAvatar}
                  >
                    <UploadCloud size={14} />
                    {uploadingAvatar ? 'Uploading...' : 'Upload Photo'}
                  </button>
                  {avatarPreview && (
                    <button
                      onClick={handleRemoveAvatar}
                      className="flex items-center gap-2 px-3 py-1.5 bg-[rgba(224,82,82,0.1)] text-[#e05252] border border-[rgba(224,82,82,0.25)] rounded-lg text-sm hover:bg-[rgba(224,82,82,0.15)] transition-colors"
                    >
                      <Trash2 size={14} />
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-[11px] text-[#5c5a56] uppercase tracking-wider mb-1.5">
                Display Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full max-w-md bg-[#0f0e0c] border border-[rgba(255,255,255,0.07)] rounded-lg px-3 py-2 text-sm text-[#f0ede8] placeholder:text-[#5c5a56] focus:border-[#c9a96e] outline-none transition-colors"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-[11px] text-[#5c5a56] uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="flex items-center gap-2 w-full max-w-md">
                <div className="flex-1 bg-[#0f0e0c] border border-[rgba(255,255,255,0.07)] rounded-lg px-3 py-2 text-sm text-[#9b9890]">
                  {userData.email}
                </div>
                {isGoogleUser && (
                  <span className="text-xs bg-[rgba(201,169,110,0.1)] text-[#c9a96e] px-2 py-1 rounded-full">
                    Google
                  </span>
                )}
                {isGithubUser && (
                  <span className="text-xs bg-[rgba(201,169,110,0.1)] text-[#c9a96e] px-2 py-1 rounded-full">
                    GitHub
                  </span>
                )}
              </div>
              <p className="text-xs text-[#5c5a56] mt-1">
                Email cannot be changed
              </p>
            </div>

            {/* Account Info */}
            <div className="pt-4 border-t border-[rgba(255,255,255,0.07)]">
              <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                <div>
                  <span className="text-[#5c5a56]">Member since</span>
                  <p className="text-[#f0ede8]">{formatDate(userData.createdAt)}</p>
                </div>
                <div>
                  <span className="text-[#5c5a56]">Account type</span>
                  <p className="text-[#f0ede8] capitalize">{userData.provider}</p>
                </div>
              </div>
            </div>

            {/* Save Profile Button */}
            <div className="pt-4">
              <button
                onClick={handleUpdateProfile}
                disabled={saving || name === userData.name && !avatarFile}
                className="flex items-center gap-2 px-4 py-2 bg-[#c9a96e] text-[#1a1510] rounded-lg text-sm font-medium hover:bg-[#d4b47a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={16} />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>

        {/* Password Section (only for non-OAuth users) */}
        {!isGoogleUser && !isGithubUser && (
          <div className="bg-[#1a1916] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-serif text-[#f0ede8]">Password</h2>
              <button
                onClick={() => setShowPasswordSection(!showPasswordSection)}
                className="text-sm text-[#c9a96e] hover:text-[#d4b47a] transition-colors"
              >
                {showPasswordSection ? 'Hide' : 'Change Password'}
              </button>
            </div>

            {showPasswordSection && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] text-[#5c5a56] uppercase tracking-wider mb-1.5">
                    Current Password
                  </label>
                  <div className="relative max-w-md">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5c5a56]" />
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full bg-[#0f0e0c] border border-[rgba(255,255,255,0.07)] rounded-lg pl-10 pr-10 py-2 text-sm text-[#f0ede8] placeholder:text-[#5c5a56] focus:border-[#c9a96e] outline-none transition-colors"
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5c5a56] hover:text-[#9b9890] transition-colors"
                    >
                      {showCurrentPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-[#5c5a56] uppercase tracking-wider mb-1.5">
                    New Password
                  </label>
                  <div className="relative max-w-md">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5c5a56]" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-[#0f0e0c] border border-[rgba(255,255,255,0.07)] rounded-lg pl-10 pr-10 py-2 text-sm text-[#f0ede8] placeholder:text-[#5c5a56] focus:border-[#c9a96e] outline-none transition-colors"
                      placeholder="Enter new password (min 8 characters)"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5c5a56] hover:text-[#9b9890] transition-colors"
                    >
                      {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-[#5c5a56] uppercase tracking-wider mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative max-w-md">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5c5a56]" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-[#0f0e0c] border border-[rgba(255,255,255,0.07)] rounded-lg pl-10 pr-10 py-2 text-sm text-[#f0ede8] placeholder:text-[#5c5a56] focus:border-[#c9a96e] outline-none transition-colors"
                      placeholder="Re-enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5c5a56] hover:text-[#9b9890] transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleChangePassword}
                  disabled={saving || !currentPassword || !newPassword || !confirmPassword}
                  className="flex items-center gap-2 px-4 py-2 bg-[#c9a96e] text-[#1a1510] rounded-lg text-sm font-medium hover:bg-[#d4b47a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save size={16} />
                  {saving ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Danger Zone */}
        <div className="bg-[#1a1916] border border-[rgba(224,82,82,0.15)] rounded-2xl p-6">
          <h2 className="text-lg font-serif text-[#e05252] mb-4">Danger Zone</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#f0ede8]">Logout</p>
                <p className="text-xs text-[#5c5a56]">Sign out of your account</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-[rgba(224,82,82,0.1)] text-[#e05252] border border-[rgba(224,82,82,0.25)] rounded-lg text-sm hover:bg-[rgba(224,82,82,0.15)] transition-colors"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}