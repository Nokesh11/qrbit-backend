const QRCode = require('qrcode');
const Session = require('../models/Session');
const ScannedToken = require('../models/ScannedToken');
const { getRecentTokens } = require('../utils/redisHelpers');

const generateQR = async (req, res) => {
  const { sessionId } = req.query;
  try {
    const session = await Session.findOne({ sessionId });
    if (!session) return res.status(400).json({ error: 'Invalid or inactive session' });
    const { classId, qrToken } = session;
    const qrData = `https://qr-backend-3-0.onrender.com/auth/google?sessionId=${sessionId}&classId=${classId}&token=${qrToken}&startTime=${Date.now()}`;
    const qrCode = await QRCode.toDataURL(qrData);
    res.json({ qrCode, qrUrl: qrData, sessionId, classId, qrToken });
  } catch (err) {
    console.error('QR generation error:', err.message);
    res.status(500).json({ error: 'QR generation failed' });
  }
};

const validateQR = async (req, res) => {
  const { sessionId, qrToken, deviceFingerprint } = req.query;
  try {
    const session = await Session.findOne({ sessionId });
    if (!session) {
      return res.status(400).json({ valid: false, error: 'Invalid or inactive session' });
    }

    if (!deviceFingerprint) {
      return res.status(400).json({ valid: false, error: 'Device fingerprint required' });
    }

    if (session.usedDevices.includes(deviceFingerprint)) {
      return res.status(400).json({ valid: false, error: 'This device has already marked attendance' });
    }

    const validTokens = await getRecentTokens(sessionId);
    const isTokenValid = validTokens.some(t => t.qrToken === qrToken);
    if (!isTokenValid) {
      return res.status(400).json({ valid: false, error: 'Invalid or expired QR code' });
    }

    // Store scanned token for authentication
    const expiresAt = new Date(Date.now() + 30000); // 30 seconds
    await ScannedToken.create({
      sessionId,
      qrToken,
      deviceFingerprint,
      expiresAt
    });
    res.json({ valid: true });
  } catch (err) {
    console.error('QR validation error:', err.message);
    res.status(500).json({ valid: false, error: 'Server error' });
  }
};

module.exports = { generateQR, validateQR };
