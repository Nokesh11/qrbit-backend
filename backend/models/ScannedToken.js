const mongoose = require('mongoose');

const scannedTokenSchema = new mongoose.Schema({
  sessionId: { type: String, required: true },
  qrToken: { type: String, required: true },
  deviceFingerprint: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: { expires: '0s' } } // Auto-delete after expiration
});

module.exports = mongoose.model('ScannedToken', scannedTokenSchema);