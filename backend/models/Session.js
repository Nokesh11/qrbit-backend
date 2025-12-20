const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  classId: { type: String, required: true },
  qrToken: { type: String, required: true },
  lastRefresh: { type: Date, required: true },
  usedDevices: { type: [String], default: [] } // Array to store device fingerprints
});

module.exports = mongoose.model('Session', sessionSchema);