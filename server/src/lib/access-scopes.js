export function operationScopeWhere(user) {
  if (user.role === 'SUPER_ADMIN') return {};
  const clauses = [];
  const doctors = user.scopes.filter(s => s.resource === 'doctor').map(s => s.resourceId);
  const patients = user.scopes.filter(s => s.resource === 'patient').map(s => s.resourceId);
  if (doctors.length) clauses.push({ doctorId: { in: doctors } });
  if (patients.length) clauses.push({ patientId: { in: patients } });
  return clauses.length ? { AND: clauses } : {};
}
export function patientScopeWhere(user) {
  if (user.role === 'SUPER_ADMIN') return {};
  const clauses = [];
  const patients = user.scopes.filter(s => s.resource === 'patient').map(s => s.resourceId);
  const doctors = user.scopes.filter(s => s.resource === 'doctor').map(s => s.resourceId);
  if (patients.length) clauses.push({ id: { in: patients } });
  if (doctors.length) clauses.push({ operations: { some: { doctorId: { in: doctors } } } });
  return clauses.length ? { AND: clauses } : {};
}
export function doctorScopeWhere(user) {
  if (user.role === 'SUPER_ADMIN') return {};
  const clauses = [];
  const doctors = user.scopes.filter(s => s.resource === 'doctor').map(s => s.resourceId);
  const patients = user.scopes.filter(s => s.resource === 'patient').map(s => s.resourceId);
  if (doctors.length) clauses.push({ id: { in: doctors } });
  if (patients.length) clauses.push({ operations: { some: { patientId: { in: patients } } } });
  return clauses.length ? { AND: clauses } : {};
}
export function appointmentScopeWhere(user) {
  if (user.role === 'SUPER_ADMIN') return {};
  const clauses = [];
  const doctors = user.scopes.filter(s => s.resource === 'doctor').map(s => s.resourceId);
  const patients = user.scopes.filter(s => s.resource === 'patient').map(s => s.resourceId);
  if (doctors.length) clauses.push({ doctorId: { in: doctors } });
  if (patients.length) clauses.push({ patientId: { in: patients } });
  return clauses.length ? { AND: clauses } : {};
}
export function combineWhere(base, scope) {
  return Object.keys(scope).length ? { AND: [base, scope] } : base;
}
