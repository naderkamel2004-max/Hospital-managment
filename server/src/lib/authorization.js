/**
 * Resolve effective permissions from role grants and per-user overrides.
 * An explicit user override always wins over the role-level grant.
 */
export function resolvePermissions(rolePermissions = [], userPermissions = []) {
  const effective = new Map(
    rolePermissions.map(({ permission }) => [permission.code, true])
  );

  for (const override of userPermissions) {
    effective.set(override.permission.code, override.allowed);
  }

  return [...effective]
    .filter(([, allowed]) => allowed)
    .map(([code]) => code)
    .sort();
}
