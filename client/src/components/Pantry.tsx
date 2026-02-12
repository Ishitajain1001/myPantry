import { useState, useEffect } from 'react';
import { getPantry, addToPantry, removeFromPantry, getAllIngredients } from '../services/api';

interface PantryProps {
  userId: string;
  user: any;
}

interface Ingredient {
  name: string;
  category: string;
}

const Pantry = ({ userId, user }: PantryProps) => {
  const [pantry, setPantry] = useState<Ingredient[]>([]);
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pantryData, ingredientsData] = await Promise.all([
        getPantry(userId),
        getAllIngredients(),
      ]);
      setPantry(pantryData.pantry);
      setAllIngredients(ingredientsData.ingredients);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToPantry = async (ingredientName: string) => {
    if (pantry.some(item => item.name === ingredientName)) {
      return; // Already in pantry
    }

    setAdding(true);
    try {
      const data = await addToPantry(userId, [ingredientName]);
      setPantry(data.pantry);
    } catch (error) {
      console.error('Failed to add to pantry:', error);
      alert('Failed to add item to pantry');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveFromPantry = async (ingredientName: string) => {
    setAdding(true);
    try {
      const data = await removeFromPantry(userId, [ingredientName]);
      setPantry(data.pantry);
    } catch (error) {
      console.error('Failed to remove from pantry:', error);
      alert('Failed to remove item from pantry');
    } finally {
      setAdding(false);
    }
  };

  const filteredIngredients = allIngredients.filter(ingredient =>
    ingredient.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !pantry.some(item => item.name === ingredient.name)
  );

  const groupedPantry = pantry.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, Ingredient[]>);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">My Pantry</h1>

      {/* Current Pantry */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">
          Current Pantry Items ({pantry.length})
        </h2>
        {pantry.length === 0 ? (
          <p className="text-gray-500">Your pantry is empty. Add some ingredients below!</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedPantry).map(([category, items]) => (
              <div key={category}>
                <h3 className="text-lg font-medium text-gray-600 mb-2">{category}</h3>
                <div className="flex flex-wrap gap-2">
                  {items.map(item => (
                    <span
                      key={item.name}
                      className="px-4 py-2 bg-primary-100 text-primary-800 rounded-full flex items-center gap-2"
                    >
                      {item.name}
                      <button
                        onClick={() => handleRemoveFromPantry(item.name)}
                        className="text-primary-600 hover:text-primary-800 font-bold"
                        disabled={adding}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Ingredients */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">
          Add Ingredients to Pantry
        </h2>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search for ingredients..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 mb-4"
        />

        {filteredIngredients.length === 0 ? (
          <p className="text-gray-500">
            {searchTerm ? 'No ingredients found matching your search.' : 'All ingredients are already in your pantry!'}
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredIngredients.map(ingredient => (
              <button
                key={ingredient.name}
                onClick={() => handleAddToPantry(ingredient.name)}
                disabled={adding}
                className="px-4 py-3 bg-white border-2 border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all text-left disabled:opacity-50"
              >
                <div className="font-medium text-gray-700">{ingredient.name}</div>
                <div className="text-sm text-gray-500">{ingredient.category}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Pantry;

