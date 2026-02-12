import neo4j, { Driver, Session } from 'neo4j-driver';

let driver: Driver | null = null;

export const initDatabase = async (): Promise<void> => {
  const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
  const user = process.env.NEO4J_USER || 'neo4j';
  const password = process.env.NEO4J_PASSWORD || 'password';

  try {
    driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

    // Verify connectivity
    await driver.verifyConnectivity();
    console.log('Connected to Neo4j database');

    // Create constraints and indexes
    await createConstraints();

    // Seed initial data if needed
    await seedInitialData();
  } catch (error) {
    console.error('Failed to connect to Neo4j:', error);
    throw error;
  }
};

const createConstraints = async (): Promise<void> => {
  if (!driver) return;

  const session = driver.session();
  try {
    // Create constraints for unique nodes
    await session.run(`
      CREATE CONSTRAINT user_id IF NOT EXISTS
      FOR (u:User) REQUIRE u.id IS UNIQUE
    `).catch(() => {}); // Ignore if constraint already exists

    await session.run(`
      CREATE CONSTRAINT user_email IF NOT EXISTS
      FOR (u:User) REQUIRE u.email IS UNIQUE
    `).catch(() => {}); // Ignore if constraint already exists

    await session.run(`
      CREATE CONSTRAINT ingredient_name IF NOT EXISTS
      FOR (i:Ingredient) REQUIRE i.name IS UNIQUE
    `).catch(() => {});

    await session.run(`
      CREATE CONSTRAINT recipe_id IF NOT EXISTS
      FOR (r:Recipe) REQUIRE r.id IS UNIQUE
    `).catch(() => {});

    console.log('Database constraints created');
  } finally {
    await session.close();
  }
};

