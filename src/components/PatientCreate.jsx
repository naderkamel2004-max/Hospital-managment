import React, { useState } from 'react';
import { apiRequest } from '../lib/api.js';

export default function PatientCreate({ token, lang, onCancel, onCreated }) {
  const ar = lang === 'ar';
  const [form, setForm] = useState({ medicalRecordNo: '', firstName: '', lastName: '', nationalId: '', phone: '', dateOfBirth: '', sex: '', address: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const update = (key, value) => setForm(current => ({ ...current, [key]: value }));
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const body = { ...form, dateOfBirth: form.dateOfBirth || null, sex: form.sex || null, nationalId: form.nationalId || null, phone: form.phone || null, address: form.address || null };
      await apiRequest('/api/patients', { token, method: 'POST', body });
      onCreated();
    } catch (e) {
      setError(e.message || 'Request failed');
    } finally {
      setBusy(false);
    }
  }
  return <form className="operation-form" onSubmit={submit}>
    <div className="form-heading"><div><h2>{ar ? 'تسجيل مريض جديد' : 'Register patient'}</h2><p>{ar ? 'يتم التحقق من رقم الملف والرقم القومي لمنع التكرار' : 'Medical record and national ID uniqueness is enforced by the server'}</p></div>
      <button type="button" className="secondary" onClick={onCancel}>{ar ? 'إغلاق' : 'Close'}</button></div>
    <div className="form-grid">
      <label>{ar ? 'رقم الملف الطبي' : 'Medical record number'}<input required maxLength="40" value={form.medicalRecordNo} onChange={e => update('medicalRecordNo', e.target.value)} /></label>
      <label>{ar ? 'الاسم الأول' : 'First name'}<input required maxLength="80" value={form.firstName} onChange={e => update('firstName', e.target.value)} /></label>
      <label>{ar ? 'اسم العائلة' : 'Last name'}<input required maxLength="80" value={form.lastName} onChange={e => update('lastName', e.target.value)} /></label>
      <label>{ar ? 'الرقم القومي' : 'National ID'}<input maxLength="20" value={form.nationalId} onChange={e => update('nationalId', e.target.value)} /></label>
      <label>{ar ? 'رقم الهاتف' : 'Phone'}<input maxLength="25" value={form.phone} onChange={e => update('phone', e.target.value)} /></label>
      <label>{ar ? 'تاريخ الميلاد' : 'Date of birth'}<input type="date" value={form.dateOfBirth} onChange={e => update('dateOfBirth', e.target.value)} /></label>
      <label>{ar ? 'النوع' : 'Sex'}<select value={form.sex} onChange={e => update('sex', e.target.value)}><option value="">{ar ? 'غير محدد' : 'Not specified'}</option><option value="MALE">{ar ? 'ذكر' : 'Male'}</option><option value="FEMALE">{ar ? 'أنثى' : 'Female'}</option><option value="OTHER">{ar ? 'آخر' : 'Other'}</option></select></label>
      <label>{ar ? 'العنوان' : 'Address'}<input maxLength="500" value={form.address} onChange={e => update('address', e.target.value)} /></label>
    </div>
    {error && <div className="error">{error}</div>}
    <div className="form-actions"><button className="primary" disabled={busy}>{busy ? (ar ? 'جارٍ الحفظ...' : 'Saving...') : (ar ? 'حفظ المريض' : 'Save patient')}</button></div>
  </form>;
}
