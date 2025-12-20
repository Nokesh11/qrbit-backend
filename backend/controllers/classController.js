const Class = require('../models/Class');
const { redisClient } = require('../config/redis');

const getClasses = async (req, res) => {
  try {
    const cachedClasses = await redisClient.get('classes');
    if (cachedClasses) {
      console.log('Classes from cache');
      return res.json(JSON.parse(cachedClasses));
    }
    const classes = await Class.find({}, 'classId name geoFence');
    await redisClient.set('classes', JSON.stringify(classes), { EX: 3600 });
    console.log('Classes fetched from DB:', classes);
    console.log('Total classes returned:', classes.length);
    res.json(classes);
  } catch (err) {
    console.error('Error fetching classes:', err.message);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
};

const createClass = async (req, res) => {
  try {
    const { classId, name, geoFence } = req.body;
    if (!classId || !name) {
      return res.status(400).json({ error: 'classId and name required' });
    }
    if (geoFence && geoFence.length !== 4) {
      return res.status(400).json({ error: 'geoFence must have exactly 4 points' });
    }
    const newClass = new Class({ classId, name, geoFence: geoFence || [] });
    await newClass.save();
    // Invalidate cache
    await redisClient.del('classes');
    res.status(201).json(newClass);
  } catch (err) {
    console.error('Class creation error:', err.message);
    res.status(500).json({ error: 'Failed to create class' });
  }
};

module.exports = { getClasses, createClass };
