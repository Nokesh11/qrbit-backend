const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const Session = require('../models/Session');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const ScannedToken = require('../models/ScannedToken');
const Class = require('../models/Class');
const { getRecentTokens } = require('../utils/redisHelpers');
const { isPointInPolygon } = require('../utils/helpers');
const { redisClient } = require('../config/redis');
const FRONTEND_URI = process.env.FRONTEND_URI;

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const googleAuth = async (req, res) => {
  const { sessionId, classId, token, startTime, deviceFingerprint } = req.query;
  try {
    const session = await Session.findOne({ sessionId });
    console.log('Auth attempt:', { sessionId, classId, token, startTime, deviceFingerprint, sessionExists: !!session });

    if (!session || session.classId !== classId || !token || !startTime) {
      console.log('Rejected at /auth/google:', { sessionId, reason: 'Invalid or inactive session' });
      return res.redirect(`${FRONTEND_URI}/student?error=${encodeURIComponent('Invalid or inactive session')}`);
    }

    if (!deviceFingerprint) {
      console.log('Rejected at /auth/google:', { sessionId, reason: 'Device fingerprint required' });
      return res.redirect(`${FRONTEND_URI}/student?error=${encodeURIComponent('Device fingerprint required')}`);
    }

    if (session.usedDevices.includes(deviceFingerprint)) {
      console.log('Rejected: Device already used', { sessionId, deviceFingerprint });
      return res.redirect(`${FRONTEND_URI}?error=${encodeURIComponent('This device has already marked attendance for this session')}`);
    }

    // Check if token is valid (current or within 5-second grace period)
    const validTokens = await getRecentTokens(sessionId);
    const isTokenValid = validTokens.some(t => t.qrToken === token);
    if (!isTokenValid) {
      console.log('Rejected: Invalid QR token', { sessionId, token });
      return res.redirect(`${FRONTEND_URI}/student?error=${encodeURIComponent('Invalid or expired QR code')}`);
    }

    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    if (isNaN(lat) || isNaN(lng)) {
      console.log('Rejected: Location required', { sessionId });
      return res.redirect(`${FRONTEND_URI}/student?error=${encodeURIComponent('Location access required')}`);
    }

    const classDoc = await Class.findOne({ classId });
    if (!classDoc) {
      return res.redirect(`${FRONTEND_URI}/student?error=${encodeURIComponent('Class not found')}`);
    }
    if (!classDoc.geoFence || classDoc.geoFence.length !== 4) {
      console.log('Rejected: Geo-fence not configured', { classId });
      return res.redirect(`${FRONTEND_URI}/student?error=${encodeURIComponent('Classroom geo-fence not configured')}`);
    }

    const userPoint = { lat, lng };
    const isInside = isPointInPolygon(userPoint, classDoc.geoFence);
    if (!isInside) {
      console.log('Rejected: Outside geo-fence', { sessionId, lat, lng });
      return res.redirect(`${FRONTEND_URI}/student?error=${encodeURIComponent('Not within classroom boundaries')}`);
    }
    console.log('Geo-fence validated for:', { lat, lng });

    // Store scanned token with 30-second expiration
    const expiresAt = new Date(Date.now() + 30000);
    await ScannedToken.create({
      sessionId,
      qrToken: token,
      deviceFingerprint,
      expiresAt
    });
    console.log('Stored scanned token:', { sessionId, qrToken: token, deviceFingerprint, expiresAt });

    // Update state to include lat/lng
    const stateObj = { sessionId, token, startTime, deviceFingerprint, lat, lng };
    const url = client.generateAuthUrl({
      scope: ['email', 'profile'],
      state: JSON.stringify( stateObj ),
      prompt: 'select_account'
    });
    res.redirect(url);
  } catch (err) {
    console.error('Auth error:', err.message);
    res.redirect(`${FRONTEND_URI}/student?error=${encodeURIComponent('Server error')}`);
  }
};

