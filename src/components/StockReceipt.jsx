import React, { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api.js';

export default function StockReceipt({ token, lang, onCancel, onCreated }) {
  const ar = lang === 'ar';
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ productId: '', batchNo: '', expiryDate: '', quantity: '1', unitCost: '0' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    apiRequest('/api/inventory/products', { token })
      .then(result => setProducts(result.items || []))
      .catch(e => setError(e.message || 'Unable to load products'));
  }, [token]);
  const update = (key, value) => setForm(current => ({ ...current, [key]: value }));
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await apiRequest('/api/inventory/receipts', {
        token,
        method: 'POST',
        body: { ...form, expiryDate: form.expiryDate || null, quantity: Number(form.quantity), unitCost: Number(form.unitCost) }
      });
      onCreated();
    } catch (e) {
      setError(e.message || 'Request failed');
    } finally {
      setBusy(false);
    }
  }
  return <form className="operation-form" onSubmit={submit}>
    <div className="form-heading"><div><h2>{ar ? 'إضافة رصيد مخزون' : 'Receive stock'}</h2>
      <p>{ar ? 'كل استلام يُسجل كحركة مستقلة مع رقم التشغيلة وتاريخ الصلاحية' : 'Every receipt creates a traceable batch and stock movement'}</p></div>
      <button type="button" className="secondary" onClick={onCancel}>{ar ? 'إغلاق' : 'Close'}</button></div>
    <div className="form-grid">
      <label>{ar ? 'الصنف' : 'Product'}<select required value={form.productId} onChange={e => update('productId', e.target.value)}>
        <option value="">{ar ? 'اختر الصنف' : 'Select product'}</option>
        {products.map(p => <option key={p.id} value={p.id}>{p.sku} · {ar ? p.nameAr : p.nameEn}</option>)}
      </select></label>
      <label>{ar ? 'رقم التشغيلة' : 'Batch number'}<input required maxLength="80" value={form.batchNo} onChange={e => update('batchNo', e.target.value)} /></label>
      <label>{ar ? 'تاريخ الصلاحية' : 'Expiry date'}<input type="date" value={form.expiryDate} onChange={e => update('expiryDate', e.target.value)} /></label>
      <label>{ar ? 'الكمية المستلمة' : 'Received quantity'}<input required type="number" min="0.001" step="0.001" value={form.quantity} onChange={e => update('quantity', e.target.value)} /></label>
      <label>{ar ? 'تكلفة الوحدة (جنيه)' : 'Unit purchase cost (EGP)'}<input required type="number" min="0" step="0.01" value={form.unitCost} onChange={e => update('unitCost', e.target.value)} /></label>
    </div>
    {error && <div className="error">{error}</div>}
    <div className="form-actions"><button className="primary" disabled={busy}>{busy ? (ar ? 'جارٍ الحفظ...' : 'Saving...') : (ar ? 'تأكيد الاستلام' : 'Confirm receipt')}</button></div>
  </form>;
}
