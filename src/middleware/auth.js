const jwt = require('jsonwebtoken');

const TIER_LIMITS = {
    basic: {
          name: 'Basic',
          picksPerPeriod: 2,
          periodDays: 3,
          price: 20
    },
    pro: {
          name: 'Pro',
          picksPerPeriod: 10,
          periodDays: 1,
          price: 50
    },
    elite: {
          name: 'Elite',
          picksPerPeriod: Infinity,
          periodDays: 1,
          price: 200
    }
};

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
        return res.status(401).json({ error: 'Access token required' });
  }

  try {
        const user = jwt.verify(token, process.env.JWT_SECRET);
        req.user = user;
        next();
  } catch (error) {
        return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

// checkPickLimit middleware (stub - extend as needed)
function checkPickLimit(req, res, next) {
    next();
}

module.exports = {
    authenticateToken,
    verifyToken: authenticateToken,
    checkPickLimit,
    TIER_LIMITS
};
