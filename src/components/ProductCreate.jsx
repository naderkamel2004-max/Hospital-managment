import React, { useState } from 'react';
import { apiRequest } from '../lib/api.js';

export default function ProductCreate({ token, lang, canWriteCosts = false, onCancel, onCreated }) {
  const ar = lang === 'ar';
  const [form, setForm] = useState({ sku: '', nameAr: '', nameEn: '', category: 'CONSUMABLE', unit: 'piece', purchasePrice: '0', sellingPrice: '', reorderLevel: '0' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const update = (key, value) => setForm(current => ({ ...current, [key]: value }));
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await apiRequest('/api/inventory/products', {
        token, method: 'POST',
        body: { ...form, purchasePrice: canWriteCosts ? Number(form.purchasePrice) : 0, sellingPrice: canWriteCosts && form.sellingPrice !== '' ? Number(form.sellingPrice) : null, reorderLevel: Number(form.reorderLevel) }
      });
      onCreated();
    } catch (e) { setError(e.message || 'Request failed'); }
    finally { setBusy(false); }
  }
  return <form className="operation-form" onSubmit={submit}>
    <div className="form-heading"><div><h2>{ar ? 'إضافة صنف جديد' : 'Create inventory product'}</h2><p>{ar ? 'كل تركيز أو حجم دوائي يُسجل كصنف مستقل' : 'Each medication strength or pack size is a distinct SKU'}</p></div>
      <button type="button" className="secondary" onClick={onCancel}>{ar ? 'إغلاق' : 'Close'}</button></div>
    <div className="form-grid">
      <label>{ar ? 'كود الصنف SKU' : 'SKU'}<input required maxLength="50" value={form.sku} onChange={e => update('sku', e.target.value)} /></label>
      <label>{ar ? 'الاسم بالعربية' : 'Arabic name'}<input required maxLength="160" value={form.nameAr} onChange={e => update('nameAr', e.target.value)} /></label>
      <label>{ar ? 'الاسم بالإنجليزية' : 'English name'}<input required maxLength="160" value={form.nameEn} onChange={e => update('nameEn', e.target.value)} /></label>
      <label>{ar ? 'الفئة' : 'Category'}<select value={form.category} onChange={e => update('category', e.target.value)}><option value="MEDICATION">{ar ? 'دواء' : 'Medication'}</option><option value="CONSUMABLE">{ar ? 'مستهلك طبي' : 'Consumable'}</option><option value="OTHER">{ar ? 'أخرى' : 'Other'}</option></select></label>
      <label>{ar ? 'وحدة القياس' : 'Unit'}<input required maxLength="30" value={form.unit} onChange={e => update('unit', e.target.value)} /></label>
      {canWriteCosts&&<><label>{ar ? 'تكلفة الشراء الافتراضية (جنيه)' : 'Default purchase cost (EGP)'}<input required type="number" min="0" step="0.01" value={form.purchasePrice} onChange={e => update('purchasePrice', e.target.value)} /></label>
      <label>{ar ? 'سعر البيع (جنيه)' : 'Selling price (EGP)'}<input type="number" min="0" step="0.01" value={form.sellingPrice} onChange={e => update('sellingPrice', e.target.value)} /></label></>}
      <label>{ar ? 'حد إعادة الطلب' : 'Reorder level'}<input type="number" min="0" step="0.001" value={form.reorderLevel} onChange={e => update('reorderLevel', e.target.value)} /></label>
    </div>
    {error && <div className="error">{error}</div>}
    <div className="form-actions"><button className="primary" disabled={busy}>{busy ? (ar ? 'جارٍ الحفظ...' : 'Saving...') : (ar ? 'حفظ الصنف' : 'Save product')}</button></div>
  </form>;
}
