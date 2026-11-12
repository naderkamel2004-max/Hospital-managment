import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

const suffix = randomUUID().replaceAll('-', '').slice(0, 16);
const email = `ci-${suffix}@example.test`;
const password = 'CI-Only-Strong-Password-2026!';
let role;
let permission;
let user;
let accessToken;

before(async () => {
  role = await prisma.role.create({ data: {
    code: `CI_ROLE_${suffix}`, nameAr: 'اختبار', nameEn: 'CI Test Role'
  }});
  permission = await prisma.permission.create({ data: {
    code: `ci.test.${suffix}`, description: 'Temporary permission used by CI integration tests'
  }});
  await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id }});
  user = await prisma.user.create({ data: {
    email, fullName: 'CI Integration User', passwordHash: await bcrypt.hash(password, 4), roleId: role.id
  }});
});

after(async () => {
  if (user) await prisma.user.deleteMany({ where: { id: user.id }});
  if (role) await prisma.role.deleteMany({ where: { id: role.id }});
  if (permission) await prisma.permission.deleteMany({ where: { id: permission.id }});
  await prisma.$disconnect();
});

test('health endpoint is available without authentication', async () => {
  const response = await request(app).get('/api/health').expect(200);
  assert.equal(response.body.status, 'ok');
});

test('login, live permission revocation, and account lockout are enforced', async () => {
  const login = await request(app).post('/api/auth/login')
    .send({ email, password }).expect(200);
  assert.equal(login.headers['cache-control'], 'no-store');
  assert.ok(login.body.accessToken);
  accessToken = login.body.accessToken;

  const me = await request(app).get('/api/me')
    .set('Authorization', `Bearer ${accessToken}`).expect(200);
  assert.ok(me.body.user.permissions.includes(permission.code));

  await prisma.rolePermission.delete({ where: {
    roleId_permissionId: { roleId: role.id, permissionId: permission.id }
  }});
  const afterRevocation = await request(app).get('/api/me')
    .set('Authorization', `Bearer ${accessToken}`).expect(200);
  assert.ok(!afterRevocation.body.user.permissions.includes(permission.code));

  await prisma.user.update({ where: { id: user.id }, data: { status: 'LOCKED' }});
  await request(app).get('/api/me')
    .set('Authorization', `Bearer ${accessToken}`).expect(401);
});
