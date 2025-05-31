// backend/middleware/authMiddleware.js

const admin = require('../config/firebaseAdmin');
const User = require('../models/User'); // ✅ Import the User model

const authenticateFirebaseUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  console.log('🔐 Incoming token:', idToken);

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    console.log('✅ Decoded user:', decodedToken);

    req.user = decodedToken;

    // ✅ Upsert user into MongoDB
    await User.findOneAndUpdate(
      { uid: decodedToken.uid },
      {
        uid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name || '',
        picture: decodedToken.picture || '',
      },
      { upsert: true, new: true }
    );

     // ✅ Log all users currently in the database
     const allUsers = await User.find();
     console.log('📄 All registered users in DB:');
     allUsers.forEach((u, i) => {
       console.log(`${i + 1}. ${u.name} (${u.email})`);
     });

    next(); // Proceed to next middleware or route handler
  } catch (error) {
    console.error('❌ Token verification error:', error.message);
    return res.status(401).json({ message: 'Unauthorized: Invalid or expired token' });
  }
};

module.exports = authenticateFirebaseUser;
