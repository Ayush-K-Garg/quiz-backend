const admin = require('firebase-admin');
const path = require('path');

// Load the service account key JSON file
const serviceAccount = require(path.resolve(__dirname, 'serviceAccountKey.json'));

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

module.exports = admin;
