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
let operationsPermission;
let operationsCreatePermission;
let operationsUpdatePermission;
let doctorsUpdatePermission;
let inventoryAdjustPermission;
let appointmentUpdatePermission;
let appointment;
let department;
let patient;
let doctor;
let operationType;
let product;
let stockItem;
let createdOperationId;
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
  operationsPermission = await prisma.permission.create({ data: { code: 'operations.read', description: 'Read operations for analytics integration test' }});
  await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: operationsPermission.id }});
  operationsCreatePermission = await prisma.permission.create({ data: { code: 'operations.create', description: 'Create operations for validation integration test' }});
  await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: operationsCreatePermission.id }});
  doctorsUpdatePermission = await prisma.permission.create({ data: { code: 'doctors.update', description: 'Update doctors for integration test' }});
  inventoryAdjustPermission = await prisma.permission.create({ data: { code: 'inventory.adjust', description: 'Adjust stock quantities in integration test' }});
  appointmentUpdatePermission = await prisma.permission.create({ data: { code: 'appointments.update', description: 'Update appointments in integration test' }});
  await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: doctorsUpdatePermission.id }});
  operationsUpdatePermission = await prisma.permission.create({ data: { code: 'operations.update', description: 'Update operations for stock reversal integration test' }});
  await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: operationsUpdatePermission.id }});
  user = await prisma.user.create({ data: {
    email, fullName: 'CI Integration User', passwordHash: await bcrypt.hash(password, 4), roleId: role.id
  }});
});

