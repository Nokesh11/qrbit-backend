const Session = require('../models/Session');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const { redisClient } = require('../config/redis');
const jwt = require('jsonwebtoken');
const exceljs = require('exceljs');

const getAttendanceCount = async (req, res) => {
  const { sessionId } = req.query;
  try {
    const session = await Session.findOne({ sessionId });
    if (!session) return res.status(400).json({ error: 'Invalid session' });
    const classId = session.classId;

    const cacheKey = `student_count:${classId}`;
    let totalStudents = await redisClient.get(cacheKey);
    if (totalStudents) {
      totalStudents = parseInt(totalStudents, 10);
      console.log(`Student count from cache for ${classId}`);
    } else {
      totalStudents = await Student.countDocuments({ classId });
      await redisClient.set(cacheKey, totalStudents.toString(), { EX: 86400 });
    }

    const presentStudents = await Attendance.distinct('email', { sessionId, classId }).then(emails => emails.length);
    const scannedStudents = await Attendance.find({ sessionId, classId }, 'email timestamp deviceFingerprint');
    res.json({
      present: presentStudents,
      absent: totalStudents - presentStudents,
      total: totalStudents,
      scannedStudents
    });
  } catch (err) {
    console.error('Count error:', err.message);
    res.status(500).json({ error: 'Failed to fetch attendance counts' });
  }
};

const getStudentAttendance = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const email = decoded.email.toLowerCase();    // changed it to lowercase

    const cacheKey = `attendance:${email}`;
    const cachedAttendance = await redisClient.get(cacheKey);
    if(cachedAttendance) {
      console.log('Attendance from cache for', email);
      return res.json(JSON.parse(cachedAttendance));
    }

    const attendance = await Attendance.find({ email }).sort('-timestamp');
    await redisClient.set(cacheKey, JSON.stringify(attendance), { EX: 300 }); // 5 min TTL
    res.json(attendance);
  } catch (err) {
    console.error('Attendance fetch error:', err.message);
    res.status(401).json({ error: 'Invalid token' });
  }
};

const exportAttendance = async (req, res) => {
  const { sessionId } = req.query;
  try {
    const session = await Session.findOne({ sessionId });
    if (!session) return res.status(400).send('Invalid session');
    const classId = session.classId;

    const allStudents = await Student.find({ classId }, 'email name rollNo').sort('rollNo');
    const attendances = await Attendance.find({ sessionId, classId }, 'email timestamp deviceFingerprint');
    const presentEmails = new Set(attendances.map(att => att.email.toLowerCase()));

    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST +5:30
    const istDate = new Date(now.getTime() + istOffset);
    const currentDate = istDate.toISOString().split('T')[0];

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Attendance');
    worksheet.columns = [
      { header: 'S.No', key: 'sno', width: 10 },
      { header: 'Name', key: 'name', width: 20 },
      { header: 'Roll No', key: 'rollNo', width: 15 },
      { header: 'Email', key: 'email', width: 30 },
      { header: currentDate, key: currentDate, width: 10 },
      { header: 'Device Fingerprint', key: 'deviceFingerprint', width: 30 }
    ];

    allStudents.forEach((student, index) => {
      const isPresent = presentEmails.has(student.email.toLowerCase());
      const attendance = attendances.find(att => att.email.toLowerCase() === student.email.toLowerCase());
      worksheet.addRow({
        sno: index + 1,
        name: student.name || 'Unknown',
        rollNo: student.rollNo || 'N/A',
        email: student.email,
        [currentDate]: isPresent ? 1 : 0,
        deviceFingerprint: attendance ? attendance.deviceFingerprint : 'N/A'
      });
    });

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'left' };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=attendance_${classId}_${sessionId}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Export error:', err.message);
    res.status(500).send('Failed to export attendance');
  }
};

module.exports = { getAttendanceCount, getStudentAttendance, exportAttendance };
