import test from 'node:test';
import assert from 'node:assert/strict';
import { resolvePermissions } from '../src/lib/authorization.js';

test('role grants are included by default', () => {
  const permissions = resolvePermissions([
    { permission: { code: 'patients.read' } },
    { permission: { code: 'patients.create' } }
  ]);
  assert.deepEqual(permissions, ['patients.create', 'patients.read']);
});

test('explicit user denial overrides a role grant', () => {
  const permissions = resolvePermissions(
    [{ permission: { code: 'patients.read' } }],
    [{ permission: { code: 'patients.read' }, allowed: false }]
  );
  assert.deepEqual(permissions, []);
});

test('explicit user grant adds a permission absent from the role', () => {
  const permissions = resolvePermissions(
    [],
    [{ permission: { code: 'inventory.receive' }, allowed: true }]
  );
  assert.deepEqual(permissions, ['inventory.receive']);
});

test('last explicit override wins if duplicate inputs are supplied', () => {
  const permissions = resolvePermissions(
    [{ permission: { code: 'users.manage' } }],
    [
      { permission: { code: 'users.manage' }, allowed: false },
      { permission: { code: 'users.manage' }, allowed: true }
    ]
  );
  assert.deepEqual(permissions, ['users.manage']);
});

test('empty inputs resolve to no permissions', () => {
  assert.deepEqual(resolvePermissions(), []);
});
