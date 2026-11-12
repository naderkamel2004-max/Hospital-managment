import jwt from 'jsonwebtoken';
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return res.status(401).json({ error: 'Authentication required' });
  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = { id: payload.sub, role: payload.role, permissions: payload.permissions ?? [] };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired access token' });
  }
}
export const requirePermission = (permission) => (req, res, next) => {
  if (!req.user?.permissions?.includes(permission) && req.user?.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};
