import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { resolvePermissions } from '../lib/authorization.js';

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token, ...extra] = header.split(' ');
  if (scheme !== 'Bearer' || !token || extra.length) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET, {
      issuer: 'hms-api',
      audience: 'hms-client',
      algorithms: ['HS256']
    });
    if (typeof payload.sub !== 'string' || !payload.sub) {
      return res.status(401).json({ error: 'Invalid or expired access token' });
    }

    // Resolve authorization from the database on every request. This makes
    // account deactivation, role changes, permission overrides and scope
    // changes effective immediately instead of waiting for the JWT to expire.
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        isActive: true,
        status: true,
        role: {
          select: {
            code: true,
            permissions: { select: { permission: { select: { code: true } } } }
          }
        },
        userPermissions: {
          select: { allowed: true, permission: { select: { code: true } } }
        },
        scopes: { select: { resource: true, resourceId: true } }
      }
    });

    if (!user || !user.isActive || user.status !== 'ACTIVE') {
      return res.status(401).json({ error: 'Account is inactive or locked' });
    }

    req.user = {
      id: user.id,
      role: user.role.code,
      permissions: resolvePermissions(user.role.permissions, user.userPermissions),
      scopes: user.scopes
    };
    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError' || error.name === 'NotBeforeError') {
      return res.status(401).json({ error: 'Invalid or expired access token' });
    }
    return next(error);
  }
}

export const requirePermission = (permission) => (req, res, next) => {
  if (!req.user?.permissions?.includes(permission) && req.user?.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};
