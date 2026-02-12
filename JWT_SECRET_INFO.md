# JWT_SECRET Configuration

## Where JWT_SECRET is Used

JWT_SECRET is used in **3 places** in the codebase:

1. **`server/src/routes/authRoutes.ts`** (line 8)
   - Used to **sign** tokens when users login/signup
   - `const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';`

2. **`server/src/middleware/auth.ts`** (line 16 - authenticateToken)
   - Used to **verify** tokens for protected routes
   - `const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';`

3. **`server/src/middleware/auth.ts`** (line 37 - optionalAuth)
   - Used to **verify** tokens for optional authentication (like recipe suggestions)
   - `const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';`

## How It's Loaded

The server loads environment variables from `server/.env` using `dotenv.config()` in `server/src/index.ts` (line 10).

## Current Default Value

All three places use the same default fallback:
```
'your-secret-key-change-in-production'
```

## What It Should Be

JWT_SECRET should be:
- A **long, random string** (at least 32 characters)
- **The same value** in all places
- **Set in `server/.env`** file

## How to Fix

### Option 1: Use the Default (Quick Fix)
If you want to use the default value, make sure `server/.env` either:
- Doesn't have `JWT_SECRET` set, OR
- Has `JWT_SECRET=your-secret-key-change-in-production`

### Option 2: Set a Custom Secret (Recommended for Production)
1. Generate a secure secret:
   ```bash
   openssl rand -base64 32
   ```

2. Add to `server/.env`:
   ```
   JWT_SECRET=your-generated-secret-here
   ```

3. **IMPORTANT**: Make sure this same value is used consistently. If you change it:
   - All existing tokens will become invalid
   - Users will need to log out and log back in

## Current Issue

Your token has an "invalid signature" because:
- The token in localStorage was created with one JWT_SECRET
- The server is now using a different JWT_SECRET

**Solution**:
1. Check `server/.env` and make sure `JWT_SECRET` is set correctly
2. If you changed it, either:
   - Change it back to what it was when you logged in, OR
   - Log out and log back in to get a new token

## To Check Your Current .env File

The `.env` file is located at: `server/.env`

You can check it manually or run:
```bash
cat server/.env
```

Make sure `JWT_SECRET` is set to the same value that was used when you created your current token, or log out/in to get a fresh token.