const seedInitialData = async (): Promise<void> => {
  if (!driver) return;

  const session = driver.session();
  try {
    // Check if data already exists
    const result = await session.run('MATCH (r:Recipe) RETURN count(r) as count');
    const count = result.records[0].get('count').toNumber();

    if (count > 0) {
      console.log('Database already has data, skipping seed');
      return;
    }

    // Seed some sample ingredients
    await session.run(`
      CREATE
      (tomato:Ingredient {name: 'Tomato', category: 'Vegetable'}),
      (onion:Ingredient {name: 'Onion', category: 'Vegetable'}),
      (garlic:Ingredient {name: 'Garlic', category: 'Vegetable'}),
      (olive_oil:Ingredient {name: 'Olive Oil', category: 'Oil'}),
      (salt:Ingredient {name: 'Salt', category: 'Seasoning'}),
      (pepper:Ingredient {name: 'Pepper', category: 'Seasoning'}),
      (chicken:Ingredient {name: 'Chicken', category: 'Protein'}),
      (rice:Ingredient {name: 'Rice', category: 'Grain'}),
      (pasta:Ingredient {name: 'Pasta', category: 'Grain'}),
      (cheese:Ingredient {name: 'Cheese', category: 'Dairy'}),
      (milk:Ingredient {name: 'Milk', category: 'Dairy'}),
      (eggs:Ingredient {name: 'Eggs', category: 'Protein'}),
      (flour:Ingredient {name: 'Flour', category: 'Grain'}),
      (quinoa:Ingredient {name: 'Quinoa', category: 'Grain'}),
      (spinach:Ingredient {name: 'Spinach', category: 'Vegetable'}),
      (broccoli:Ingredient {name: 'Broccoli', category: 'Vegetable'}),
      (carrot:Ingredient {name: 'Carrot', category: 'Vegetable'}),
      (bell_pepper:Ingredient {name: 'Bell Pepper', category: 'Vegetable'}),
      (mushroom:Ingredient {name: 'Mushroom', category: 'Vegetable'}),
      (avocado:Ingredient {name: 'Avocado', category: 'Fruit'}),
      (bread:Ingredient {name: 'Bread', category: 'Grain'})
    `);

    // Seed some sample recipes
    await session.run(`
      CREATE
      (r1:Recipe {
        id: 'recipe-1',
        name: 'Simple Tomato Pasta',
        description: 'A quick and healthy pasta dish with fresh tomatoes',
        prepTime: 10,
        cookTime: 20,
        servings: 4,
        difficulty: 'Easy',
        dietaryTags: ['vegetarian']
      }),
      (r2:Recipe {
        id: 'recipe-2',
        name: 'Quinoa Salad Bowl',
        description: 'Nutritious quinoa salad with fresh vegetables',
        prepTime: 15,
        cookTime: 20,
        servings: 2,
        difficulty: 'Easy',
        dietaryTags: ['vegetarian', 'vegan', 'gluten-free']
      }),
      (r3:Recipe {
        id: 'recipe-3',
        name: 'Chicken Stir Fry',
        description: 'Healthy chicken stir fry with vegetables',
        prepTime: 15,
        cookTime: 15,
        servings: 4,
        difficulty: 'Medium',
        dietaryTags: ['gluten-free']
      }),
      (r4:Recipe {
        id: 'recipe-4',
        name: 'Avocado Toast',
        description: 'Simple and healthy avocado toast',
        prepTime: 5,
        cookTime: 5,
        servings: 1,
        difficulty: 'Easy',
        dietaryTags: ['vegetarian', 'vegan']
      })
    `);

    // Create relationships: recipes use ingredients
    await session.run(`
      MATCH (r1:Recipe {id: 'recipe-1'}), (pasta:Ingredient {name: 'Pasta'})
      CREATE (r1)-[:USES {amount: '400g', unit: 'grams'}]->(pasta)
    `);

    await session.run(`
      MATCH (r1:Recipe {id: 'recipe-1'}), (tomato:Ingredient {name: 'Tomato'})
      CREATE (r1)-[:USES {amount: '4', unit: 'pieces'}]->(tomato)
    `);

    await session.run(`
      MATCH (r1:Recipe {id: 'recipe-1'}), (garlic:Ingredient {name: 'Garlic'})
      CREATE (r1)-[:USES {amount: '2', unit: 'cloves'}]->(garlic)
    `);

    await session.run(`
      MATCH (r1:Recipe {id: 'recipe-1'}), (olive_oil:Ingredient {name: 'Olive Oil'})
      CREATE (r1)-[:USES {amount: '2', unit: 'tbsp'}]->(olive_oil)
    `);

    await session.run(`
      MATCH (r1:Recipe {id: 'recipe-1'}), (salt:Ingredient {name: 'Salt'})
      CREATE (r1)-[:USES {amount: '1', unit: 'tsp'}]->(salt)
    `);

    await session.run(`
      MATCH (r1:Recipe {id: 'recipe-1'}), (pepper:Ingredient {name: 'Pepper'})
      CREATE (r1)-[:USES {amount: '1/2', unit: 'tsp'}]->(pepper)
    `);

    await session.run(`
      MATCH (r2:Recipe {id: 'recipe-2'}), (quinoa:Ingredient {name: 'Quinoa'})
      CREATE (r2)-[:USES {amount: '1', unit: 'cup'}]->(quinoa)
    `);

    await session.run(`
      MATCH (r2:Recipe {id: 'recipe-2'}), (spinach:Ingredient {name: 'Spinach'})
      CREATE (r2)-[:USES {amount: '2', unit: 'cups'}]->(spinach)
    `);

    await session.run(`
      MATCH (r2:Recipe {id: 'recipe-2'}), (tomato:Ingredient {name: 'Tomato'})
      CREATE (r2)-[:USES {amount: '2', unit: 'pieces'}]->(tomato)
    `);

    await session.run(`
      MATCH (r2:Recipe {id: 'recipe-2'}), (avocado:Ingredient {name: 'Avocado'})
      CREATE (r2)-[:USES {amount: '1', unit: 'piece'}]->(avocado)
    `);

    await session.run(`
      MATCH (r3:Recipe {id: 'recipe-3'}), (chicken:Ingredient {name: 'Chicken'})
      CREATE (r3)-[:USES {amount: '500g', unit: 'grams'}]->(chicken)
    `);

    await session.run(`
      MATCH (r3:Recipe {id: 'recipe-3'}), (broccoli:Ingredient {name: 'Broccoli'})
      CREATE (r3)-[:USES {amount: '2', unit: 'cups'}]->(broccoli)
    `);

    await session.run(`
      MATCH (r3:Recipe {id: 'recipe-3'}), (bell_pepper:Ingredient {name: 'Bell Pepper'})
      CREATE (r3)-[:USES {amount: '2', unit: 'pieces'}]->(bell_pepper)
    `);

    await session.run(`
      MATCH (r3:Recipe {id: 'recipe-3'}), (salt:Ingredient {name: 'Salt'})
      CREATE (r3)-[:USES {amount: '1', unit: 'tsp'}]->(salt)
    `);

    await session.run(`
      MATCH (r3:Recipe {id: 'recipe-3'}), (pepper:Ingredient {name: 'Pepper'})
      CREATE (r3)-[:USES {amount: '1/2', unit: 'tsp'}]->(pepper)
    `);

    await session.run(`
      MATCH (r4:Recipe {id: 'recipe-4'}), (avocado:Ingredient {name: 'Avocado'})
      CREATE (r4)-[:USES {amount: '1', unit: 'piece'}]->(avocado)
    `);

    await session.run(`
      MATCH (r4:Recipe {id: 'recipe-4'}), (bread:Ingredient {name: 'Bread'})
      CREATE (r4)-[:USES {amount: '2', unit: 'slices'}]->(bread)
    `);

    console.log('Initial data seeded successfully');
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await session.close();
  }
};

export const getDriver = (): Driver => {
  if (!driver) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return driver;
};

export const getSession = (): Session => {
  return getDriver().session();
};

