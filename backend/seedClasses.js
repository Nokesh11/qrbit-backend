const mongoose = require('mongoose');
const Class = require('./models/Class');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection error:', err));

const classes = [
  { classId: 'ICS101', name: 'Computer Programming' },
  { classId: 'IMA101', name: 'Discrete Structures and Matrix Algebra' },
  { classId: 'IEC101', name: 'Overview of Computers Workshop' },
  { classId: 'IEC102', name: 'Digital Logic Design' },
  { classId: 'ISK101', name: 'Essential English (bridge course)' },
  { classId: 'IMA102', name: 'Probability and Statistics' },
  { classId: 'ICS201', name: 'Data Structures and Algorithms' },
  { classId: 'IEC204', name: 'Signals and Systems' },
  { classId: 'ICS103', name: 'Computer Architecture' },
  { classId: 'ISK102', name: 'Operational Communication' },

  { classId: 'IMA103', name: 'Real Analysis, Numerical Analysis and Calculus' },
  { classId: 'ICS102', name: 'Object Oriented Programming' },
  { classId: 'ICS202', name: 'Advanced Data Structures and Algorithms' },
  { classId: 'ICS203', name: 'Operating Systems' },
  { classId: 'ICS204', name: 'Database Management Systems' },
  { classId: 'ISK201', name: 'Professional Communication' },

  { classId: 'IEC255', name: 'Computer and Communication Networks' },
  { classId: 'ICS301', name: 'Fundamentals of Full Stack Development' },
  { classId: 'ICS400', name: 'Theory of Computation' },
  { classId: 'ICS341', name: 'Artificial Intelligence' },
  { classId: 'ISK202', name: 'Advanced Communication Skills' },
];

const seedClasses = async () => {
  try {
    console.log('Clearing existing classes...');
    await Class.deleteMany({});
    console.log('Inserting new classes...');
    await Class.insertMany(classes);
    console.log('Classes seeded successfully:', classes.length);
  } catch (err) {
    console.error('Seeding error:', err);
  } finally {
    mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
};

seedClasses();