const googleAuthCallback = async (req, res, io) => { // io passed as arg or we need a way to access it. refactor later to use socket handler or import io? 
    // Wait, io is needed here to emit attendanceUpdate. 
    // Option 1: Pass io to controller logic.
    // Option 2: Export io from a module.
    // I will use `req.app.get('io')` if I attach it in index.js, or just export it.
    // Let's assume req.app.get('io') for now, standard express pattern.
    const ioInstance = req.app.get('io'); 

  const { code, state } = req.query;
  try {
    const { sessionId, token, startTime, deviceFingerprint, lat, lng } = JSON.parse(state);
    const session = await Session.findOne({ sessionId });
    console.log('Callback session check:', { sessionId, token, startTime, deviceFingerprint, sessionExists: !!session });
    
    if (!session) {
      console.log('Rejected at callback:', { sessionId, token, reason: 'Invalid or inactive session' });
      return res.redirect(`${FRONTEND_URI}/student?error=${encodeURIComponent('Invalid or inactive session')}`);
    }

    // Check if scanned token is valid (within 30-second buffer)
    const scannedToken = await ScannedToken.findOne({ sessionId, qrToken: token, deviceFingerprint });
    if (!scannedToken) {
      console.log('Rejected: Invalid or expired scanned token', { sessionId, token, deviceFingerprint });
      return res.redirect(`${FRONTEND_URI}/student?error=${encodeURIComponent('Invalid or expired QR code')}`);
    }

    const timeSinceScanStart = Date.now() - parseInt(startTime);
    if (timeSinceScanStart > 300000) {
      console.log('Rejected: QR scan expired', { sessionId, token, timeSinceScanStart });
      return res.redirect(`${FRONTEND_URI}/student?error=${encodeURIComponent('Invalid or expired QR code')}`);
    }

    // Check if device has already marked attendance
    if (session.usedDevices.includes(deviceFingerprint)) {
      console.log('Rejected: Device already used', { sessionId, deviceFingerprint });
      return res.redirect(`${FRONTEND_URI}/student?error=${encodeURIComponent('This device has already marked attendance for this session')}`);
    }

    // Get email and perform authentication
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);
    const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: process.env.GOOGLE_CLIENT_ID });
    const { email } = ticket.getPayload();
    console.log('Authenticated email:', email);

    // Check if email has already marked attendance
    const existingAttendance = await Attendance.findOne({ email, sessionId });
    if (existingAttendance) {
      console.log('Rejected: User already marked attendance', { sessionId, email, deviceFingerprint });
      return res.redirect(`${FRONTEND_URI}/student?error=${encodeURIComponent('You have already marked attendance for this session')}`);
    }

    if (!email.endsWith('@iiits.in')) {
      console.log('Rejected: Not an @iiits.in email');
      return res.redirect(`${FRONTEND_URI}/student?error=${encodeURIComponent('Only @iiits.in accounts are allowed')}`);
    }

    const classId = session.classId;
    const student = await Student.findOne({ email: email.toLowerCase(), classId });
    if (!student) {
      console.log('Rejected: Student not enrolled in class', { email, classId });
      return res.redirect(`${FRONTEND_URI}/student?error=${encodeURIComponent('Student not enrolled in this class')}`);
    }

    console.log('Saving attendance for:', { email, sessionId, classId, lat, lng, deviceFingerprint });
    
    // In the upsert:
    const result = await Attendance.findOneAndUpdate(
      { email, sessionId, classId },
      { 
        email, 
        sessionId, 
        classId, 
        timestamp: new Date(), 
        deviceFingerprint,
        location: { lat, lng } 
      },
      { upsert: true, new: true }
    );
    console.log('Attendance update result:', result);

    if (result) {
      session.usedDevices.push(deviceFingerprint);
      await session.save();
      console.log('Updated usedDevices:', session.usedDevices);
      const totalStudents = await Student.countDocuments({ classId });
      const presentStudents = await Attendance.distinct('email', { sessionId, classId }).then(emails => emails.length);
      const scannedStudents = await Attendance.find({ sessionId, classId }, 'email timestamp deviceFingerprint');
      
      console.log('Emitting update:', { present: presentStudents, absent: totalStudents - presentStudents, total: totalStudents });
      if (ioInstance) {
          ioInstance.to(sessionId).emit('attendanceUpdate', {
            present: presentStudents,
            absent: totalStudents - presentStudents,
            total: totalStudents,
            scannedStudents
        });
      }

      // Invalidate student count cache
      await redisClient.del(`student_count:${classId}`);

      // Invalidate attendance history cache for this email
      await redisClient.del(`attendance:${email.toLowerCase()}`);

      // Clean up the scanned token after successful attendance
      await ScannedToken.deleteOne({ sessionId, qrToken: token, deviceFingerprint });
    }

    const jwtToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.redirect(`${FRONTEND_URI}/student?token=${jwtToken}&marked=true&sessionId=${sessionId}`);
  } catch (err) {
    console.error('Auth error:', err.message);
    res.redirect(`${FRONTEND_URI}/student?error=${encodeURIComponent('Authentication failed')}`);
  }
};

module.exports = { googleAuth, googleAuthCallback };
