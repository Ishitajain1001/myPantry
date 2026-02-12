import express from 'express';
import { getSession } from '../database/neo4j.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Get or create user profile
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;
  const session = getSession();

  try {
    const result = await session.run(
      'MATCH (u:User {id: $userId}) RETURN u',
      { userId }
    );

    if (result.records.length === 0) {
      // Create new user
      await session.run(
        `CREATE (u:User {
          id: $userId,
          dietaryPreferences: [],
          allergies: [],
          createdAt: datetime()
        }) RETURN u`,
        { userId }
      );

      const newResult = await session.run(
        'MATCH (u:User {id: $userId}) RETURN u',
        { userId }
      );

      const user = newResult.records[0].get('u').properties;
      res.json({ user });
    } else {
      const user = result.records[0].get('u').properties;
      res.json({ user });
    }
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  } finally {
    await session.close();
  }
});

// Update user dietary preferences and allergies
router.put('/:userId/preferences', async (req, res) => {
  const { userId } = req.params;
  const { dietaryPreferences, allergies } = req.body;
  const session = getSession();

  try {
    // Ensure arrays are properly formatted
    const prefs = Array.isArray(dietaryPreferences) ? dietaryPreferences : [];
    const alls = Array.isArray(allergies) ? allergies : [];

    console.log(`\n=== SAVING preferences for user ${userId} ===`);
    console.log('Received dietaryPreferences:', dietaryPreferences, 'Type:', typeof dietaryPreferences, 'IsArray:', Array.isArray(dietaryPreferences));
    console.log('Received allergies:', allergies, 'Type:', typeof allergies, 'IsArray:', Array.isArray(allergies));
    console.log('Processed prefs:', prefs);
    console.log('Processed alls:', alls);

    await session.run(
      `MATCH (u:User {id: $userId})
       SET u.dietaryPreferences = $dietaryPreferences,
           u.allergies = $allergies,
           u.updatedAt = datetime()
       RETURN u`,
      { userId, dietaryPreferences: prefs, allergies: alls }
    );

    // Verify the update by reading it back
    const verifyResult = await session.run(
      'MATCH (u:User {id: $userId}) RETURN u.dietaryPreferences as prefs, u.allergies as alls, u.email as email',
      { userId }
    );

    if (verifyResult.records.length > 0) {
      const record = verifyResult.records[0];
      const savedPrefs = record.get('prefs');
      const savedAlls = record.get('alls');
      const email = record.get('email');
      console.log(`✅ VERIFIED saved preferences for ${userId} (${email}):`);
      console.log('  Saved dietaryPreferences:', savedPrefs, 'Type:', typeof savedPrefs, 'IsArray:', Array.isArray(savedPrefs));
      console.log('  Saved allergies:', savedAlls, 'Type:', typeof savedAlls, 'IsArray:', Array.isArray(savedAlls));
      console.log('=== End save verification ===\n');
    } else {
      console.log(`❌ ERROR: Could not verify save - user ${userId} not found after update`);
    }

    const userResult = await session.run(
      'MATCH (u:User {id: $userId}) RETURN u',
      { userId }
    );

    const user = userResult.records[0].get('u').properties;
    res.json({ user });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  } finally {
    await session.close();
  }
});

// Update user profile (name, age, etc.)
router.put('/:userId/profile', async (req, res) => {
  const { userId } = req.params;
  const { name, age } = req.body;
  const session = getSession();

  try {
    const updates: string[] = [];
    const params: any = { userId };

    if (name !== undefined) {
      updates.push('u.name = $name');
      params.name = name;
    }
    if (age !== undefined) {
      updates.push('u.age = $age');
      params.age = age;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('u.updatedAt = datetime()');

    await session.run(
      `MATCH (u:User {id: $userId})
       SET ${updates.join(', ')}
       RETURN u`,
      params
    );

    const result = await session.run(
      'MATCH (u:User {id: $userId}) RETURN u',
      { userId }
    );

    const user = result.records[0].get('u').properties;
    res.json({ user });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  } finally {
    await session.close();
  }
});

// Update profile picture
router.put('/:userId/profile-picture', async (req, res) => {
  const { userId } = req.params;
  const { profilePicture } = req.body;
  const session = getSession();

  try {
    await session.run(
      `MATCH (u:User {id: $userId})
       SET u.profilePicture = $profilePicture,
           u.updatedAt = datetime()
       RETURN u`,
      { userId, profilePicture: profilePicture || null }
    );

    const result = await session.run(
      'MATCH (u:User {id: $userId}) RETURN u',
      { userId }
    );

    const user = result.records[0].get('u').properties;
    res.json({ user });
  } catch (error) {
    console.error('Error updating profile picture:', error);
    res.status(500).json({ error: 'Failed to update profile picture' });
  } finally {
    await session.close();
  }
});

// Debug endpoint to check user preferences (requires authentication)
router.get('/:userId/debug', authenticateToken, async (req: AuthRequest, res) => {
  const { userId } = req.params;
  const authenticatedUserId = req.userId;

  // Only allow users to check their own data
  if (userId !== authenticatedUserId) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const session = getSession();

  try {
    const result = await session.run(
      'MATCH (u:User {id: $userId}) RETURN u',
      { userId }
    );

    if (result.records.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.records[0].get('u').properties;

    res.json({
      userId: user.id,
      email: user.email,
      name: user.name,
      dietaryPreferences: user.dietaryPreferences || [],
      allergies: user.allergies || [],
      preferencesType: typeof user.dietaryPreferences,
      allergiesType: typeof user.allergies,
      preferencesIsArray: Array.isArray(user.dietaryPreferences),
      allergiesIsArray: Array.isArray(user.allergies),
      rawUser: user
    });
  } catch (error) {
    console.error('Error fetching user debug info:', error);
    res.status(500).json({ error: 'Failed to fetch user info' });
  } finally {
    await session.close();
  }
});

export { router as userRoutes };

