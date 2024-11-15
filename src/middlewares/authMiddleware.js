const jwt = require('jsonwebtoken');
const DeliveryPersonnel = require('../models/DeliveryPersonnel');

const protect = async (req, res, next) => {
  let token = req.headers.authorization && req.headers.authorization.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_PRIVATE_KEY);
      req.personnel = await DeliveryPersonnel.findById(decoded.id).select('-password');
      next();
    } catch (error) {
      res.status(401).json({ message: 'Not authorized' });
    }
  } else {
    res.status(401).json({ message: 'No token' });
  }
};

module.exports = { protect };
