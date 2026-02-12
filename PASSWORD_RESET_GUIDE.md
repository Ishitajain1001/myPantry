# Password Reset Guide

## Understanding Password Storage

**Important**: Passwords are **hashed** using bcrypt, which means:
- ✅ You **cannot** view the original password (it's one-way encrypted)
- ✅ You **can** reset the password to a new one
- ✅ You **can** check if a password matches (for login)

## How the Forgot Password Feature Works

1. **Request Reset** (`POST /api/auth/forgot-password`):
   - User enters their email
   - System generates a reset token
   - Token is stored in the database with an expiry (1 hour)
   - In development mode, the token is shown on screen
   - In production, this would be emailed

2. **Reset Password** (`POST /api/auth/reset-password`):
   - User enters the reset token and new password
   - System validates the token hasn't expired
   - Password is hashed and saved
   - Token is cleared

## Development Tools (Available in Development Mode Only)

### 1. Direct Password Reset (Easiest)
```bash
# Reset password directly by email
curl -X POST http://localhost:5000/api/auth/debug/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "newPassword": "your-new-password"
  }'
```

Or use the browser console:
```javascript
fetch('/api/auth/debug/reset-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'your-email@example.com',
    newPassword: 'your-new-password'
  })
}).then(r => r.json()).then(console.log)
```

### 2. Check Password Match
```bash
# Test if a password matches
curl -X POST http://localhost:5000/api/auth/debug/check-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "password-to-test"
  }'
```

### 3. List All Users
```bash
# See all users in the database
curl http://localhost:5000/api/auth/debug/users
```

## Querying Neo4j Database Directly

If you have access to Neo4j Browser or Cypher shell:

### View All Users
```cypher
MATCH (u:User)
RETURN u.id, u.email, u.name, u.createdAt
ORDER BY u.createdAt DESC
```

### View Specific User
```cypher
MATCH (u:User {email: 'your-email@example.com'})
RETURN u
```

### View User's Password Hash (for verification)
```cypher
MATCH (u:User {email: 'your-email@example.com'})
RETURN u.email, u.password,
       substring(u.password, 0, 30) + '...' as passwordHashPreview
```

### Reset Password Directly in Database (Not Recommended)
```cypher
// First, hash the password using Node.js or the debug endpoint
// Then update:
MATCH (u:User {email: 'your-email@example.com'})
SET u.password = '$2a$10$...hashed-password-here...'
RETURN u
```

**Note**: You need to hash the password first. It's easier to use the debug endpoint above.

## Troubleshooting Forgot Password

If the forgot password feature isn't loading:

1. **Check the browser console** for JavaScript errors
2. **Check the server console** for backend errors
3. **Verify the API endpoint** is accessible:
   ```bash
   curl -X POST http://localhost:5000/api/auth/forgot-password \
     -H "Content-Type: application/json" \
     -d '{"email": "test@example.com"}'
   ```
4. **Check if NODE_ENV is set to 'development'** to see reset tokens:
   ```bash
   # In your .env file or when starting server:
   NODE_ENV=development
   ```

## Quick Fix: Reset Password Now

The fastest way to reset your password in development:

1. Open browser console (F12)
2. Run:
   ```javascript
   fetch('/api/auth/debug/reset-password', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       email: 'YOUR_EMAIL_HERE',
       newPassword: 'YOUR_NEW_PASSWORD_HERE'
     })
   })
   .then(r => r.json())
   .then(data => {
     console.log('Password reset result:', data);
     if (data.success) {
       alert('Password reset! You can now login with your new password.');
     } else {
       alert('Error: ' + data.error);
     }
   });
   ```

Replace `YOUR_EMAIL_HERE` and `YOUR_NEW_PASSWORD_HERE` with your actual values.
