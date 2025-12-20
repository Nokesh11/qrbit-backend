const crypto = require('crypto');

// Point-in-polygon ray-casting for quadrilateral geoFence
const isPointInPolygon = (point, polygon) => {
  if (polygon.length !== 4) return false;
  let x = point.lng, y = point.lat;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng, yi = polygon[i].lat;
    const xj = polygon[j].lng, yj = polygon[j].lat;
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

const generateSessionId = () => Date.now().toString();
const generateQRToken = () => crypto.randomBytes(16).toString('hex');

module.exports = { isPointInPolygon, generateSessionId, generateQRToken };
