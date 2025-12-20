const mongoose = require('mongoose');
const Student = require('./models/Student');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

const students = [
  { email: 'nokesh.l22@iiits.in', name: 'Nokesh Lavudi', rollNo: 'S20220010125', classId: 'ICS101' },
  { email: 'vaibhav.t22@iiits.in', name: 'Vaibhav Tiwade', rollNo: 'S20220010230', classId: 'ICS101' },
  { email: 'himanshu.l22@iiits.in', name: 'Himanshu Labana', rollNo: 'S20220010254', classId: 'IMA101' },
  { email: 'ankit.k22@iiits.in', name: 'Ankit Kushwaha', rollNo: 'S20220010257', classId: 'ICS101' },
  { email: 'amit.k22@iiits.in', name: 'Amit Kumar', rollNo: 'S20220010260', classId: 'ICS101' },

  { email: 'sahil.g22@iiits.in', name: 'Sahil Goyat', rollNo: 'S20220010190', classId: 'ICS101' },
  { email: 'abhishek.sy22@iiits.in', name: 'Abhishek Sahay', rollNo: 'S20220010003', classId: 'ICS101' },
  { email: 'satish.p22@iiits.in', name: 'Satish Pandhare', rollNo: 'S20220010163', classId: 'ICS101' },
  { email: 'harshwardhan.p22@iiits.in', name: 'Harsh Wardhan Patil', rollNo: 'S20220010167', classId: 'ICS101' },
  { email: 'rudrapratap.s22@iiits.in', name: 'Rudra Pratap Singh', rollNo: 'S20220010312', classId: 'ICS101' },
  { email: 'yadnyesh.k22@iiits.in', name: 'Yadnyesh Patil', rollNo: 'S20220010145', classId: 'ICS101' },
  { email: 'piyush.s22@iiits.in', name: 'Piyush Singh', rollNo: 'S20220010208', classId: 'ICS101' },
  // Add more students (e.g., 80 total)
];

const seedStudents = async () => {
  try {
    console.log('Clearing existing students...');
    await Student.deleteMany({}); // Clear all students
    console.log('Inserting new students...');
    await Student.insertMany(students);
    console.log('Students seeded successfully:', students.length);
  } catch (err) {
    console.error('Seeding error:', err);
  } finally {
    mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
};

seedStudents();