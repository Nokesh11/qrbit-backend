const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    email: { type: String, required: true},
    sessionId: { type: String, required: true},
    classId: { type: String, required: true },
    timestamp: { type: Date, default: Date.now},
    deviceFingerprint: { type: String, required: true }, // Add this field
    location: {
        lat: { type: Number },
        lng: { type: Number }
    }
});

module.exports = mongoose.model('Attendance', attendanceSchema);