import express from 'express';
import { getSession } from '../database/neo4j.js';

const router = express.Router();

// Get user's pantry items
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;
  const session = getSession();

  try {
    const result = await session.run(
      `MATCH (u:User {id: $userId})-[:HAS_IN_PANTRY]->(i:Ingredient)
       RETURN i.name as name, i.category as category
       ORDER BY i.name`,
      { userId }
    );

    const pantry = result.records.map(record => ({
      name: record.get('name'),
      category: record.get('category')
    }));

    res.json({ pantry });
  } catch (error) {
    console.error('Error fetching pantry:', error);
    res.status(500).json({ error: 'Failed to fetch pantry' });
  } finally {
    await session.close();
  }
});

// Add items to pantry
router.post('/:userId/items', async (req, res) => {
  const { userId } = req.params;
  const { items } = req.body; // Array of ingredient names
  const session = getSession();

  try {
    // First, ensure user exists
    await session.run(
      `MERGE (u:User {id: $userId})
       ON CREATE SET u.createdAt = datetime()`,
      { userId }
    );

    // Add each ingredient to pantry
    for (const itemName of items) {
      await session.run(
        `MATCH (u:User {id: $userId})
         MERGE (i:Ingredient {name: $itemName})
         MERGE (u)-[:HAS_IN_PANTRY]->(i)`,
        { userId, itemName }
      );
    }

    // Return updated pantry
    const result = await session.run(
      `MATCH (u:User {id: $userId})-[:HAS_IN_PANTRY]->(i:Ingredient)
       RETURN i.name as name, i.category as category
       ORDER BY i.name`,
      { userId }
    );

    const pantry = result.records.map(record => ({
      name: record.get('name'),
      category: record.get('category')
    }));

    res.json({ pantry });
  } catch (error) {
    console.error('Error adding to pantry:', error);
    res.status(500).json({ error: 'Failed to add items to pantry' });
  } finally {
    await session.close();
  }
});

// Remove items from pantry
router.delete('/:userId/items', async (req, res) => {
  const { userId } = req.params;
  const { items } = req.body; // Array of ingredient names
  const session = getSession();

  try {
    for (const itemName of items) {
      await session.run(
        `MATCH (u:User {id: $userId})-[r:HAS_IN_PANTRY]->(i:Ingredient {name: $itemName})
         DELETE r`,
        { userId, itemName }
      );
    }

    // Return updated pantry
    const result = await session.run(
      `MATCH (u:User {id: $userId})-[:HAS_IN_PANTRY]->(i:Ingredient)
       RETURN i.name as name, i.category as category
       ORDER BY i.name`,
      { userId }
    );

    const pantry = result.records.map(record => ({
      name: record.get('name'),
      category: record.get('category')
    }));

    res.json({ pantry });
  } catch (error) {
    console.error('Error removing from pantry:', error);
    res.status(500).json({ error: 'Failed to remove items from pantry' });
  } finally {
    await session.close();
  }
});

// Get all available ingredients
router.get('/ingredients/all', async (req, res) => {
  const session = getSession();

  try {
    const result = await session.run(
      'MATCH (i:Ingredient) RETURN i.name as name, i.category as category ORDER BY i.name'
    );

    const ingredients = result.records.map(record => ({
      name: record.get('name'),
      category: record.get('category')
    }));

    res.json({ ingredients });
  } catch (error) {
    console.error('Error fetching ingredients:', error);
    res.status(500).json({ error: 'Failed to fetch ingredients' });
  } finally {
    await session.close();
  }
});

export { router as pantryRoutes };

