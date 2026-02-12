// Mapping of dietary preferences to forbidden ingredients
const dietaryRestrictions: Record<string, string[]> = {
  'vegetarian': ['chicken', 'beef', 'pork', 'lamb', 'turkey', 'duck', 'fish', 'seafood', 'meat', 'bacon', 'sausage', 'ham', 'pepperoni', 'salami', 'shrimp', 'crab', 'lobster', 'tuna', 'salmon'],
  'vegan': ['chicken', 'beef', 'pork', 'lamb', 'turkey', 'duck', 'fish', 'seafood', 'meat', 'bacon', 'sausage', 'ham', 'pepperoni', 'salami', 'eggs', 'egg', 'milk', 'cheese', 'butter', 'yogurt', 'cream', 'dairy', 'shrimp', 'crab', 'lobster', 'tuna', 'salmon'],
  'pescatarian': ['chicken', 'beef', 'pork', 'lamb', 'turkey', 'duck', 'meat', 'bacon', 'sausage', 'ham', 'pepperoni', 'salami'],
  'gluten-free': ['wheat', 'flour', 'bread', 'pasta', 'noodles', 'barley', 'rye', 'gluten'],
  'dairy-free': ['milk', 'cheese', 'butter', 'yogurt', 'cream', 'dairy', 'whey'],
  'nut-free': ['peanuts', 'peanut', 'almonds', 'almond', 'walnuts', 'walnut', 'cashews', 'cashew', 'pecans', 'pecan', 'hazelnuts', 'hazelnut', 'pistachios', 'pistachio'],
};

// Check if an ingredient violates dietary preferences
export const violatesDietaryPreference = (ingredient: string, preferences: string[]): boolean => {
  if (!ingredient || !preferences || preferences.length === 0) {
    return false;
  }

  const ingredientLower = ingredient.toLowerCase().trim();

  for (const preference of preferences) {
    const prefKey = preference.toLowerCase().trim();
    const forbidden = dietaryRestrictions[prefKey] || [];

    // Check if ingredient matches any forbidden ingredient
    const matches = forbidden.some(forbiddenIng => {
      const forbiddenLower = forbiddenIng.toLowerCase().trim();

      // Exact match
      if (ingredientLower === forbiddenLower) {
        return true;
      }

      // Word boundary matching - check if forbidden word appears as a whole word
      // Use word boundaries to avoid false matches (e.g., "pepper" shouldn't match "pepperoni")
      const wordBoundaryRegex = new RegExp(`\\b${forbiddenLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (wordBoundaryRegex.test(ingredientLower)) {
        return true;
      }

      // Also check if ingredient is contained in forbidden (e.g., "ground beef" contains "beef")
      // But only if the forbidden word is longer or equal (to avoid "pepper" matching "pepperoni")
      if (forbiddenLower.length <= ingredientLower.length && ingredientLower.includes(forbiddenLower)) {
        // Additional check: make sure it's not a substring issue
        // Split by spaces and check if any word matches
        const ingredientWords = ingredientLower.split(/\s+/);
        if (ingredientWords.includes(forbiddenLower)) {
          return true;
        }
      }

      return false;
    });

    if (matches) {
      return true;
    }
  }

  return false;
};

// Check if an ingredient matches an allergy
export const matchesAllergy = (ingredient: string, allergies: string[]): boolean => {
  if (!ingredient || !allergies || allergies.length === 0) {
    return false;
  }

  const ingredientLower = ingredient.toLowerCase().trim();

  return allergies.some(allergy => {
    const allergyLower = allergy.toLowerCase().trim();
    // Exact match or substring match
    return ingredientLower === allergyLower ||
           ingredientLower.includes(allergyLower) ||
           allergyLower.includes(ingredientLower);
  });
};

