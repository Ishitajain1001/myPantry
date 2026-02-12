import express from 'express';
import { getSession } from '../database/neo4j.js';

// Conditionally import axios (optional for web recipe fetching)
let axios: any = null;
const loadAxios = async () => {
  if (axios) return axios;
  try {
    const axiosModule = await import('axios');
    axios = axiosModule.default;
    return axios;
  } catch (error) {
    console.warn('axios not installed - web recipe fetching feature disabled');
    return null;
  }
};
import { toNumber } from '../utils/neo4jHelpers.js';
import { authenticateToken, optionalAuth, AuthRequest } from '../middleware/auth.js';
import { violatesDietaryPreference, matchesAllergy } from '../utils/dietaryFilters.js';

const router = express.Router();

// Get recipe suggestions based on pantry items and dietary preferences
// Uses optionalAuth to support both authenticated and unauthenticated users
router.post('/suggestions', optionalAuth, async (req: AuthRequest, res) => {
  const { pantryItems } = req.body;
  // Get userId from authenticated token (req.userId is set by optionalAuth middleware if token is valid)
  const userId = req.userId;
  const authHeader = req.headers['authorization'];
  const hasToken = !!authHeader;

  console.log('\n=== Recipe Suggestions Request ===');
  console.log('Has Authorization header:', hasToken);
  console.log('Extracted userId from token:', userId);
  console.log('Request body pantryItems count:', Array.isArray(pantryItems) ? pantryItems.length : 0);

  const session = getSession();

  try {
    // Validate input
    const validPantryItems = Array.isArray(pantryItems) ? pantryItems.filter(Boolean) : [];

    if (validPantryItems.length === 0) {
      return res.json({ recipes: [] });
    }

    // Get user preferences (only if userId is available from authenticated token)
    let dietaryPreferences: string[] = [];
    let allergies: string[] = [];

    if (userId) {
      try {
        const userResult = await session.run(
          'MATCH (u:User {id: $userId}) RETURN u.dietaryPreferences as preferences, u.allergies as allergies, u.email as email',
          { userId }
        );

        if (userResult.records.length > 0) {
          const user = userResult.records[0];
          const prefs = user.get('preferences');
          const alls = user.get('allergies');
          const email = user.get('email');

          console.log(`\n=== Loading preferences for user ${userId} (${email}) ===`);
          console.log('Raw preferences from DB:', prefs, 'Type:', typeof prefs, 'IsArray:', Array.isArray(prefs));
          console.log('Raw allergies from DB:', alls, 'Type:', typeof alls, 'IsArray:', Array.isArray(alls));

          dietaryPreferences = Array.isArray(prefs) ? prefs : (prefs ? [prefs] : []);
          allergies = Array.isArray(alls) ? alls : (alls ? [alls] : []);

          console.log('Processed dietaryPreferences:', dietaryPreferences);
          console.log('Processed allergies:', allergies);
          console.log('=== End preference loading ===\n');
        } else {
          console.log(`User ${userId} not found in database`);
        }
      } catch (error) {
        console.error('Error loading user preferences:', error);
      }
    } else {
      console.log('No userId available - user preferences will not be applied');
    }

    // Build query to find recipes that use pantry items
    // Score recipes by how many pantry ingredients they use
    // Boost score if user has liked the recipe (only if authenticated)
    const query = userId ? `
      MATCH (r:Recipe)-[rel:USES]->(i:Ingredient)
      WHERE i.name IN $pantryItems
      OPTIONAL MATCH (user:User {id: $userId})-[l:LIKES]->(r)
      WITH r, count(i) as matchingIngredients, collect(i.name) as usedIngredients,
           CASE WHEN l IS NOT NULL THEN 1 ELSE 0 END as isLiked
      MATCH (r)-[:USES]->(allIngredients:Ingredient)
      WITH r, matchingIngredients, usedIngredients, count(allIngredients) as totalIngredients,
           collect(DISTINCT allIngredients.name) as allIngredientNames, isLiked
      WHERE matchingIngredients > 0
      WITH r, matchingIngredients, totalIngredients,
           toFloat(matchingIngredients) / toFloat(totalIngredients) as matchRatio,
           usedIngredients, allIngredientNames, isLiked,
           (toFloat(matchingIngredients) / toFloat(totalIngredients) + (isLiked * 0.3)) as finalScore
      ORDER BY finalScore DESC, matchRatio DESC, matchingIngredients DESC
      LIMIT 20
      RETURN r.id as id, r.name as name, r.description as description,
             r.prepTime as prepTime, r.cookTime as cookTime, r.servings as servings,
             r.difficulty as difficulty, r.dietaryTags as dietaryTags,
             CASE WHEN r.sourceUrl IS NOT NULL THEN r.sourceUrl ELSE null END as sourceUrl,
             CASE WHEN r.imageUrl IS NOT NULL THEN r.imageUrl ELSE null END as imageUrl,
             matchingIngredients, totalIngredients, matchRatio, allIngredientNames, isLiked
    ` : `
      MATCH (r:Recipe)-[rel:USES]->(i:Ingredient)
      WHERE i.name IN $pantryItems
      WITH r, count(i) as matchingIngredients, collect(i.name) as usedIngredients
      MATCH (r)-[:USES]->(allIngredients:Ingredient)
      WITH r, matchingIngredients, usedIngredients, count(allIngredients) as totalIngredients,
           collect(DISTINCT allIngredients.name) as allIngredientNames
      WHERE matchingIngredients > 0
      WITH r, matchingIngredients, totalIngredients,
           toFloat(matchingIngredients) / toFloat(totalIngredients) as matchRatio,
           usedIngredients, allIngredientNames
      ORDER BY matchRatio DESC, matchingIngredients DESC
      LIMIT 20
      RETURN r.id as id, r.name as name, r.description as description,
             r.prepTime as prepTime, r.cookTime as cookTime, r.servings as servings,
             r.difficulty as difficulty, r.dietaryTags as dietaryTags,
             CASE WHEN r.sourceUrl IS NOT NULL THEN r.sourceUrl ELSE null END as sourceUrl,
             CASE WHEN r.imageUrl IS NOT NULL THEN r.imageUrl ELSE null END as imageUrl,
             matchingIngredients, totalIngredients, matchRatio, allIngredientNames, 0 as isLiked
    `;

    const result = await session.run(query, userId
      ? { pantryItems: validPantryItems, userId }
      : { pantryItems: validPantryItems });

    let recipes = result.records.map(record => {
      const dietaryTags = record.get('dietaryTags') || [];
      const allIngredientNames = record.get('allIngredientNames') || [];
      const matchingIngredients = record.get('matchingIngredients');
      const totalIngredients = record.get('totalIngredients');
      const matchRatio = record.get('matchRatio');

      const isLiked = record.get('isLiked');

      return {
        id: record.get('id') || '',
        name: record.get('name') || 'Unnamed Recipe',
        description: record.get('description') || '',
        prepTime: toNumber(record.get('prepTime')),
        cookTime: toNumber(record.get('cookTime')),
        servings: toNumber(record.get('servings')),
        difficulty: record.get('difficulty') || 'Unknown',
        dietaryTags: Array.isArray(dietaryTags) ? dietaryTags : [],
        matchingIngredients: toNumber(matchingIngredients),
        totalIngredients: toNumber(totalIngredients),
        matchRatio: toNumber(matchRatio),
        allIngredients: Array.isArray(allIngredientNames) ? allIngredientNames : [],
        isLiked: toNumber(isLiked) === 1,
        sourceUrl: (() => {
          try {
            const val = record.get('sourceUrl');
            return val !== undefined && val !== null ? val : null;
          } catch {
            return null;
          }
        })(),
        imageUrl: (() => {
          try {
            const val = record.get('imageUrl');
            return val !== undefined && val !== null ? val : null;
          } catch {
            return null;
          }
        })()
      };
    });

    const beforeFiltering = recipes.length;
    console.log(`\n=== Filtering ${beforeFiltering} recipes ===`);
    console.log('Dietary preferences to apply:', dietaryPreferences);
    console.log('Allergies to apply:', allergies);

    // Filter by dietary preferences - exclude recipes with forbidden ingredients
    // This filtering is CRITICAL - it must always run if user has preferences
    if (dietaryPreferences.length > 0) {
      const beforeDietary = recipes.length;
      recipes = recipes.filter(recipe => {
        // Always exclude recipes that contain forbidden ingredients
        const containsForbiddenIngredient = recipe.allIngredients.some((ing: string) => {
          const violates = violatesDietaryPreference(ing, dietaryPreferences);
          if (violates) {
            console.log(`  ❌ Filtering "${recipe.name}" - ingredient "${ing}" violates preferences: ${dietaryPreferences.join(', ')}`);
          }
          return violates;
        });

        return !containsForbiddenIngredient;
      });
      console.log(`Dietary filtering: ${beforeDietary} -> ${recipes.length} recipes (removed ${beforeDietary - recipes.length})`);

      // Sort recipes to prioritize those with matching dietary tags
      recipes.sort((a, b) => {
        const aHasMatchingTag = dietaryPreferences.some(pref =>
          a.dietaryTags && a.dietaryTags.includes(pref.toLowerCase())
        );
        const bHasMatchingTag = dietaryPreferences.some(pref =>
          b.dietaryTags && b.dietaryTags.includes(pref.toLowerCase())
        );

        if (aHasMatchingTag && !bHasMatchingTag) return -1;
        if (!aHasMatchingTag && bHasMatchingTag) return 1;
        return 0; // Keep original order if both have or don't have matching tags
      });
    } else {
      console.log('No dietary preferences - skipping dietary filter');
    }

    // Filter out recipes with allergens
    // This filtering is CRITICAL - it must always run if user has allergies
    if (allergies.length > 0) {
      const beforeAllergy = recipes.length;
      recipes = recipes.filter(recipe => {
        // Check if any recipe ingredient matches an allergy
        const containsAllergen = recipe.allIngredients.some((ing: string) => {
          const matches = matchesAllergy(ing, allergies);
          if (matches) {
            console.log(`  ❌ Filtering "${recipe.name}" - ingredient "${ing}" matches allergy: ${allergies.join(', ')}`);
          }
          return matches;
        });
        return !containsAllergen;
      });
      console.log(`Allergy filtering: ${beforeAllergy} -> ${recipes.length} recipes (removed ${beforeAllergy - recipes.length})`);
    } else {
      console.log('No allergies - skipping allergy filter');
    }

    console.log(`Final result: ${beforeFiltering} -> ${recipes.length} recipes (filtered out ${beforeFiltering - recipes.length})`);
    console.log('=== End filtering ===\n');

    res.json({ recipes });
  } catch (error: any) {
    console.error('Error getting recipe suggestions:', error);
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name
    });
    res.status(500).json({
      error: 'Failed to get recipe suggestions',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  } finally {
    await session.close();
  }
});

