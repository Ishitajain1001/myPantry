import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { userRoutes } from './routes/userRoutes.js';
import { pantryRoutes } from './routes/pantryRoutes.js';
import { recipeRoutes } from './routes/recipeRoutes.js';
import { authRoutes } from './routes/authRoutes.js';
import { initDatabase } from './database/neo4j.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize database connection
initDatabase().catch(console.error);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/pantry', pantryRoutes);
app.use('/api/recipes', recipeRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Pantry Recipes API is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