after(async () => {
  if (createdOperationId) await prisma.operation.deleteMany({ where: { id: createdOperationId }});
  if (product) await prisma.stockMovement.deleteMany({ where: { productId: product.id }});
  if (stockItem) await prisma.stockItem.deleteMany({ where: { id: stockItem.id }});
  if (product) await prisma.product.deleteMany({ where: { id: product.id }});
  if (patient) await prisma.patient.deleteMany({ where: { id: patient.id }});
  if (doctor) await prisma.doctor.deleteMany({ where: { id: doctor.id }});
  if (department) await prisma.department.deleteMany({ where: { id: department.id }});
  if (operationType) await prisma.operationType.deleteMany({ where: { id: operationType.id }});
  if (user) await prisma.user.deleteMany({ where: { id: user.id }});
  if (role) await prisma.rolePermission.deleteMany({ where: { roleId: role.id }});
  if (role) await prisma.role.deleteMany({ where: { id: role.id }});
  if (permission) await prisma.permission.deleteMany({ where: { id: permission.id }});
  if (operationsPermission) await prisma.permission.deleteMany({ where: { id: operationsPermission.id }});
  if (operationsCreatePermission) await prisma.permission.deleteMany({ where: { id: operationsCreatePermission.id }});
  if (operationsUpdatePermission) await prisma.permission.deleteMany({ where: { id: operationsUpdatePermission.id }});
  if (doctorsUpdatePermission) await prisma.permission.deleteMany({ where: { id: doctorsUpdatePermission.id }});
  if (inventoryAdjustPermission) await prisma.permission.deleteMany({ where: { id: inventoryAdjustPermission.id }});
  if (appointment) await prisma.appointment.deleteMany({ where: { id: appointment.id }});
  if (appointmentUpdatePermission) await prisma.permission.deleteMany({ where: { id: appointmentUpdatePermission.id }});
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

  // Exercises the analytics query with a non-admin user and no resource scopes.
  const analytics = await request(app).get('/api/operations/analytics')
    .set('Authorization', `Bearer ${accessToken}`).expect(200);
  assert.equal(analytics.body.summary.operations, 0);

  const cancelledCreate = await request(app).post('/api/operations')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ operationNo: 'CI-CANCELLED', patientId: 'not-used', doctorId: 'not-used', operationTypeId: 'not-used', scheduledAt: new Date().toISOString(), status: 'CANCELLED' })
    .expect(400);
  assert.equal(cancelledCreate.body.error, 'Invalid operation data');
  department = await prisma.department.create({ data: { code: 'CI_DEPT_' + suffix, nameAr: 'اختبار', nameEn: 'CI Test' }});
  patient = await prisma.patient.create({ data: { medicalRecordNo: 'CI-' + suffix, firstName: 'Test', lastName: 'Patient' }});
  doctor = await prisma.doctor.create({ data: { fullName: 'CI Test Doctor', departmentId: department.id }});
  await request(app).patch('/api/doctors/' + doctor.id).set('Authorization', 'Bearer ' + accessToken).send({ fullName: 'CI Updated Doctor', specialty: 'Surgery' }).expect(200);
  const updatedDoctor = await prisma.doctor.findUnique({ where: { id: doctor.id }});
  assert.equal(updatedDoctor.fullName, 'CI Updated Doctor');
  appointment = await prisma.appointment.create({ data: { patientId: patient.id, doctorId: doctor.id, departmentId: department.id, startsAt: new Date(Date.now() + 86400000) }});
  await request(app).patch('/api/appointments/' + appointment.id).set('Authorization', 'Bearer ' + accessToken).send({ status: 'CONFIRMED' }).expect(403);
  await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: appointmentUpdatePermission.id }});
  const confirmedAppointment = await request(app).patch('/api/appointments/' + appointment.id).set('Authorization', 'Bearer ' + accessToken).send({ status: 'CONFIRMED' }).expect(200);
  assert.equal(confirmedAppointment.body.item.status, 'CONFIRMED');
  const cancelledAppointment = await request(app).patch('/api/appointments/' + appointment.id).set('Authorization', 'Bearer ' + accessToken).send({ status: 'CANCELLED' }).expect(200);
  assert.equal(cancelledAppointment.body.item.status, 'CANCELLED');

  operationType = await prisma.operationType.create({ data: { code: 'CI_OP_' + suffix, nameAr: 'عملية اختبار', nameEn: 'CI Test Operation' }});
  product = await prisma.product.create({ data: { sku: 'CI-SKU-' + suffix, nameAr: 'شاش اختبار', nameEn: 'CI Gauze', category: 'CONSUMABLE', unit: 'piece', purchasePrice: 2 }});
  stockItem = await prisma.stockItem.create({ data: { productId: product.id, batchNo: 'CI-BATCH-' + suffix, unitCost: 2, quantity: 5 }});
  await request(app).post('/api/inventory/adjustments').set('Authorization', 'Bearer ' + accessToken).send({ stockItemId: stockItem.id, countedQuantity: 6, reason: 'Physical stock count' }).expect(403);
  await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: inventoryAdjustPermission.id }});
  const adjusted = await request(app).post('/api/inventory/adjustments').set('Authorization', 'Bearer ' + accessToken).send({ stockItemId: stockItem.id, countedQuantity: 6, reason: 'Physical stock count' }).expect(200);
  assert.equal(adjusted.body.adjustment.delta, 1);
  assert.equal(Number(adjusted.body.item.quantity), 6);
  const adjustmentMovement = await prisma.stockMovement.findFirst({ where: { productId: product.id, movementType: 'STOCK_ADJUSTMENT' }});
  assert.equal(Number(adjustmentMovement.quantity), 1);

  const created = await request(app).post('/api/operations').set('Authorization', 'Bearer ' + accessToken).send({ operationNo: 'CI-OP-' + suffix, patientId: patient.id, doctorId: doctor.id, operationTypeId: operationType.id, scheduledAt: new Date().toISOString(), items: [{ productId: product.id, quantity: 2 }] }).expect(201);
  createdOperationId = created.body.item.id;
  let currentStock = await prisma.stockItem.findUnique({ where: { id: stockItem.id }});
  assert.equal(Number(currentStock.quantity), 4);
  await request(app).patch('/api/operations/' + createdOperationId + '/status').set('Authorization', 'Bearer ' + accessToken).send({ status: 'IN_PROGRESS' }).expect(200);
  await request(app).patch('/api/operations/' + createdOperationId + '/status').set('Authorization', 'Bearer ' + accessToken).send({ status: 'CANCELLED' }).expect(200);
  currentStock = await prisma.stockItem.findUnique({ where: { id: stockItem.id }});
  assert.equal(Number(currentStock.quantity), 6);
  await request(app).post('/api/operations').set('Authorization', 'Bearer ' + accessToken).send({ operationNo: 'CI-MANUAL-' + suffix, patientId: patient.id, doctorId: doctor.id, operationTypeId: operationType.id, scheduledAt: new Date().toISOString(), items: [{ itemName: 'Uncatalogued item', category: 'OTHER', unit: 'piece', quantity: 1, purchaseUnitPrice: 999 }] }).expect(403);
  const movements = await prisma.stockMovement.findMany({ where: { referenceId: createdOperationId }});
  assert.equal(movements.length, 2);
  assert.deepEqual(movements.map(x => x.movementType).sort(), ['OPERATION_CANCELLATION', 'OPERATION_CONSUMPTION']);

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
