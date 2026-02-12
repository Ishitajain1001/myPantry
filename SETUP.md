# Quick Setup Guide

## Step 1: Install Neo4j

You need Neo4j running before starting the application.

### Option A: Neo4j Desktop (Recommended for local development)
1. Download Neo4j Desktop from https://neo4j.com/download/
2. Install and open Neo4j Desktop
3. Create a new database (or use the default one)
4. Start the database
5. Note the connection details (usually `bolt://localhost:7687`)

### Option B: Neo4j Aura (Cloud)
1. Sign up at https://neo4j.com/cloud/aura/
2. Create a free instance
3. Copy the connection URI and credentials

## Step 2: Install Dependencies

```bash
npm run install:all
```

This will install dependencies for:
- Root package (concurrently for running both servers)
- Server package (Express, Neo4j driver, etc.)
- Client package (React, Vite, etc.)

## Step 3: Configure Environment

Create a `.env` file in the `server` directory:

```bash
cd server
cp .env.example .env
```

Edit `server/.env` with your Neo4j credentials:

```
PORT=3001
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_neo4j_password
```

**Important**: Replace `your_neo4j_password` with your actual Neo4j password.

## Step 4: Start the Application

From the root directory:

```bash
npm run dev
```

This will start:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001

## Step 5: First Run

When you first start the server, it will:
1. Connect to Neo4j
2. Create necessary constraints
3. Seed the database with sample ingredients and recipes

You should see in the console:
```
Connected to Neo4j database
Database constraints created
Initial data seeded successfully
```

## Troubleshooting

### "Failed to connect to Neo4j"
- Make sure Neo4j is running
- Check your connection URI and credentials in `.env`
- Verify the database is started in Neo4j Desktop

### "Port already in use"
- Change the PORT in `server/.env` if 3001 is taken
- Change the port in `client/vite.config.ts` if 3000 is taken

### Frontend can't connect to backend
- Make sure both servers are running
- Check that the proxy in `client/vite.config.ts` points to the correct backend port

## Next Steps

1. Open http://localhost:3000 in your browser
2. Go to **Profile** to set your dietary preferences and allergies
3. Go to **Pantry** to add ingredients you have
4. Go to **Recipes** to see personalized suggestions!

