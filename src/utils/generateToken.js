const jwt = require('jsonwebtoken');

const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      tokenVersion: user.tokenVersion,
    },
    process.env.JWT_PRIVATE_KEY,
    { expiresIn: '10m' }
  );
};
module.exports = generateToken;
