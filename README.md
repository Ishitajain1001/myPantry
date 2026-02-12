# Pantry Recipes - Healthy Recipe Finder

A modern web application for discovering healthy recipes based on your pantry ingredients and dietary preferences. Built with React, Node.js, Express, and Neo4j graph database.

## Features

- **User Profiles**: Set dietary preferences (vegetarian, vegan, gluten-free, etc.) and track allergies
- **Pantry Management**: Add and manage ingredients you have available
- **Smart Recipe Suggestions**: Get personalized recipe recommendations based on:
  - Ingredients in your pantry
  - Your dietary preferences
  - Your allergies (automatically filtered out)
- **Graph Database**: Uses Neo4j to model relationships between recipes and ingredients for efficient querying

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: Neo4j (Graph Database)
- **Build Tools**: Vite, TypeScript

## Prerequisites

- Node.js (v18 or higher)
- Neo4j Database (v5.x or higher)
  - You can install Neo4j Desktop or use Neo4j Aura (cloud)
  - Default connection: `bolt://localhost:7687`

## Installation

1. **Install dependencies for all packages:**
   ```bash
   npm run install:all
   ```

2. **Set up Neo4j:**
   - Install and start Neo4j
   - Create a new database
   - Note your connection details (URI, username, password)

3. **Configure environment variables:**
   ```bash
   cd server
   cp .env.example .env
   ```

   Edit `.env` with your Neo4j credentials:
   ```
   PORT=3001
   NEO4J_URI=bolt://localhost:7687
   NEO4J_USER=neo4j
   NEO4J_PASSWORD=your_password
   ```

## Running the Application

**Development mode (runs both frontend and backend):**
```bash
npm run dev
```

This will start:
- Frontend on `http://localhost:3000`
- Backend API on `http://localhost:3001`

**Or run separately:**

Backend only:
```bash
npm run dev:server
```

Frontend only:
```bash
npm run dev:client
```

## Project Structure

```
pantry-recipes/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── services/      # API service functions
│   │   └── App.tsx        # Main app component
│   └── package.json
├── server/                # Express backend
│   ├── src/
│   │   ├── routes/        # API routes
│   │   ├── database/      # Neo4j connection and setup
│   │   └── index.ts       # Server entry point
│   └── package.json
└── package.json           # Root package.json
```

## Database Schema

The Neo4j graph database uses the following structure:

- **Nodes:**
  - `User`: User profiles with dietary preferences and allergies
  - `Ingredient`: Available ingredients with categories
  - `Recipe`: Recipes with metadata (prep time, cook time, dietary tags)

- **Relationships:**
  - `(User)-[:HAS_IN_PANTRY]->(Ingredient)`: User's pantry items
  - `(Recipe)-[:USES {amount, unit}]->(Ingredient)`: Recipe ingredients with quantities

## API Endpoints

### Users
- `GET /api/users/:userId` - Get or create user profile
- `PUT /api/users/:userId/preferences` - Update dietary preferences and allergies

### Pantry
- `GET /api/pantry/:userId` - Get user's pantry items
- `POST /api/pantry/:userId/items` - Add items to pantry
- `DELETE /api/pantry/:userId/items` - Remove items from pantry
- `GET /api/pantry/ingredients/all` - Get all available ingredients

### Recipes
- `POST /api/recipes/suggestions` - Get recipe suggestions based on pantry
- `GET /api/recipes` - Get all recipes
- `GET /api/recipes/:recipeId` - Get recipe details

## Usage

1. **Set up your profile:**
   - Go to the Profile page
   - Select your dietary preferences
   - Add any allergies

2. **Add ingredients to your pantry:**
   - Go to the Pantry page
   - Search and add ingredients you have available

3. **Get recipe suggestions:**
   - Go to the Recipes page
   - View personalized recipe suggestions based on your pantry and preferences
   - Click on any recipe to see detailed information

## Future Enhancements

- User authentication
- Recipe favorites and collections
- Meal planning
- Shopping list generation
- Recipe ratings and reviews
- More sophisticated allergy detection
- Recipe instructions and steps
- Image uploads for recipes


