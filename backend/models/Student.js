// server/models/Student.js
const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  email: { type: String, required: true },
  name: { type: String, required: true },
  rollNo: { type: String, required: true },
  classId: { type: String, required: true }
  // Removed unique: true from email to allow same student in multiple classes
  // If uniqueness per class is needed, add compound index below
});

// Optional: Unique email per classId
studentSchema.index({ email: 1, classId: 1 }, { unique: true });

module.exports = mongoose.model('Student', studentSchema);