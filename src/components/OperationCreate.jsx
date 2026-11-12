import React, { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api.js';

export default function OperationCreate({ token, lang, onCancel, onCreated }) {
  const ar = lang === 'ar';
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [types, setTypes] = useState([]);
  const [products, setProducts] = useState([]);
  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [operationTypeId, setOperationTypeId] = useState('');
  const [scheduledAt, setScheduledAt] = useState(() => {
    const date = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
    return date.toISOString().slice(0, 16);
  });
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([{ productId: '', quantity: '1' }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiRequest('/api/patients?page=1&pageSize=100', { token }),
      apiRequest('/api/doctors', { token }),
      apiRequest('/api/operations/types', { token }),
      apiRequest('/api/inventory/products', { token })
    ]).then(([p, d, t, i]) => {
      setPatients(p.items || []);
      setDoctors(d.items || []);
      setTypes(t.items || []);
      setProducts(i.items || []);
    }).catch(e => setError(e.message || 'Unable to load form data'))
      .finally(() => setLoading(false));
  }, [token]);

  const updateItem = (index, field, value) => setItems(current =>
    current.map((item, i) => i === index ? { ...item, [field]: value } : item)
  );

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (!patientId || !doctorId || !operationTypeId) {
        throw new Error(ar ? 'اختر المريض والطبيب ونوع العملية' : 'Select a patient, doctor and procedure');
      }
      const usedItems = items.filter(x => x.productId && Number(x.quantity) > 0)
        .map(x => ({ productId: x.productId, quantity: Number(x.quantity) }));
      await apiRequest('/api/operations', {
        token,
        method: 'POST',
        body: {
          operationNo: 'OP-' + Date.now(),
          patientId,
          doctorId,
          operationTypeId,
          scheduledAt: new Date(scheduledAt).toISOString(),
          notes: notes || null,
          status: 'SCHEDULED',
          items: usedItems
        }
      });
      onCreated();
    } catch (e) {
      setError(e.message || 'Request failed');
    } finally {
      setBusy(false);
    }
  }

  return <form className="operation-form" onSubmit={submit}>
    <div className="form-heading">
      <div><h2>{ar ? 'تسجيل عملية جديدة' : 'Register operation'}</h2>
        <p>{ar ? 'يتم خصم المستهلكات من المخزون بعد التحقق من الرصيد' : 'Inventory is deducted only after server-side stock validation'}</p></div>
      <button type="button" className="secondary" onClick={onCancel}>{ar ? 'إغلاق' : 'Close'}</button>
    </div>
    {loading ? <div className="state">{ar ? 'جارٍ تحميل البيانات...' : 'Loading form data...'}</div> : <>
      <div className="form-grid">
        <label>{ar ? 'المريض' : 'Patient'}
          <select required value={patientId} onChange={e => setPatientId(e.target.value)}>
            <option value="">{ar ? 'اختر المريض' : 'Select patient'}</option>
            {patients.map(p => <option key={p.id} value={p.id}>{p.medicalRecordNo} · {p.firstName} {p.lastName}</option>)}
          </select></label>
        <label>{ar ? 'الطبيب' : 'Doctor'}
          <select required value={doctorId} onChange={e => setDoctorId(e.target.value)}>
            <option value="">{ar ? 'اختر الطبيب' : 'Select doctor'}</option>
            {doctors.map(d => <option key={d.id} value={d.id}>{d.fullName}</option>)}
          </select></label>
        <label>{ar ? 'نوع العملية' : 'Procedure type'}
          <select required value={operationTypeId} onChange={e => setOperationTypeId(e.target.value)}>
            <option value="">{ar ? 'اختر النوع' : 'Select type'}</option>
            {types.map(t => <option key={t.id} value={t.id}>{ar ? t.nameAr : t.nameEn}</option>)}
          </select></label>
        <label>{ar ? 'موعد العملية' : 'Scheduled at'}
          <input required type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} /></label>
      </div>
      <div className="form-subhead"><h3>{ar ? 'الأدوية والمستهلكات' : 'Medication and consumables'}</h3>
        <button type="button" className="secondary" onClick={() => setItems(x => [...x, { productId: '', quantity: '1' }])}>{ar ? 'إضافة صنف' : 'Add item'}</button></div>
      {items.map((item, index) => <div className="item-row" key={index}>
        <select value={item.productId} onChange={e => updateItem(index, 'productId', e.target.value)}>
          <option value="">{ar ? 'اختر صنفًا من المخزون' : 'Select inventory item'}</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.sku} · {ar ? p.nameAr : p.nameEn} ({p.onHand ?? 0} {p.unit})</option>)}
        </select>
        <input aria-label={ar ? 'الكمية' : 'Quantity'} type="number" min="0.001" step="0.001" value={item.quantity} onChange={e => updateItem(index, 'quantity', e.target.value)} />
        <button type="button" className="remove-item" disabled={items.length === 1} onClick={() => setItems(x => x.filter((_, i) => i !== index))}>×</button>
      </div>)}
      <label className="notes-field">{ar ? 'ملاحظات' : 'Notes'}
        <textarea rows="3" maxLength="5000" value={notes} onChange={e => setNotes(e.target.value)} /></label>
    </>}
    {error && <div className="error">{error}</div>}
    <div className="form-actions"><button className="primary" disabled={busy || loading}>{busy ? (ar ? 'جارٍ الحفظ...' : 'Saving...') : (ar ? 'حفظ العملية' : 'Save operation')}</button></div>
    <small className="form-hint">{ar ? 'الأسعار والتكلفة مصدرها المخزون والخادم، ولا يتم الوثوق بقيم يرسلها المتصفح.' : 'Costs are sourced and validated by the server, never trusted from browser input.'}</small>
  </form>;
}
