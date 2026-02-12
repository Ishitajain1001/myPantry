import { useState, useEffect } from 'react';
import { updateUserPreferences } from '../services/api';

interface ProfileProps {
  userId: string;
  user: any;
  onUpdate: () => void;
}

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

const Profile = ({ userId, user, onUpdate }: ProfileProps) => {
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [customAllergy, setCustomAllergy] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setDietaryPreferences(user.dietaryPreferences || []);
      setAllergies(user.allergies || []);
    }
  }, [user]);

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
      await updateUserPreferences(userId, dietaryPreferences, allergies);
      onUpdate();
      alert('Preferences saved successfully!');
    } catch (error) {
      console.error('Failed to save preferences:', error);
      alert('Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">My Profile</h1>

        {/* Dietary Preferences */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">
            Dietary Preferences
          </h2>
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
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">
            Allergies
          </h2>
          <p className="text-gray-600 mb-4">
            Select any allergies to filter out recipes containing those ingredients.
          </p>

          {/* Common Allergies */}
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

          {/* Custom Allergy Input */}
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

          {/* Selected Allergies */}
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
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
};

export default Profile;

