# Debugging User Preferences and Allergies

## How to Check User Data in Database

### Option 1: Using the Debug Endpoint

1. Make sure you're logged in
2. Open browser console (F12)
3. Run this command:
```javascript
// Get your userId from localStorage
const user = JSON.parse(localStorage.getItem('user'));
const userId = user.id;

// Call the debug endpoint
fetch(`/api/users/${userId}/debug`, {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
})
.then(r => r.json())
.then(data => console.log('User Debug Info:', data));
```

### Option 2: Direct Neo4j Query

If you have access to Neo4j Browser or Cypher shell:

```cypher
// Find a user by email
MATCH (u:User {email: 'your-email@example.com'})
RETURN u.id, u.email, u.dietaryPreferences, u.allergies

// Or find by userId
MATCH (u:User {id: 'user-1234567890-abc123'})
RETURN u.id, u.email, u.dietaryPreferences, u.allergies, u.name

// Check all users and their preferences
MATCH (u:User)
RETURN u.id, u.email, u.dietaryPreferences, u.allergies
ORDER BY u.email
```

### Option 3: Check Server Logs

When you:
1. Save preferences in Account Settings
2. Load recipes

Check the server console for logs showing:
- What preferences were saved
- What preferences were loaded
- Which recipes were filtered out

## Common Issues

### Preferences not saving
- Check server logs when clicking "Save Settings"
- Verify the API call returns success
- Check if userId matches your authenticated user

### Preferences not loading
- Check server logs when loading recipes
- Verify token is being sent (check Network tab in browser)
- Check if userId is being extracted from token

### Filtering not working
- Check server logs for filtering messages
- Verify preferences are loaded (should see them in logs)
- Check if ingredient names match exactly (case-sensitive matching)

## Testing Steps

1. **Save Preferences:**
   - Go to Account Settings
   - Select "vegetarian"
   - Add an allergy like "peanuts"
   - Click "Save Settings"
   - Check server logs for confirmation

2. **Verify in Database:**
   - Use one of the methods above to check if data is saved

3. **Test Filtering:**
   - Add ingredients to pantry (e.g., "Tomato", "Pasta", "Chicken")
   - Go to Recipes page
   - Check server logs - should see:
     - Preferences loaded
     - "Chicken Stir Fry" filtered out (contains chicken)
     - Any recipes with peanuts filtered out

4. **Check Browser Console:**
   - Open DevTools (F12)
   - Go to Network tab
   - Click on Recipes page
   - Check the `/api/recipes/suggestions` request
   - Look at the response to see how many recipes were returned