// Get all recipes
router.get('/', async (req, res) => {
  const session = getSession();

  try {
    const result = await session.run(`
      MATCH (r:Recipe)-[:USES]->(i:Ingredient)
      WITH r, collect(i.name) as ingredients
      RETURN r.id as id, r.name as name, r.description as description,
             r.prepTime as prepTime, r.cookTime as cookTime, r.servings as servings,
             r.difficulty as difficulty, r.dietaryTags as dietaryTags, ingredients
      ORDER BY r.name
    `);

    const recipes = result.records.map(record => ({
      id: record.get('id') || '',
      name: record.get('name') || 'Unnamed Recipe',
      description: record.get('description') || '',
      prepTime: toNumber(record.get('prepTime')),
      cookTime: toNumber(record.get('cookTime')),
      servings: toNumber(record.get('servings')),
      difficulty: record.get('difficulty') || 'Unknown',
      dietaryTags: record.get('dietaryTags') || [],
      ingredients: record.get('ingredients') || []
    }));

    res.json({ recipes });
  } catch (error) {
    console.error('Error fetching recipes:', error);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  } finally {
    await session.close();
  }
});

// Create a new recipe (requires authentication)
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { name, description, prepTime, cookTime, servings, difficulty, dietaryTags, ingredients } = req.body;
  const session = getSession();

  try {
    // Validate required fields
    if (!name || !ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ error: 'Recipe name and at least one ingredient are required' });
    }

    // Generate recipe ID
    const recipeId = `recipe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create recipe node
    await session.run(
      `CREATE (r:Recipe {
        id: $recipeId,
        name: $name,
        description: $description || '',
        prepTime: $prepTime || 0,
        cookTime: $cookTime || 0,
        servings: $servings || 1,
        difficulty: $difficulty || 'Easy',
        dietaryTags: $dietaryTags || [],
        createdAt: datetime(),
        createdBy: $userId
      }) RETURN r`,
      {
        recipeId,
        name: name.trim(),
        description: description?.trim() || '',
        prepTime: prepTime || 0,
        cookTime: cookTime || 0,
        servings: servings || 1,
        difficulty: difficulty || 'Easy',
        dietaryTags: Array.isArray(dietaryTags) ? dietaryTags : [],
        userId
      }
    );

    // Create or link ingredients
    for (const ingredientName of ingredients) {
      if (!ingredientName || typeof ingredientName !== 'string') continue;

      await session.run(
        `MATCH (r:Recipe {id: $recipeId})
         MERGE (i:Ingredient {name: $ingredientName})
         MERGE (r)-[:USES {amount: '', unit: ''}]->(i)`,
        { recipeId, ingredientName: ingredientName.trim() }
      );
    }

    // Get the created recipe with all ingredients
    const result = await session.run(
      `MATCH (r:Recipe {id: $recipeId})
       OPTIONAL MATCH (r)-[:USES]->(i:Ingredient)
       WITH r, collect(i.name) as ingredients
       RETURN r, ingredients`,
      { recipeId }
    );

    if (result.records.length === 0) {
      return res.status(500).json({ error: 'Failed to create recipe' });
    }

    const record = result.records[0];
    const recipe = record.get('r').properties;
    const recipeIngredients = record.get('ingredients') || [];

    res.status(201).json({
      recipe: {
        id: recipe.id,
        name: recipe.name,
        description: recipe.description || '',
        prepTime: toNumber(recipe.prepTime),
        cookTime: toNumber(recipe.cookTime),
        servings: toNumber(recipe.servings),
        difficulty: recipe.difficulty || 'Easy',
        dietaryTags: recipe.dietaryTags || [],
        ingredients: recipeIngredients,
        createdBy: recipe.createdBy
      }
    });
  } catch (error) {
    console.error('Error creating recipe:', error);
    res.status(500).json({ error: 'Failed to create recipe' });
  } finally {
    await session.close();
  }
});

// Get recipe details
router.get('/:recipeId', async (req, res) => {
  const { recipeId } = req.params;
  const session = getSession();

  try {
    const result = await session.run(`
      MATCH (r:Recipe {id: $recipeId})-[u:USES]->(i:Ingredient)
      RETURN r, collect({
        name: i.name,
        category: i.category,
        amount: u.amount,
        unit: u.unit
      }) as ingredients
    `, { recipeId });

    if (result.records.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    const record = result.records[0];
    const recipe = record.get('r').properties;
    const ingredients = record.get('ingredients');

    // Convert all numeric properties from Neo4j Integer objects to JavaScript numbers
    const convertedRecipe = {
      ...recipe,
      prepTime: toNumber(recipe.prepTime),
      cookTime: toNumber(recipe.cookTime),
      servings: toNumber(recipe.servings),
      ingredients
    };

    res.json(convertedRecipe);
  } catch (error) {
    console.error('Error fetching recipe:', error);
    res.status(500).json({ error: 'Failed to fetch recipe' });
  } finally {
    await session.close();
  }
});

// Like a recipe
router.post('/:recipeId/like', authenticateToken, async (req: AuthRequest, res) => {
  const { recipeId } = req.params;
  const userId = req.userId!;
  const session = getSession();

  try {
    // Check if recipe exists
    const recipeCheck = await session.run(
      'MATCH (r:Recipe {id: $recipeId}) RETURN r',
      { recipeId }
    );

    if (recipeCheck.records.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    // Check if already liked
    const existingLike = await session.run(
      'MATCH (u:User {id: $userId})-[l:LIKES]->(r:Recipe {id: $recipeId}) RETURN l',
      { userId, recipeId }
    );

    if (existingLike.records.length > 0) {
      return res.json({ message: 'Recipe already liked', liked: true });
    }

    // Create like relationship
    await session.run(
      `MATCH (u:User {id: $userId}), (r:Recipe {id: $recipeId})
       CREATE (u)-[:LIKES {likedAt: datetime()}]->(r)
       RETURN r`,
      { userId, recipeId }
    );

    res.json({ message: 'Recipe liked', liked: true });
  } catch (error) {
    console.error('Error liking recipe:', error);
    res.status(500).json({ error: 'Failed to like recipe' });
  } finally {
    await session.close();
  }
});

// Unlike a recipe
router.delete('/:recipeId/like', authenticateToken, async (req: AuthRequest, res) => {
  const { recipeId } = req.params;
  const userId = req.userId!;
  const session = getSession();

  try {
    await session.run(
      `MATCH (u:User {id: $userId})-[l:LIKES]->(r:Recipe {id: $recipeId})
       DELETE l`,
      { userId, recipeId }
    );

    res.json({ message: 'Recipe unliked', liked: false });
  } catch (error) {
    console.error('Error unliking recipe:', error);
    res.status(500).json({ error: 'Failed to unlike recipe' });
  } finally {
    await session.close();
  }
});

// Get user's liked recipes
router.get('/liked', authenticateToken, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const session = getSession();

  try {
    const result = await session.run(`
      MATCH (u:User {id: $userId})-[l:LIKES]->(r:Recipe)-[:USES]->(i:Ingredient)
      WITH r, collect(i.name) as ingredients
      RETURN r.id as id, r.name as name, r.description as description,
             r.prepTime as prepTime, r.cookTime as cookTime, r.servings as servings,
             r.difficulty as difficulty, r.dietaryTags as dietaryTags, ingredients
      ORDER BY r.name
    `, { userId });

    const recipes = result.records.map(record => ({
      id: record.get('id') || '',
      name: record.get('name') || 'Unnamed Recipe',
      description: record.get('description') || '',
      prepTime: toNumber(record.get('prepTime')),
      cookTime: toNumber(record.get('cookTime')),
      servings: toNumber(record.get('servings')),
      difficulty: record.get('difficulty') || 'Unknown',
      dietaryTags: record.get('dietaryTags') || [],
      ingredients: record.get('ingredients') || [],
      isLiked: true
    }));

    res.json({ recipes });
  } catch (error) {
    console.error('Error fetching liked recipes:', error);
    res.status(500).json({ error: 'Failed to fetch liked recipes' });
  } finally {
    await session.close();
  }
});

// Fetch recipes from TheMealDB API and store them
router.post('/fetch-web', authenticateToken, async (req: AuthRequest, res) => {
  const axiosInstance = await loadAxios();
  if (!axiosInstance) {
    return res.status(503).json({ error: 'Web recipe fetching requires axios. Please install it: npm install axios' });
  }

  const { searchTerm, category } = req.body;
  const session = getSession();

  try {
    let meals: any[] = [];

    if (searchTerm) {
      // Search by name
      const response = await axiosInstance.get(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(searchTerm)}`);
      meals = response.data.meals || [];
    } else if (category) {
      // Search by category
      const response = await axiosInstance.get(`https://www.themealdb.com/api/json/v1/1/filter.php?c=${encodeURIComponent(category)}`);
      meals = response.data.meals || [];
    } else {
      // Get random recipes
      const randomPromises = Array.from({ length: 10 }, () =>
        axiosInstance.get('https://www.themealdb.com/api/json/v1/1/random.php')
      );
      const randomResponses = await Promise.all(randomPromises);
      meals = randomResponses.map((res: any) => res.data.meals?.[0]).filter(Boolean);
    }

    const createdRecipes = [];

    for (const meal of meals) {
      if (!meal) continue;

      // Check if recipe already exists
      const existing = await session.run(
        'MATCH (r:Recipe {sourceUrl: $sourceUrl}) RETURN r.id as id',
        { sourceUrl: meal.strSource || `https://www.themealdb.com/meal.php?c=${meal.idMeal}` }
      );

      if (existing.records.length > 0) {
        continue; // Skip if already exists
      }

      // Extract ingredients from meal object
      const ingredients: string[] = [];
      for (let i = 1; i <= 20; i++) {
        const ingredient = meal[`strIngredient${i}`];
        if (ingredient && ingredient.trim()) {
          ingredients.push(ingredient.trim());
        }
      }

      // Determine dietary tags (basic detection)
      const dietaryTags: string[] = [];
      const mealStr = JSON.stringify(meal).toLowerCase();
      if (!mealStr.match(/\b(chicken|beef|pork|lamb|turkey|duck|fish|seafood|meat|bacon|sausage|ham|pepperoni|salami)\b/)) {
        dietaryTags.push('vegetarian');
      }
      if (!mealStr.match(/\b(eggs|egg|milk|cheese|butter|yogurt|cream|dairy)\b/) && dietaryTags.includes('vegetarian')) {
        dietaryTags.push('vegan');
      }

      const recipeId = `web-recipe-${meal.idMeal}-${Date.now()}`;
      const sourceUrl = meal.strSource || `https://www.themealdb.com/meal.php?c=${meal.idMeal}`;

      // Create recipe
      await session.run(
        `CREATE (r:Recipe {
          id: $recipeId,
          name: $name,
          description: $description,
          prepTime: 0,
          cookTime: 0,
          servings: $servings,
          difficulty: 'Medium',
          dietaryTags: $dietaryTags,
          sourceUrl: $sourceUrl,
          imageUrl: $imageUrl,
          instructions: $instructions,
          createdAt: datetime(),
          source: 'themealdb'
        }) RETURN r`,
        {
          recipeId,
          name: meal.strMeal || 'Untitled Recipe',
          description: meal.strInstructions?.substring(0, 200) || '',
          servings: 4,
          dietaryTags,
          sourceUrl,
          imageUrl: meal.strMealThumb || '',
          instructions: meal.strInstructions || ''
        }
      );

      // Link ingredients
      for (const ingredientName of ingredients) {
        await session.run(
          `MATCH (r:Recipe {id: $recipeId})
           MERGE (i:Ingredient {name: $ingredientName})
           MERGE (r)-[:USES {amount: '', unit: ''}]->(i)`,
          { recipeId, ingredientName }
        );
      }

      createdRecipes.push({
        id: recipeId,
        name: meal.strMeal,
        sourceUrl,
        imageUrl: meal.strMealThumb
      });
    }

    res.json({
      message: `Fetched and stored ${createdRecipes.length} recipes`,
      recipes: createdRecipes
    });
  } catch (error: any) {
    console.error('Error fetching web recipes:', error);
    res.status(500).json({ error: 'Failed to fetch recipes from web' });
  } finally {
    await session.close();
  }
});

// Get available categories from TheMealDB
router.get('/web/categories', async (req, res: express.Response) => {
  const axiosInstance = await loadAxios();
  if (!axiosInstance) {
    return res.status(503).json({ error: 'Web recipe fetching requires axios. Please install it: npm install axios' });
  }

  try {
    const response = await axiosInstance.get('https://www.themealdb.com/api/json/v1/1/list.php?c=list');
    const categories = response.data.meals?.map((cat: any) => cat.strCategory) || [];
    res.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

export { router as recipeRoutes };

