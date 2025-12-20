const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  classId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  geoFence: {
    type: [{
      lat: { type: Number, required: true },
      lng: { type: Number, required: true }
    }],
    default: [],
    validate: {
      validator: function(v) {
        return v.length === 0 || v.length === 4; // Allow empty or exactly 4
      },
      message: 'geoFence must have exactly 4 points'
    }
  }
});

module.exports = mongoose.model('Class', classSchema);