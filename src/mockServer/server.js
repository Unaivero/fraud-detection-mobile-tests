/**
 * Mock API Server to simulate backend behavior
 * Used for testing when a real backend is unavailable
 */
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.MOCK_SERVER_PORT || 3000;

// In-memory storage
const users = new Map();
const bets = new Map();
const sessions = new Map();
const accountFlags = new Map();

// Middleware
app.use(bodyParser.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }
  
  const session = sessions.get(token);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
  
  req.user = session.user;
  next();
};

// --- AUTH ROUTES ---

// Register new user
app.post('/auth/register', (req, res) => {
  const userData = req.body;
  
  // Validate required fields
  if (!userData.username || !userData.email || !userData.password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // Check if user already exists
  if (Array.from(users.values()).some(user => user.username === userData.username || user.email === userData.email)) {
    return res.status(409).json({ error: 'Username or email already exists' });
  }
  
  // Create user
  const userId = Date.now().toString();
  const user = {
    id: userId,
    ...userData,
    createdAt: new Date().toISOString(),
    status: 'active'
  };
  
  users.set(userId, user);
  accountFlags.set(userId, []);
  
  // Create and return auth token
  const token = Buffer.from(`${userId}:${Date.now()}`).toString('base64');
  sessions.set(token, { user, createdAt: new Date() });
  
  res.status(201).json({
    message: 'User registered successfully',
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      status: user.status
    }
  });
});

// Login
app.post('/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  // Find user
  const user = Array.from(users.values()).find(u => u.username === username && u.password === password);
  
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Check if account is blocked
  if (user.status === 'blocked') {
    return res.status(403).json({ error: 'Account is blocked' });
  }
  
  // Create and return auth token
  const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');
  sessions.set(token, { user, createdAt: new Date() });
  
  res.status(200).json({
    message: 'Login successful',
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      status: user.status
    }
  });
});

// --- BETS ROUTES ---

// Place a bet
app.post('/bets/place', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const betData = req.body;
  
  // Validate bet data
  if (!betData.matchId || !betData.amount || !betData.odds || !betData.selection) {
    return res.status(400).json({ error: 'Missing required bet information' });
  }
  
  // === FRAUD DETECTION LOGIC ===
  let isFraudulent = false;
  let fraudReason = '';
  
  let fraudType = '';
  
  // Check for negative bet amount
  if (parseFloat(betData.amount) <= 0) {
    isFraudulent = true;
    fraudReason = 'Fraud detected: Invalid bet amount';
    fraudType = 'negative-amount';
  }
  
  // Check for odds manipulation (unusually high odds)
  if (parseFloat(betData.odds) > 20) {
    isFraudulent = true;
    fraudReason = 'Fraud detected: Suspicious odds manipulation';
    fraudType = 'odds-manipulation';
  }
  
  // Check for altered match ID
  if (betData.matchId.includes('-altered')) {
    isFraudulent = true;
    fraudReason = 'Fraud detected: Match ID tampering detected';
    fraudType = 'match-alteration';
  }
  
  // Check for timestamp manipulation (past betting)
  if (betData.timestamp && new Date(betData.timestamp) < new Date(Date.now() - 3600000)) {
    isFraudulent = true;
    fraudReason = 'Fraud detected: Timestamp manipulation detected';
    fraudType = 'timestamp-manipulation';
  }
  
  // Check for suspicious fields that shouldn't be present
  if (betData.serverBypass || betData.adminApproval) {
    isFraudulent = true;
    fraudReason = 'Fraud detected: Unauthorized request fields';
    fraudType = 'request-tampering';
  }
  
  // If fraud detected, flag account and reject bet
  if (isFraudulent) {
    // Add flag to user account
    const userFlags = accountFlags.get(userId) || [];
    userFlags.push({
      type: 'fraud_attempt',
      reason: fraudReason,
      timestamp: new Date().toISOString(),
      data: betData
    });
    accountFlags.set(userId, userFlags);
    
    // If multiple fraud attempts, block the account
    if (userFlags.filter(flag => flag.type === 'fraud_attempt').length >= 3) {
      const user = users.get(userId);
      if (user) {
        user.status = 'blocked';
        users.set(userId, user);
      }
    }
    
    return res.status(400).json({
      error: fraudReason,
      fraudType: fraudType,
      details: fraudReason
    });
  }
  
  // Process legitimate bet
  const betId = `BET-${Date.now()}-${userId.substring(0, 5)}`;
  const bet = {
    id: betId,
    userId,
    ...betData,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  
  bets.set(betId, bet);
  
  res.status(201).json({
    message: 'Bet placed successfully',
    betId: bet.id,
    bet: {
      id: bet.id,
      matchId: bet.matchId,
      selection: bet.selection,
      odds: bet.odds,
      amount: bet.amount,
      status: 'pending'
    }
  });
});

// Get bet history
app.get('/bets/history', authenticateToken, (req, res) => {
  const userId = req.user.id;
  
  // Find all bets for this user
  const userBets = Array.from(bets.values())
    .filter(bet => bet.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  res.status(200).json(userBets.map(bet => ({
    id: bet.id,
    matchId: bet.matchId,
    selection: bet.selection,
    odds: bet.odds,
    amount: bet.amount,
    status: bet.status,
    createdAt: bet.createdAt
  })));
});

// --- ACCOUNT STATUS ROUTES ---

// Get account status
app.get('/users/account-status', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const user = users.get(userId);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const userFlags = accountFlags.get(userId) || [];
  const hasFraudFlags = userFlags.some(flag => flag.type === 'fraud_attempt');
  
  res.status(200).json({
    accountId: userId,
    status: user.status,
    flags: userFlags,
    restrictions: hasFraudFlags ? ['betting_restricted', 'withdrawal_restricted'] : [],
    verificationStatus: user.status === 'blocked' ? 'rejected' : 'verified',
    fraudWarnings: userFlags.filter(flag => flag.type === 'fraud_attempt').length,
    lastUpdated: new Date().toISOString()
  });
});

// --- HEALTH CHECK ---

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// --- END OF ROUTES ---

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    message: `${req.method} ${req.url} is not a valid endpoint`
  });
});

// Start server only if this file is run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Mock API server running on port ${PORT}`);
  });
}

module.exports = app;
