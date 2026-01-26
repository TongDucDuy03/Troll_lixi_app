import express from 'express';
import GameState from '../models/GameState.js';
import SpinHistory from '../models/SpinHistory.js';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Public route: Get game state by share token (no auth required)
router.get('/share/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    // Find user by shareToken
    const user = await User.findOne({ shareToken: token });
    if (!user) {
      return res.status(404).json({ error: 'Share link not found' });
    }

    // Get game state for this user
    let gameState = await GameState.findOne({ userId: user._id });
    if (!gameState) {
      // Create initial game state if doesn't exist
      gameState = new GameState({
        userId: user._id,
        roleInventories: {},
        riggingConfig: {
          next_spin_mode: 'random',
          target_value: null,
          fake_value: null,
        },
      });
      await gameState.save();
    }

    res.json({
      userId: user._id.toString(),
      userName: user.displayName,
      roleInventories: gameState.roleInventories || {},
      riggingConfig: gameState.riggingConfig,
    });
  } catch (error) {
    console.error('Get shared game state error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Public route: Add spin history by share token (no auth required)
router.post('/share/:token/spin-history', async (req, res) => {
  try {
    const { token } = req.params;
    const { timestamp, userName, roleId, displayValue, realValue, scenarioUsed } = req.body;

    // Find user by shareToken
    const user = await User.findOne({ shareToken: token });
    if (!user) {
      return res.status(404).json({ error: 'Share link not found' });
    }

    const history = new SpinHistory({
      userId: user._id,
      timestamp,
      userName,
      roleId,
      displayValue,
      realValue,
      scenarioUsed,
    });

    await history.save();
    res.status(201).json({ message: 'Spin history saved', history });
  } catch (error) {
    console.error('Save shared spin history error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Public route: Get spin history by share token (no auth required)
router.get('/share/:token/spin-history', async (req, res) => {
  try {
    const { token } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    
    // Find user by shareToken
    const user = await User.findOne({ shareToken: token });
    if (!user) {
      return res.status(404).json({ error: 'Share link not found' });
    }
    
    const history = await SpinHistory.find({ userId: user._id })
      .sort({ timestamp: -1 })
      .limit(limit)
      .select('-__v');

    res.json(history);
  } catch (error) {
    console.error('Get shared spin history error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// All other routes require authentication
router.use(authenticateToken);

// Get game state
router.get('/state', async (req, res) => {
  try {
    const userId = req.user.userId;
    let gameState = await GameState.findOne({ userId });

    if (!gameState) {
      // Create initial game state
      gameState = new GameState({
        userId,
        roleInventories: {},
        riggingConfig: {
          next_spin_mode: 'random',
          target_value: null,
          fake_value: null,
        },
      });
      await gameState.save();
    }

    res.json({
      roleInventories: gameState.roleInventories || {},
      riggingConfig: gameState.riggingConfig,
    });
  } catch (error) {
    console.error('Get game state error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update game state
router.put('/state', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { roleInventories, riggingConfig } = req.body;

    let gameState = await GameState.findOne({ userId });

    if (!gameState) {
      gameState = new GameState({ userId });
    }

    // Update role inventories
    if (roleInventories) {
      gameState.roleInventories = roleInventories;
    }

    // Update rigging config
    if (riggingConfig) {
      gameState.riggingConfig = riggingConfig;
    }

    gameState.updatedAt = Date.now();
    await gameState.save();

    res.json({
      roleInventories: gameState.roleInventories || {},
      riggingConfig: gameState.riggingConfig,
    });
  } catch (error) {
    console.error('Update game state error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add spin history
router.post('/spin-history', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { timestamp, userName, roleId, displayValue, realValue, scenarioUsed } = req.body;

    const history = new SpinHistory({
      userId,
      timestamp,
      userName,
      roleId,
      displayValue,
      realValue,
      scenarioUsed,
    });

    await history.save();
    res.status(201).json({ message: 'Spin history saved' });
  } catch (error) {
    console.error('Save spin history error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get spin history
router.get('/spin-history', async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit) || 50;
    
    const history = await SpinHistory.find({ userId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .select('-__v');

    res.json(history);
  } catch (error) {
    console.error('Get spin history error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete all spin history
router.delete('/spin-history', async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const result = await SpinHistory.deleteMany({ userId });
    
    res.json({ 
      message: 'All spin history deleted',
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    console.error('Delete spin history error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
