// Middleware to authorize user roles
function authorizeRole(roles) {
    return (req, res, next) => {
      // Ensure req.user exists, which is set by the authenticateToken middleware
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
  
      // Check if the user's role is in the allowed roles
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Forbidden: You do not have the required role' });
      }
  
      next();
    };
  }
  
  module.exports = authorizeRole;