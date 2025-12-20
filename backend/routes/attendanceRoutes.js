const express = require('express');
const router = express.Router();
const { getAttendanceCount, getStudentAttendance, exportAttendance } = require('../controllers/attendanceController');

router.get('/attendance/count', getAttendanceCount);
router.get('/student/attendance', getStudentAttendance);
router.get('/export', exportAttendance);

module.exports = router;
