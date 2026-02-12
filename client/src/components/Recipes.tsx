import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getPantry, getRecipeSuggestions, likeRecipe, unlikeRecipe, createRecipe, getAllIngredients, fetchWebRecipes, getWebCategories } from '../services/api';

interface RecipesProps {
  userId: string;
  user: any;
}

interface Recipe {
  id: string;
  name: string;
  description: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: string;
  dietaryTags: string[];
  matchingIngredients: number;
  totalIngredients: number;
  matchRatio: number;
  allIngredients: string[];
  isLiked?: boolean;
  sourceUrl?: string | null;
  imageUrl?: string | null;
}

const Recipes = ({ userId, user }: RecipesProps) => {
  const { user: authUser } = useAuth(); // Get user from auth context as backup
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [pantryItems, setPantryItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showFetchWebForm, setShowFetchWebForm] = useState(false);
  const [availableIngredients, setAvailableIngredients] = useState<string[]>([]);
  const [webCategories, setWebCategories] = useState<string[]>([]);

  // Use authUser if userId prop is empty
  const effectiveUserId = userId || authUser?.id || '';
  const effectiveUser = user || authUser;

  // Organize recipes into categories
  const favoriteRecipes = recipes.filter(recipe => recipe.isLiked);
  const recommendedRecipes = recipes.filter(recipe => !recipe.isLiked && recipe.matchRatio >= 0.5);
  const allRecipes = recipes.filter(recipe => !recipe.isLiked && recipe.matchRatio < 0.5);

  useEffect(() => {
    if (effectiveUserId) {
      console.log('Recipes component: Loading with userId:', effectiveUserId);
      loadPantryAndSuggestions();
      loadAvailableIngredients();
    } else {
      console.log('Recipes component: No userId available');
      setError('Please log in to view recipes');
    }
  }, [effectiveUserId]);

  const loadAvailableIngredients = async () => {
    try {
      const data = await getAllIngredients();
      const ingredients = (data?.ingredients || []).map((ing: any) => ing.name).filter(Boolean);
      setAvailableIngredients(ingredients);
    } catch (error) {
      console.error('Failed to load ingredients:', error);
    }
  };

  const loadWebCategories = async () => {
    try {
      const data = await getWebCategories();
      setWebCategories(data?.categories || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadPantryAndSuggestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const pantryData = await getPantry(effectiveUserId);
      const items = (pantryData?.pantry || []).map((item: any) => item?.name).filter(Boolean);
      setPantryItems(items);

      if (items.length > 0) {
        const suggestionsData = await getRecipeSuggestions(effectiveUserId, items);
        const recipes = suggestionsData?.recipes || [];
        // Ensure all recipes have required fields
        const safeRecipes = recipes.map((recipe: any) => ({
          ...recipe,
          dietaryTags: Array.isArray(recipe.dietaryTags) ? recipe.dietaryTags : [],
          allIngredients: Array.isArray(recipe.allIngredients) ? recipe.allIngredients : [],
          matchRatio: typeof recipe.matchRatio === 'number' ? recipe.matchRatio : Number(recipe.matchRatio) || 0,
          matchingIngredients: typeof recipe.matchingIngredients === 'number' ? recipe.matchingIngredients : Number(recipe.matchingIngredients) || 0,
          totalIngredients: typeof recipe.totalIngredients === 'number' ? recipe.totalIngredients : Number(recipe.totalIngredients) || 0,
          prepTime: typeof recipe.prepTime === 'number' ? recipe.prepTime : Number(recipe.prepTime) || 0,
          cookTime: typeof recipe.cookTime === 'number' ? recipe.cookTime : Number(recipe.cookTime) || 0,
          servings: typeof recipe.servings === 'number' ? recipe.servings : Number(recipe.servings) || 0,
          isLiked: recipe.isLiked || false,
        }));
        setRecipes(safeRecipes);
      } else {
        setRecipes([]);
      }
    } catch (error: any) {
      console.error('Failed to load recipes:', error);
      console.error('Error details:', {
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message
      });
      const errorMessage = error?.response?.data?.error || error?.response?.data?.details || error?.message || 'Failed to load recipes. Please check your connection and try again.';
      setError(errorMessage);
      setRecipes([]); // Clear recipes on error
    } finally {
      setLoading(false);
    }
  };

  const getMatchPercentage = (recipe: Recipe) => {
    if (!recipe.matchRatio) return 0;
    return Math.round(recipe.matchRatio * 100);
  };

  const getMissingIngredients = (recipe: Recipe) => {
    return recipe.allIngredients.filter(
      ing => !pantryItems.includes(ing)
    );
  };

  // Recipe Card Component for horizontal scrolling
  const RecipeCard = ({
    recipe,
    onLike,
    onSelect,
    getMatchPercentage
  }: {
    recipe: Recipe;
    onLike: (id: string, isLiked: boolean) => void;
    onSelect: (recipe: Recipe) => void;
    getMatchPercentage: (recipe: Recipe) => number;
  }) => (
    <div
      className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer flex-shrink-0 w-80"
      onClick={() => onSelect(recipe)}
    >
      <div className="p-6">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-xl font-bold text-gray-800 line-clamp-2">{recipe.name}</h3>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLike(recipe.id, recipe.isLiked || false);
            }}
            className={`p-2 rounded-full transition-colors flex-shrink-0 ${
              recipe.isLiked
                ? 'text-red-500 hover:bg-red-50'
                : 'text-gray-400 hover:bg-gray-100'
            }`}
            title={recipe.isLiked ? 'Unlike recipe' : 'Like recipe'}
          >
            <svg
              className="w-5 h-5"
              fill={recipe.isLiked ? 'currentColor' : 'none'}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </button>
        </div>

        <div className="mb-3">
          <span className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm font-semibold">
            {getMatchPercentage(recipe)}% match
          </span>
        </div>

        <p className="text-gray-600 mb-4 line-clamp-2 text-sm">{recipe.description || 'No description available'}</p>

        <div className="flex flex-wrap gap-2 mb-4">
          {(recipe.dietaryTags || []).slice(0, 3).map(tag => (
            <span
              key={tag}
              className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs"
            >
              {tag}
            </span>
          ))}
          {(recipe.dietaryTags || []).length > 3 && (
            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
              +{(recipe.dietaryTags || []).length - 3}
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 text-sm text-gray-600 mb-4">
          <div>
            <div className="font-semibold">Prep</div>
            <div>{recipe.prepTime || 0} min</div>
          </div>
          <div>
            <div className="font-semibold">Cook</div>
            <div>{recipe.cookTime || 0} min</div>
          </div>
          <div>
            <div className="font-semibold">Serves</div>
            <div>{recipe.servings || 0}</div>
          </div>
        </div>

        <div className="text-sm text-gray-500">
          {recipe.matchingIngredients || 0} of {recipe.totalIngredients || 0} ingredients in pantry
        </div>
      </div>
    </div>
  );

  const handleLike = async (recipeId: string, isLiked: boolean) => {
    try {
      // Check if token exists
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please log in to like recipes');
        return;
      }

      if (isLiked) {
        await unlikeRecipe(recipeId);
      } else {
        await likeRecipe(recipeId);
      }
      // Update the recipe in the list
      setRecipes(prevRecipes =>
        prevRecipes.map(recipe =>
          recipe.id === recipeId ? { ...recipe, isLiked: !isLiked } : recipe
        )
      );
      // Update selected recipe if it's the one being liked
      if (selectedRecipe?.id === recipeId) {
        setSelectedRecipe({ ...selectedRecipe, isLiked: !isLiked });
      }
    } catch (error: any) {
      console.error('Failed to toggle like:', error);

      // Don't log out on like errors - just show a message
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to update like';
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        // Token might be expired
        alert('Your session may have expired. Please try refreshing the page or log in again.');
      } else {
        alert(errorMessage);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl text-gray-600">Loading recipe suggestions...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto relative">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Recipe Suggestions</h1>
        <button
          onClick={() => {
            setShowFetchWebForm(true);
            loadWebCategories();
          }}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
          Fetch Web Recipes
        </button>
      </div>

      {/* Floating Add Recipe Button */}
      <button
        onClick={() => setShowCreateForm(true)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 transition-all hover:scale-110 flex items-center justify-center z-40"
        title="Add New Recipe"
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800 font-semibold">Error: {error}</p>
          <button
            onClick={loadPantryAndSuggestions}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {pantryItems.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <p className="text-yellow-800">
            Your pantry is empty! Add some ingredients to your pantry to get recipe suggestions.
          </p>
        </div>
      ) : recipes.length === 0 ? (
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <p className="text-gray-600 text-lg">
            No recipes found matching your pantry items and dietary preferences.
          </p>
          <p className="text-gray-500 mt-2">
            Try adding more ingredients to your pantry!
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* My Favorites Section */}
          {favoriteRecipes.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                My Favorites
              </h2>
              <div className="overflow-x-auto pb-4 -mx-4 px-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                <div className="flex gap-4 min-w-max">
                  {favoriteRecipes.map(recipe => (
                    <RecipeCard
                      key={recipe.id}
                      recipe={recipe}
                      onLike={handleLike}
                      onSelect={setSelectedRecipe}
                      getMatchPercentage={getMatchPercentage}
                    />
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Recommended Section */}
          {recommendedRecipes.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Recommended for You
              </h2>
              <div className="overflow-x-auto pb-4 -mx-4 px-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                <div className="flex gap-4 min-w-max">
                  {recommendedRecipes.map(recipe => (
                    <RecipeCard
                      key={recipe.id}
                      recipe={recipe}
                      onLike={handleLike}
                      onSelect={setSelectedRecipe}
                      getMatchPercentage={getMatchPercentage}
                    />
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* All Recipes Section */}
          {allRecipes.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">All Recipes</h2>
              <div className="overflow-x-auto pb-4 -mx-4 px-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                <div className="flex gap-4 min-w-max">
                  {allRecipes.map(recipe => (
                    <RecipeCard
                      key={recipe.id}
                      recipe={recipe}
                      onLike={handleLike}
                      onSelect={setSelectedRecipe}
                      getMatchPercentage={getMatchPercentage}
                    />
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      {/* Create Recipe Modal */}
      {showCreateForm && (
        <CreateRecipeModal
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => {
            setShowCreateForm(false);
            loadPantryAndSuggestions();
          }}
          availableIngredients={availableIngredients}
        />
      )}

      {/* Fetch Web Recipes Modal */}
      {showFetchWebForm && (
        <FetchWebRecipesModal
          onClose={() => setShowFetchWebForm(false)}
          onSuccess={() => {
            setShowFetchWebForm(false);
            loadPantryAndSuggestions();
          }}
          categories={webCategories}
        />
      )}

      {/* Recipe Detail Modal */}
      {selectedRecipe && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedRecipe(null)}
        >
          <div
            className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-3xl font-bold text-gray-800">{selectedRecipe.name}</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleLike(selectedRecipe.id, selectedRecipe.isLiked || false)}
                    className={`p-2 rounded-full transition-colors ${
                      selectedRecipe.isLiked
                        ? 'text-red-500 hover:bg-red-50'
                        : 'text-gray-400 hover:bg-gray-100'
                    }`}
                    title={selectedRecipe.isLiked ? 'Unlike recipe' : 'Like recipe'}
                  >
                    <svg
                      className="w-6 h-6"
                      fill={selectedRecipe.isLiked ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => setSelectedRecipe(null)}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ×
                  </button>
                </div>
              </div>

              <p className="text-gray-600 mb-6">{selectedRecipe.description || 'No description available'}</p>

              {selectedRecipe.sourceUrl && (
                <div className="mb-6">
                  <a
                    href={selectedRecipe.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    View Original Recipe
                  </a>
                </div>
              )}

              {selectedRecipe.imageUrl && (
                <div className="mb-6">
                  <img
                    src={selectedRecipe.imageUrl}
                    alt={selectedRecipe.name}
                    className="w-full h-64 object-cover rounded-lg"
                  />
                </div>
              )}

              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary-600">{selectedRecipe.prepTime || 0}</div>
                  <div className="text-sm text-gray-600">Prep (min)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary-600">{selectedRecipe.cookTime || 0}</div>
                  <div className="text-sm text-gray-600">Cook (min)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary-600">{selectedRecipe.servings || 0}</div>
                  <div className="text-sm text-gray-600">Serves</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary-600">{selectedRecipe.difficulty || 'N/A'}</div>
                  <div className="text-sm text-gray-600">Difficulty</div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-700 mb-3">Ingredients</h3>
                <div className="space-y-2">
                  {(selectedRecipe.allIngredients || []).map((ingredient, idx) => {
                    const inPantry = pantryItems.includes(ingredient);
                    return (
                      <div
                        key={idx}
                        className={`flex items-center gap-2 p-2 rounded ${
                          inPantry ? 'bg-green-50' : 'bg-yellow-50'
                        }`}
                      >
                        <span className={inPantry ? 'text-green-600' : 'text-yellow-600'}>
                          {inPantry ? '✓' : '○'}
                        </span>
                        <span className={inPantry ? 'text-gray-700' : 'text-gray-600'}>
                          {ingredient}
                        </span>
                        {!inPantry && (
                          <span className="text-xs text-yellow-600 ml-auto">Missing</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-700 mb-3">Dietary Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {(selectedRecipe.dietaryTags || []).length > 0 ? (
                    (selectedRecipe.dietaryTags || []).map(tag => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-500 text-sm">No dietary tags</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Create Recipe Modal Component
const CreateRecipeModal = ({
  onClose,
  onSuccess,
  availableIngredients
}: {
  onClose: () => void;
  onSuccess: () => void;
  availableIngredients: string[];
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [prepTime, setPrepTime] = useState<number>(0);
  const [cookTime, setCookTime] = useState<number>(0);
  const [servings, setServings] = useState<number>(1);
  const [difficulty, setDifficulty] = useState('Easy');
  const [dietaryTags, setDietaryTags] = useState<string[]>([]);
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [newIngredient, setNewIngredient] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dietaryOptions = ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'keto', 'paleo', 'low-carb', 'nut-free', 'pescatarian'];

  const toggleDietaryTag = (tag: string) => {
    setDietaryTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const addIngredient = () => {
    const trimmed = newIngredient.trim();
    if (trimmed && !ingredients.includes(trimmed)) {
      setIngredients([...ingredients, trimmed]);
      setNewIngredient('');
    }
  };

  const removeIngredient = (ing: string) => {
    setIngredients(prev => prev.filter(i => i !== ing));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Recipe name is required');
      return;
    }

    if (ingredients.length === 0) {
      setError('At least one ingredient is required');
      return;
    }

    setSaving(true);
    try {
      await createRecipe({
        name: name.trim(),
        description: description.trim(),
        prepTime,
        cookTime,
        servings,
        difficulty,
        dietaryTags,
        ingredients
      });
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to create recipe');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Create New Recipe</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipe Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prep Time (min)
                </label>
                <input
                  type="number"
                  value={prepTime}
                  onChange={(e) => setPrepTime(Number(e.target.value))}
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cook Time (min)
                </label>
                <input
                  type="number"
                  value={cookTime}
                  onChange={(e) => setCookTime(Number(e.target.value))}
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Servings
                </label>
                <input
                  type="number"
                  value={servings}
                  onChange={(e) => setServings(Number(e.target.value))}
                  min="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Difficulty
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dietary Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {dietaryOptions.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleDietaryTag(tag)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      dietaryTags.includes(tag)
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ingredients *
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newIngredient}
                  onChange={(e) => setNewIngredient(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addIngredient();
                    }
                  }}
                  placeholder="Add ingredient..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={addIngredient}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {ingredients.map(ing => (
                  <span
                    key={ing}
                    className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm flex items-center gap-2"
                  >
                    {ing}
                    <button
                      type="button"
                      onClick={() => removeIngredient(ing)}
                      className="text-green-800 hover:text-green-900"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Creating...' : 'Create Recipe'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Fetch Web Recipes Modal Component
const FetchWebRecipesModal = ({
  onClose,
  onSuccess,
  categories
}: {
  onClose: () => void;
  onSuccess: () => void;
  categories: string[];
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFetch = async () => {
    setError(null);
    setSuccess(null);
    setFetching(true);

    try {
      const data = await fetchWebRecipes({
        searchTerm: searchTerm.trim() || undefined,
        category: selectedCategory || undefined
      });
      setSuccess(`Successfully fetched ${data.recipes?.length || 0} recipes!`);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to fetch recipes');
    } finally {
      setFetching(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Fetch Recipes from Web</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <p className="text-green-800 text-sm">{success}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search by Recipe Name (optional)
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="e.g., Chicken Curry"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                disabled={fetching || !!selectedCategory}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Or Select Category (optional)
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                disabled={fetching || !!searchTerm.trim()}
              >
                <option value="">Random Recipes</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-blue-800 text-sm">
                <strong>Note:</strong> If no search term or category is selected, 10 random recipes will be fetched from TheMealDB.
              </p>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                onClick={handleFetch}
                disabled={fetching}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {fetching ? 'Fetching...' : 'Fetch Recipes'}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Recipes;

