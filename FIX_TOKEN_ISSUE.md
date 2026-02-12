# Fix: Invalid Token Signature Issue

## Problem
The server logs show: `optionalAuth: Token verification failed: invalid signature`

This means the JWT token in your browser's localStorage was created with a different JWT_SECRET than what the server is currently using.

## Solution

**You need to log out and log back in to get a fresh token.**

### Steps:
1. Click on your profile picture in the navbar
2. Click "Logout"
3. Log back in with your email and password
4. This will create a new token with the current JWT_SECRET

### Why this happened:
- The server might have been restarted with a different JWT_SECRET
- Or the token in localStorage is from an old session
- JWT tokens are signed with a secret key, and if the secret changes, old tokens become invalid

### After logging back in:
- Your preferences and allergies will still be saved in the database
- The new token will work correctly
- Recipe filtering will work properly

## Alternative: Check Environment Variable

If you have a `.env` file in the server directory, make sure `JWT_SECRET` is set consistently:

```bash
# In server/.env
JWT_SECRET=your-secret-key-change-in-production
```

Make sure this same value is used when the server starts.


