import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getSession } from '../database/neo4j.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d'; // Extended to 30 days

// Sign up
router.post('/signup', async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const session = getSession();

  try {
    // Check if user already exists
    const existingUser = await session.run(
      'MATCH (u:User {email: $email}) RETURN u',
      { email: email.toLowerCase() }
    );

    if (existingUser.records.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    await session.run(
      `CREATE (u:User {
        id: $userId,
        email: $email,
        password: $hashedPassword,
        name: $name,
        dietaryPreferences: [],
        allergies: [],
        createdAt: datetime()
      }) RETURN u`,
      {
        userId,
        email: email.toLowerCase(),
        hashedPassword,
        name: name || email.split('@')[0]
      }
    );

    // Generate JWT token
    const token = jwt.sign({ userId, email: email.toLowerCase() }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN
    });

    // Get the created user
    const userResult = await session.run(
      'MATCH (u:User {id: $userId}) RETURN u',
      { userId }
    );
    const createdUser = userResult.records[0].get('u').properties;

    res.status(201).json({
      token,
      user: {
        id: createdUser.id,
        email: createdUser.email,
        name: createdUser.name,
        age: createdUser.age,
        profilePicture: createdUser.profilePicture,
        dietaryPreferences: createdUser.dietaryPreferences || [],
        allergies: createdUser.allergies || []
      }
    });
  } catch (error) {
    console.error('Error signing up:', error);
    res.status(500).json({ error: 'Failed to create account' });
  } finally {
    await session.close();
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const session = getSession();

  try {
    const result = await session.run(
      'MATCH (u:User {email: $email}) RETURN u',
      { email: email.toLowerCase() }
    );

    if (result.records.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.records[0].get('u').properties;

    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Login attempt:', {
        email: email.toLowerCase(),
        userId: user.id,
        hasPassword: !!user.password,
        passwordLength: user.password?.length || 0,
        passwordHash: user.password?.substring(0, 20) + '...' // First 20 chars of hash
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Password comparison failed');
        // In dev, we can show more details
        return res.status(401).json({
          error: 'Invalid email or password',
          debug: {
            email: email.toLowerCase(),
            hasStoredPassword: !!user.password
          }
        });
      }
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        age: user.age,
        profilePicture: user.profilePicture,
        dietaryPreferences: user.dietaryPreferences || [],
        allergies: user.allergies || []
      }
    });
  } catch (error: any) {
    console.error('Error logging in:', error);
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      email: email
    });
    res.status(500).json({
      error: 'Failed to login',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  } finally {
    await session.close();
  }
});

// Request password reset
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  const session = getSession();

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const result = await session.run(
      'MATCH (u:User {email: $email}) RETURN u',
      { email: email.toLowerCase() }
    );

    if (result.records.length === 0) {
      // Don't reveal if user exists for security
      return res.json({
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    // Generate reset token (in production, this would be emailed)
    const resetToken = `reset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    // Store expiry as timestamp (milliseconds) - easier to work with
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour from now

    await session.run(
      `MATCH (u:User {email: $email})
       SET u.resetToken = $resetToken,
           u.resetTokenExpiry = $resetTokenExpiry
       RETURN u`,
      {
        email: email.toLowerCase(),
        resetToken,
        resetTokenExpiry
      }
    );

    // In production, send email with reset link
    // For now, return the token (only in development)
    res.json({
      message: 'Password reset token generated',
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined,
      resetLink: process.env.NODE_ENV === 'development'
        ? `/reset-password?token=${resetToken}`
        : 'Check your email for reset instructions'
    });
  } catch (error: any) {
    console.error('Error in forgot password:', error);
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      code: error?.code,
      name: error?.name
    });
    res.status(500).json({
      error: 'Failed to process password reset request',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  } finally {
    await session.close();
  }
});

// Reset password with token
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  const session = getSession();

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and new password are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const now = Date.now();
    const result = await session.run(
      `MATCH (u:User {resetToken: $token})
       WHERE u.resetTokenExpiry > $now
       RETURN u`,
      { token, now }
    );

    if (result.records.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const user = result.records[0].get('u').properties;
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await session.run(
      `MATCH (u:User {resetToken: $token})
       SET u.password = $hashedPassword,
           u.resetToken = null,
           u.resetTokenExpiry = null
       RETURN u`,
      { token, hashedPassword }
    );

    res.json({ message: 'Password reset successfully' });
  } catch (error: any) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  } finally {
    await session.close();
  }
});

// Debug endpoint to check user password (development only)
if (process.env.NODE_ENV === 'development') {
  router.post('/debug/check-password', async (req, res) => {
    const { email, password } = req.body;
    const session = getSession();

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
      const result = await session.run(
        'MATCH (u:User {email: $email}) RETURN u',
        { email: email.toLowerCase() }
      );

      if (result.records.length === 0) {
        return res.json({
          found: false,
          message: 'User not found'
        });
      }

      const user = result.records[0].get('u').properties;
      const isValid = await bcrypt.compare(password, user.password);

      return res.json({
        found: true,
        userId: user.id,
        email: user.email,
        passwordMatch: isValid,
        hasPassword: !!user.password,
        passwordHashPreview: user.password?.substring(0, 30) + '...',
        // Show what password was provided (for debugging)
        providedPasswordLength: password.length,
        providedPasswordPreview: password.substring(0, 3) + '***'
      });
    } catch (error: any) {
      console.error('Error in debug check:', error);
      res.status(500).json({ error: 'Failed to check password' });
    } finally {
      await session.close();
    }
  });

  // Admin endpoint to directly reset password (development only)
  router.post('/debug/reset-password', async (req, res) => {
    const { email, newPassword } = req.body;
    const session = getSession();

    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Email and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    try {
      const result = await session.run(
        'MATCH (u:User {email: $email}) RETURN u',
        { email: email.toLowerCase() }
      );

      if (result.records.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await session.run(
        `MATCH (u:User {email: $email})
         SET u.password = $hashedPassword,
             u.resetToken = null,
             u.resetTokenExpiry = null
         RETURN u.id as id, u.email as email`,
        { email: email.toLowerCase(), hashedPassword }
      );

      return res.json({
        success: true,
        message: 'Password reset successfully',
        email: email.toLowerCase()
      });
    } catch (error: any) {
      console.error('Error resetting password:', error);
      res.status(500).json({ error: 'Failed to reset password' });
    } finally {
      await session.close();
    }
  });

  // Debug endpoint to list all users (development only)
  router.get('/debug/users', async (req, res) => {
    const session = getSession();

    try {
      const result = await session.run(
        'MATCH (u:User) RETURN u.id as id, u.email as email, u.name as name, u.createdAt as createdAt ORDER BY u.createdAt DESC'
      );

      const users = result.records.map(record => ({
        id: record.get('id'),
        email: record.get('email'),
        name: record.get('name'),
        createdAt: record.get('createdAt')
      }));

      return res.json({ users });
    } catch (error: any) {
      console.error('Error listing users:', error);
      res.status(500).json({ error: 'Failed to list users' });
    } finally {
      await session.close();
    }
  });
}

// Get current user (protected route)
router.get('/me', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    const session = getSession();

    const result = await session.run(
      'MATCH (u:User {id: $userId}) RETURN u',
      { userId: decoded.userId }
    );

    if (result.records.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.records[0].get('u').properties;

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        age: user.age,
        profilePicture: user.profilePicture,
        dietaryPreferences: user.dietaryPreferences || [],
        allergies: user.allergies || []
      }
    });
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

export { router as authRoutes };

