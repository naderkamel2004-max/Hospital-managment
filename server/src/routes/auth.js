import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

export const authRouter = Router();
const loginSchema = z.object({ email: z.email().max(254), password: z.string().min(1).max(128) });

authRouter.post('/login', async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid login input' });
    const email = parsed.data.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: { include: { permissions: { include: { permission: true } } } }, userPermissions: { include: { permission: true } }, scopes: true }
    });
    if (!user || !user.isActive || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const permissionMap = new Map(user.role.permissions.map((item) => [item.permission.code, true]));
    for (const override of user.userPermissions) permissionMap.set(override.permission.code, override.allowed);
    const permissions = [...permissionMap].filter(([, allowed]) => allowed).map(([code]) => code);
    const accessToken = jwt.sign(
      { role: user.role.code, permissions, scopes: user.scopes.map(({resource,resourceId})=>({resource,resourceId})) },
      process.env.JWT_ACCESS_SECRET,
      { subject: user.id, expiresIn: process.env.JWT_ACCESS_TTL || '15m', issuer: 'hms-api', audience: 'hms-client' }
    );
    await prisma.auditLog.create({ data: { userId: user.id, action: 'AUTH_LOGIN', entity: 'User', entityId: user.id, ipAddress: req.ip } });
    res.json({
      accessToken,
      tokenType: 'Bearer',
      expiresIn: process.env.JWT_ACCESS_TTL || '15m',
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role.code, permissions }
    });
  } catch (error) { next(error); }
});
