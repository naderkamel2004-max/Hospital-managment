import test from 'node:test';
import assert from 'node:assert/strict';
import { appointmentScopeWhere, combineWhere, doctorScopeWhere, operationScopeWhere, patientScopeWhere } from '../src/lib/access-scopes.js';
const user = (scopes = [], role = 'STAFF') => ({ role, scopes });
test('super administrator has no resource restriction', () => {
 assert.deepEqual(operationScopeWhere(user([{resource:'doctor',resourceId:'d1'}],'SUPER_ADMIN')), {});
});
test('operation doctor and patient scopes intersect', () => {
 assert.deepEqual(operationScopeWhere(user([{resource:'doctor',resourceId:'d1'},{resource:'patient',resourceId:'p1'}])), {AND:[{doctorId:{in:['d1']}},{patientId:{in:['p1']}}]});
});
test('patient reads honor both patient and doctor scopes', () => {
 assert.deepEqual(patientScopeWhere(user([{resource:'patient',resourceId:'p1'},{resource:'doctor',resourceId:'d1'}])), {AND:[{id:{in:['p1']}},{operations:{some:{doctorId:{in:['d1']}}}}]});
});
test('doctor directory honors doctor and patient scopes', () => {
 assert.deepEqual(doctorScopeWhere(user([{resource:'doctor',resourceId:'d1'},{resource:'patient',resourceId:'p1'}])), {AND:[{id:{in:['d1']}},{operations:{some:{patientId:{in:['p1']}}}}]});
});
test('appointments honor both resource scopes', () => {
 assert.deepEqual(appointmentScopeWhere(user([{resource:'doctor',resourceId:'d1'},{resource:'patient',resourceId:'p1'}])), {AND:[{doctorId:{in:['d1']}},{patientId:{in:['p1']}}]});
});
test('scope filters combine with requested filters', () => {
 assert.deepEqual(combineWhere({doctorId:'d2'},operationScopeWhere(user([{resource:'doctor',resourceId:'d1'}]))),{AND:[{doctorId:'d2'},{AND:[{doctorId:{in:['d1']}}]}]});
});
