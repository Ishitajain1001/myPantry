import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateUserPreferences, updateUserProfile, uploadProfilePicture } from '../services/api';

const dietaryOptions = [
  'vegetarian',
  'vegan',
  'gluten-free',
  'dairy-free',
  'keto',
  'paleo',
  'low-carb',
  'nut-free',
  'pescatarian',
];

const commonAllergies = [
  'peanuts',
  'tree nuts',
  'dairy',
  'eggs',
  'soy',
  'wheat',
  'fish',
  'shellfish',
  'sesame',
];

const AccountSettings = () => {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [customAllergy, setCustomAllergy] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setAge(user.age || '');
      setProfilePicture(user.profilePicture || null);
      setDietaryPreferences(user.dietaryPreferences || []);
      setAllergies(user.allergies || []);
    }
  }, [user]);

  const getInitials = (name: string, email: string) => {
    if (name) {
      const parts = name.trim().split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return name[0]?.toUpperCase() || '';
    }
    return email[0]?.toUpperCase() || '?';
  };

  const handleProfilePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      // Convert to base64 for now (in production, upload to cloud storage)
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        try {
          await uploadProfilePicture(base64String);
          setProfilePicture(base64String);
          await refreshUser();
          alert('Profile picture updated successfully!');
        } catch (error) {
          console.error('Failed to upload profile picture:', error);
          alert('Failed to upload profile picture');
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error reading file:', error);
      setUploading(false);
    }
  };

  const toggleDietaryPreference = (pref: string) => {
    setDietaryPreferences(prev =>
      prev.includes(pref)
        ? prev.filter(p => p !== pref)
        : [...prev, pref]
    );
  };

  const toggleAllergy = (allergy: string) => {
    setAllergies(prev =>
      prev.includes(allergy)
        ? prev.filter(a => a !== allergy)
        : [...prev, allergy]
    );
  };

  const addCustomAllergy = () => {
    if (customAllergy.trim() && !allergies.includes(customAllergy.trim().toLowerCase())) {
      setAllergies(prev => [...prev, customAllergy.trim().toLowerCase()]);
      setCustomAllergy('');
    }
  };

  const removeAllergy = (allergy: string) => {
    setAllergies(prev => prev.filter(a => a !== allergy));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateUserProfile({
        name,
        age: age === '' ? undefined : Number(age),
      });
      await updateUserPreferences(user?.id || '', dietaryPreferences, allergies);
      await refreshUser();
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Account Settings</h1>

        {/* Profile Picture */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Profile Picture</h2>
          <div className="flex items-center gap-6">
            <div className="relative">
              {profilePicture ? (
                <img
                  src={profilePicture}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover border-4 border-primary-200"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-primary-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-primary-200">
                  {getInitials(name, email)}
                </div>
              )}
            </div>
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleProfilePictureChange}
                accept="image/*"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Change Picture'}
              </button>
              {profilePicture && (
                <button
                  onClick={async () => {
                    try {
                      await uploadProfilePicture('');
                      setProfilePicture(null);
                      await refreshUser();
                      alert('Profile picture removed successfully!');
                    } catch (error) {
                      console.error('Failed to remove profile picture:', error);
                      alert('Failed to remove profile picture');
                    }
                  }}
                  className="ml-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Personal Information */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Personal Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value === '' ? '' : parseInt(e.target.value) || '')}
                min="1"
                max="120"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Your age"
              />
            </div>
          </div>
        </section>

        {/* Dietary Preferences */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Dietary Preferences</h2>
          <p className="text-gray-600 mb-4">
            Select your dietary preferences to get personalized recipe suggestions.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {dietaryOptions.map(option => (
              <button
                key={option}
                onClick={() => toggleDietaryPreference(option)}
                className={`px-4 py-3 rounded-lg border-2 transition-all ${
                  dietaryPreferences.includes(option)
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400'
                }`}
              >
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </button>
            ))}
          </div>
        </section>

        {/* Allergies */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Allergies</h2>
          <p className="text-gray-600 mb-4">
            Select any allergies to filter out recipes containing those ingredients.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            {commonAllergies.map(allergy => (
              <button
                key={allergy}
                onClick={() => toggleAllergy(allergy)}
                className={`px-4 py-3 rounded-lg border-2 transition-all ${
                  allergies.includes(allergy)
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-red-400'
                }`}
              >
                {allergy.charAt(0).toUpperCase() + allergy.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={customAllergy}
              onChange={(e) => setCustomAllergy(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addCustomAllergy()}
              placeholder="Add custom allergy..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              onClick={addCustomAllergy}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Add
            </button>
          </div>

          {allergies.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {allergies.map(allergy => (
                <span
                  key={allergy}
                  className="px-3 py-1 bg-red-100 text-red-800 rounded-full flex items-center gap-2"
                >
                  {allergy}
                  <button
                    onClick={() => removeAllergy(allergy)}
                    className="text-red-600 hover:text-red-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </section>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full md:w-auto px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

export default AccountSettings;

