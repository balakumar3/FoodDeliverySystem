const jwt = require('jsonwebtoken');
const DeliveryPersonnel = require('../models/DeliveryPersonnel');

exports.protect = async (req, res, next) => {
  let token;

  // Check for the token in the Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Extract token from the Authorization header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_PRIVATE_KEY);

      // Find the delivery personnel based on the decoded ID
      const personnel = await DeliveryPersonnel.findById(decoded.userId).select('-password');
      
      if (!personnel) {
        return res.status(401).json({ message: 'Not authorized, personnel not found' });
      }

      // Attach personnel to the request object
      req.personnel = personnel;
      next();
    } catch (error) {
      console.error('Authorization error:', error.message);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};
