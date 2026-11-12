import React, { useEffect, useState } from 'react';
import { Activity, CalendarDays, ClipboardList, Languages, LayoutDashboard, LogOut, Package, Search, ShieldCheck, Stethoscope, Users, HeartPulse, RefreshCw } from 'lucide-react';
import { apiRequest } from './lib/api.js';
import './styles.css';
import OperationCreate from './components/OperationCreate.jsx';
import PatientCreate from './components/PatientCreate.jsx';
import StockReceipt from './components/StockReceipt.jsx';
import ProductCreate from './components/ProductCreate.jsx';
import Appointments from './components/Appointments.jsx';

const text = {
 ar: {title:'نظام إدارة المستشفى',subtitle:'منصة التشغيل والإدارة الطبية',login:'تسجيل الدخول',email:'البريد الإلكتروني',password:'كلمة المرور',submit:'دخول آمن',dashboard:'لوحة التحكم',operations:'العمليات الجراحية',patients:'المرضى',doctors:'الأطباء',inventory:'المخزون',users:'المستخدمون',appointments:'المواعيد',welcome:'مرحباً بك',overview:'ملخص أداء المستشفى',opsCount:'عدد العمليات',patientsCount:'المرضى',doctorsCount:'الأطباء',deliveries:'الولادات',cost:'إجمالي التكلفة',recent:'أحدث العمليات',number:'رقم العملية',patient:'المريض',doctor:'الطبيب',type:'نوع العملية',date:'التاريخ',status:'الحالة',search:'ابحث...',loading:'جارٍ تحميل البيانات...',empty:'لا توجد بيانات',logout:'تسجيل الخروج',language:'English',retry:'إعادة المحاولة',forbidden:'ليس لديك صلاحية لعرض هذا القسم',loginError:'بيانات الدخول غير صحيحة أو تعذر الاتصال بالخادم',scheduled:'مجدولة',inProgress:'جارية',completed:'مكتملة',cancelled:'ملغاة',sku:'الكود',name:'الاسم',onHand:'الرصيد المتاح'},
 en: {title:'Hospital Management System',subtitle:'Clinical operations platform',login:'Sign in',email:'Email',password:'Password',submit:'Secure sign in',dashboard:'Dashboard',operations:'Surgical Operations',patients:'Patients',doctors:'Doctors',inventory:'Inventory',users:'Users',appointments:'Appointments',welcome:'Welcome back',overview:'Hospital performance overview',opsCount:'Operations',patientsCount:'Patients',doctorsCount:'Doctors',deliveries:'Deliveries',cost:'Total cost',recent:'Recent operations',number:'Operation no.',patient:'Patient',doctor:'Doctor',type:'Procedure',date:'Date',status:'Status',search:'Search...',loading:'Loading...',empty:'No records found',logout:'Sign out',language:'العربية',retry:'Retry',forbidden:'You do not have permission to view this section',loginError:'Invalid credentials or API connection failed',scheduled:'Scheduled',inProgress:'In progress',completed:'Completed',cancelled:'Cancelled',sku:'SKU',name:'Name',onHand:'Available stock'}
};
const nav = [['dashboard','dashboard',LayoutDashboard],['operations','operations',ClipboardList],['patients','patients',Users],['doctors','doctors',Stethoscope],['inventory','inventory',Package],['appointments','appointments',CalendarDays],['users','users',ShieldCheck]];
const apiPaths = {dashboard:'/api/dashboard/summary',operations:'/api/operations',patients:'/api/patients?page=1&pageSize=50',doctors:'/api/doctors',inventory:'/api/inventory/products',appointments:'/api/appointments',users:'/api/users'};
const statusText = (v,t) => ({SCHEDULED:t.scheduled,IN_PROGRESS:t.inProgress,COMPLETED:t.completed,CANCELLED:t.cancelled}[v] || v || '—');
const dateText = (v,lang) => v ? new Intl.DateTimeFormat(lang==='ar'?'ar-EG':'en-GB',{dateStyle:'medium'}).format(new Date(v)) : '—';

export default function App() {
 const [lang,setLang]=useState('ar');
 const [token,setToken]=useState('');
 const [user,setUser]=useState(null);
 const [permissions,setPermissions]=useState([]);
 const [showOperationForm,setShowOperationForm]=useState(false);
 const [showPatientForm,setShowPatientForm]=useState(false);
 const [showReceiptForm,setShowReceiptForm]=useState(false);
 const [showProductForm,setShowProductForm]=useState(false);
 const [selectedPatient,setSelectedPatient]=useState(null);
 const [selectedDoctor,setSelectedDoctor]=useState(null);
 const [active,setActive]=useState('dashboard');
 const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState('');
 const [data,setData]=useState(null);
 const [query,setQuery]=useState('');
 const t=text[lang], rtl=lang==='ar';
 useEffect(()=>{document.documentElement.lang=lang;document.documentElement.dir=rtl?'rtl':'ltr';document.body.dir=rtl?'rtl':'ltr';},[lang,rtl]);
 async function signIn(e) {
  e.preventDefault();setBusy(true);setError('');
  try { const result=await apiRequest('/api/auth/login',{method:'POST',body:{email,password}});const session=await apiRequest('/api/me',{token:result.accessToken});setPermissions(session.user.permissions||[]);setToken(result.accessToken);setUser({...result.user,role:session.user.role}); }
  catch { setError(t.loginError); } finally { setBusy(false); }
 }
 async function load(section) {
  if(!token)return;
  setLoading(true);setError('');setData(null);
  try { setData(await apiRequest(apiPaths[section],{token})); }
  catch(e) { setError(e.status===403?t.forbidden:(e.status===0?t.loginError:(e.message||t.empty))); }
  finally { setLoading(false); }
 }
 useEffect(()=>{if(token)load(active);},[token,active]);
 function logout(){setToken('');setUser(null);setPermissions([]);setData(null);setShowOperationForm(false);setShowPatientForm(false);setShowReceiptForm(false);setShowProductForm(false);setSelectedPatient(null);setSelectedDoctor(null);setActive('dashboard');setError('');}
 if(!token) return <div className="login-screen" dir={rtl?'rtl':'ltr'}>
  <form className="login-card" onSubmit={signIn}>
   <div className="brand-symbol"><HeartPulse size={30}/></div><h1>{t.title}</h1><p>{t.subtitle}</p>
   <h2>{t.login}</h2>
   <label>{t.email}<input type="email" required autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)}/></label>
   <label>{t.password}<input type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/></label>
   {error&&<div className="error">{error}</div>}
   <button className="primary" disabled={busy}>{busy?t.loading:t.submit}</button>
   <button type="button" className="lang-switch" onClick={()=>setLang(rtl?'en':'ar')}><Languages size={16}/>{t.language}</button>
   <small className="secure-note"><ShieldCheck size={14}/> {rtl?'الصلاحيات يتم التحقق منها عند كل طلب':'Permissions are checked on every request'}</small>
  </form>
 </div>;
 const items=(data?.items||[]).filter(item=>!query||JSON.stringify(item).toLowerCase().includes(query.toLowerCase()));
 return <div className="app" dir={rtl?'rtl':'ltr'}>
  <aside className="sidebar"><div className="brand"><span className="brand-symbol"><HeartPulse/></span><div><b>{t.title}</b><small>{t.subtitle}</small></div></div>
   <div className="nav-title">{rtl?'القائمة الرئيسية':'MAIN MENU'}</div>
   {nav.filter(([id])=>id==='dashboard'?permissions.includes('dashboard.read')||user?.role==='SUPER_ADMIN':id==='users'?user?.role==='SUPER_ADMIN':permissions.includes(({operations:'operations.read',patients:'patients.read',doctors:'doctors.read',inventory:'inventory.read',appointments:'appointments.read'})[id])).map(([id,key,Icon])=><button key={id} className={active===id?'nav-link selected':'nav-link'} onClick={()=>{setActive(id);setQuery('');}}><Icon size={18}/>{t[key]}</button>)}
   <div className="sidebar-foot"><ShieldCheck size={16}/>{rtl?'جلسة آمنة':'Secure session'}</div>
  </aside>
  <main className="main"><header className="topbar"><span>{t.dashboard} / {t[active]}</span><div className="top-actions"><label className="search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={t.search}/></label><button className="secondary" onClick={()=>setLang(rtl?'en':'ar')}><Languages size={16}/>{t.language}</button><div className="user"><b>{user?.fullName||'—'}</b><small>{user?.role||'—'}</small></div><button className="secondary" onClick={logout}><LogOut size={16}/>{t.logout}</button></div></header>
   <section className="content"><div className="heading"><div><small>{t.title}</small><h1>{active==='dashboard'?t.welcome:t[active]}</h1><p>{t.overview}</p></div><div className="heading-actions">{active==='operations'&&permissions.includes('operations.create')&&<button className="primary" onClick={()=>setShowOperationForm(v=>!v)}>{showOperationForm?(rtl?'إغلاق':'Close'):(rtl?'إضافة عملية':'New operation')}</button>}{active==='patients'&&permissions.includes('patients.create')&&<button className="primary" onClick={()=>setShowPatientForm(v=>!v)}>{showPatientForm?(rtl?'إغلاق':'Close'):(rtl?'إضافة مريض':'New patient')}</button>}{active==='inventory'&&permissions.includes('inventory.manage')&&<button className="primary" onClick={()=>setShowProductForm(v=>!v)}>{showProductForm?(rtl?'إغلاق':'Close'):(rtl?'إضافة صنف':'New product')}</button>}{active==='inventory'&&permissions.includes('inventory.read')&&permissions.includes('inventory.receive')&&permissions.includes('inventory.costs.write')&&<button className="primary" onClick={()=>setShowReceiptForm(v=>!v)}>{showReceiptForm?(rtl?'إغلاق':'Close'):(rtl?'استلام مخزون':'Receive stock')}</button>}<button className="secondary" onClick={()=>load(active)}><RefreshCw size={16}/>{t.retry}</button></div></div>
   {selectedDoctor&&active==='doctors'?<DoctorEdit doctor={selectedDoctor} token={token} lang={lang} onCancel={()=>setSelectedDoctor(null)} onSaved={()=>{setSelectedDoctor(null);load('doctors');}}/>:selectedPatient&&active==='patients'?<PatientProfile patientId={selectedPatient} token={token} lang={lang} canEdit={permissions.includes('patients.update')} onBack={()=>setSelectedPatient(null)}/>:showOperationForm&&active==='operations'?<OperationCreate token={token} lang={lang} onCancel={()=>setShowOperationForm(false)} onCreated={()=>{setShowOperationForm(false);load('operations');}}/>:showPatientForm&&active==='patients'?<PatientCreate token={token} lang={lang} onCancel={()=>setShowPatientForm(false)} onCreated={()=>{setShowPatientForm(false);load('patients');}}/>:showReceiptForm&&active==='inventory'?<StockReceipt token={token} lang={lang} onCancel={()=>setShowReceiptForm(false)} onCreated={()=>{setShowReceiptForm(false);load('inventory');}}/>:showProductForm&&active==='inventory'?<ProductCreate token={token} lang={lang} canWriteCosts={permissions.includes('inventory.costs.write')} onCancel={()=>setShowProductForm(false)} onCreated={()=>{setShowProductForm(false);load('inventory');}}/>:loading?<div className="state"><Activity/>{t.loading}</div>:error?<div className="state error">{error}</div>:active==='dashboard'?<Dashboard data={data||{}} t={t} lang={lang}/>:active==='appointments'?<Appointments token={token} lang={lang} permissions={permissions} onChanged={()=>load('appointments')}/>:active==='inventory'?<InventoryPanel token={token} lang={lang} items={items} permissions={permissions} onChanged={()=>load('inventory')}/>:<Records section={active} items={items} t={t} lang={lang} token={token} canUpdate={permissions.includes('operations.update')} onChanged={()=>load(active)} onPatientSelect={setSelectedPatient} canEditDoctors={permissions.includes('doctors.update')} onDoctorEdit={setSelectedDoctor}/>}
   <footer>© {new Date().getFullYear()} {t.title} · HMS</footer></section>
  </main>
 </div>;
}
function InventoryPanel({token,lang,items,permissions,onChanged}){
 const ar=lang==='ar',canAdjust=permissions.includes('inventory.adjust'),[counts,setCounts]=useState({}),[reasons,setReasons]=useState({}),[busy,setBusy]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState(''),[movements,setMovements]=useState([]),[showMoves,setShowMoves]=useState(false);
 async function loadMoves(){setError('');try{const r=await apiRequest('/api/inventory/movements',{token});setMovements(r.items||[]);setShowMoves(true);}catch(e){setError(e.message||'Unable to load stock movements');}}
 async function adjust(batch){setBusy(batch.id);setError('');setNotice('');try{const countedQuantity=Number(counts[batch.id]??batch.quantity);if(!Number.isFinite(countedQuantity)||countedQuantity<0)throw new Error(ar?'الكمية يجب أن تكون صفر أو أكثر':'Quantity must be zero or greater');const reason=(reasons[batch.id]||'').trim();if(reason.length<5)throw new Error(ar?'اكتب سبب التسوية (5 أحرف على الأقل)':'Enter an adjustment reason (at least 5 characters)');const r=await apiRequest('/api/inventory/adjustments',{token,method:'POST',body:{stockItemId:batch.id,countedQuantity,reason}});setNotice(ar?'تم تحديث رصيد التشغيلة':'Batch quantity adjusted');setCounts(v=>({...v,[batch.id]:String(r.item.quantity)}));onChanged?.();if(showMoves)await loadMoves();}catch(e){setError(e.message||'Adjustment failed');}finally{setBusy('');}}
 const rows=items.flatMap(p=>(p.stockItems||[]).map(b=>({product:p,batch:b})));
 const movementName=m=>({RECEIPT:ar?'استلام':'Receipt',OPERATION_CONSUMPTION:ar?'صرف لعملية':'Operation use',OPERATION_CANCELLATION:ar?'استرجاع إلغاء عملية':'Operation reversal',STOCK_ADJUSTMENT:ar?'تسوية جرد':'Stock adjustment'}[m]||m);
 return <section className="patient-profile"><div className="profile-toolbar"><span>{ar?'أرصدة التشغيلات والجرد الفعلي':'Batch balances and physical counts'}</span><button className="secondary" onClick={loadMoves}>{ar?'سجل حركات المخزون':'Stock movement history'}</button></div>
 {error&&<div className="error">{error}</div>}{notice&&<div className="notice">{notice}</div>}
 {!rows.length?<div className="state">{ar?'لا توجد تشغيلات لها رصيد متاح':'No batches with available stock'}</div>:<div className="table-wrap"><table><thead><tr><th>{ar?'الصنف':'Product'}</th><th>{ar?'رقم التشغيلة':'Batch'}</th><th>{ar?'الصلاحية':'Expiry'}</th><th>{ar?'الرصيد بالنظام':'System qty'}</th><th>{ar?'الجرد الفعلي':'Counted qty'}</th><th>{ar?'سبب التسوية':'Reason'}</th><th>{ar?'إجراء':'Action'}</th></tr></thead><tbody>{rows.map(({product:p,batch:b})=><tr key={b.id}><td>{p.nameAr||p.nameEn}<small className="subline">{p.sku}</small></td><td>{b.batchNo}</td><td>{b.expiryDate?new Intl.DateTimeFormat(ar?'ar-EG':'en-US').format(new Date(b.expiryDate)):'—'}</td><td>{b.quantity}</td><td><input className="inline-input" type="number" min="0" step="0.001" value={counts[b.id]??b.quantity} onChange={e=>setCounts(v=>({...v,[b.id]:e.target.value}))} disabled={!canAdjust}/></td><td><input className="inline-input reason-input" value={reasons[b.id]||''} onChange={e=>setReasons(v=>({...v,[b.id]:e.target.value}))} placeholder={ar?'سبب الجرد':'Count reason'} disabled={!canAdjust}/></td><td>{canAdjust?<button className="row-edit" disabled={busy===b.id||Number(counts[b.id]??b.quantity)===Number(b.quantity)} onClick={()=>adjust(b)}>{busy===b.id?(ar?'حفظ...':'Saving...'):(ar?'تسوية':'Adjust')}</button>:'—'}</td></tr>)}</tbody></table></div>}
 {showMoves&&<article className="panel"><div className="form-heading"><h2>{ar?'سجل حركات المخزون':'Stock movement history'}</h2><button className="secondary" onClick={()=>setShowMoves(false)}>{ar?'إغلاق':'Close'}</button></div>{!movements.length?<p>{ar?'لا توجد حركات في آخر 30 يومًا':'No movements in the last 30 days'}</p>:<div className="table-wrap"><table><thead><tr><th>{ar?'التاريخ':'Date'}</th><th>{ar?'الصنف':'Product'}</th><th>{ar?'التشغيلة':'Batch'}</th><th>{ar?'نوع الحركة':'Movement'}</th><th>{ar?'الكمية (+/-)':'Qty (+/-)'}</th><th>{ar?'المستخدم':'Performed by'}</th></tr></thead><tbody>{movements.map(m=><tr key={m.id}><td>{new Intl.DateTimeFormat(ar?'ar-EG':'en-US',{dateStyle:'short',timeStyle:'short'}).format(new Date(m.createdAt))}</td><td>{m.product?.nameAr||m.product?.nameEn}</td><td>{m.stockItem?.batchNo||'—'}</td><td>{movementName(m.movementType)}</td><td>{m.quantity}</td><td>{m.performedById||'—'}</td></tr>)}</tbody></table></div>}</article>}
 </section>;
}

function Dashboard({data,t,lang}) {
 const metrics=[[t.opsCount,data.operations??'—',ClipboardList],[t.patientsCount,data.patients??'—',Users],[t.doctorsCount,data.doctors??'—',Stethoscope],[t.deliveries,data.deliveries??'—',CalendarDays],[t.cost,data.totalCost===undefined?'—':new Intl.NumberFormat(lang==='ar'?'ar-EG':'en-US',{style:'currency',currency:'EGP'}).format(data.totalCost),Activity]];
 return <div className="metrics">{metrics.map(([label,value,Icon])=><article className="metric" key={label}><span><Icon size={18}/></span><small>{label}</small><strong>{value}</strong></article>)}</div>;
}
function Records({section,items,t,lang,token,canUpdate,onChanged,onPatientSelect,canEditDoctors,onDoctorEdit}) {
 const [actionBusy,setActionBusy]=useState('');
 const [actionError,setActionError]=useState('');
 async function changeStatus(id,status){setActionBusy(id);setActionError('');try{await apiRequest('/api/operations/'+id+'/status',{token,method:'PATCH',body:{status}});onChanged();}catch(e){setActionError(e.message||'Request failed');}finally{setActionBusy('');}}
 const cols={
  operations:[[t.number,x=>x.operationNo],[t.patient,x=>x.patient?.firstName+' '+x.patient?.lastName],[t.doctor,x=>x.doctor?.fullName],[t.type,x=>x.operationType?.nameAr||x.operationType?.nameEn],[t.date,x=>dateText(x.scheduledAt,lang)],[t.status,x=>statusText(x.status,t)]],
  patients:[[t.patient,x=>x.firstName+' '+x.lastName],[t.number,x=>x.medicalRecordNo],[t.date,x=>dateText(x.createdAt,lang)]],
  doctors:[[t.doctor,x=>x.fullName],[t.type,x=>x.specialty||'—']],
  inventory:[[t.sku,x=>x.sku],[t.name,x=>x.nameAr||x.nameEn],[t.onHand,x=>x.onHand??'—']],
  users:[[t.name,x=>x.fullName],[t.email,x=>x.email],[t.status,x=>x.status]]
 }[section]||[];
 if(!items.length)return <div className="state">{t.empty}</div>;
 return <div className="table-wrap"><table><thead><tr>{cols.map(([name])=><th key={name}>{name}</th>)}{section==='doctors'&&canEditDoctors&&<th>{lang==='ar'?'الإجراء':'Actions'}</th>}{section==='operations'&&canUpdate&&<th>{lang==='ar'?'الإجراء':'Actions'}</th>}</tr></thead><tbody>{items.map((item,i)=><tr key={item.id||i}>{cols.map(([name,get],colIndex)=><td key={name}>{section==='patients'&&colIndex===0?<button className="table-link" onClick={()=>onPatientSelect?.(item.id)}>{get(item)||'—'}</button>:get(item)||'—'}</td>)}{section==='doctors'&&canEditDoctors&&<td><button className='row-edit' onClick={()=>onDoctorEdit?.(item)}>{lang==='ar'?'تعديل':'Edit'}</button></td>}{section==='operations'&&canUpdate&&<td><div className="row-actions">{item.status==='SCHEDULED'&&<><button disabled={actionBusy===item.id} onClick={()=>changeStatus(item.id,'IN_PROGRESS')}>{lang==='ar'?'بدء':'Start'}</button><button disabled={actionBusy===item.id} onClick={()=>changeStatus(item.id,'CANCELLED')}>{lang==='ar'?'إلغاء':'Cancel'}</button></>}{item.status==='IN_PROGRESS'&&<><button disabled={actionBusy===item.id} onClick={()=>changeStatus(item.id,'COMPLETED')}>{lang==='ar'?'إتمام':'Complete'}</button><button disabled={actionBusy===item.id} onClick={()=>changeStatus(item.id,'CANCELLED')}>{lang==='ar'?'إلغاء':'Cancel'}</button></>}</div></td>}</tr>)}</tbody></table>{actionError&&<div className="error" style={{padding:'10px 14px'}}>{actionError}</div>}<small>{items.length} {lang==='ar'?'سجل':'records'}</small></div>;
}


function PatientProfile({patientId,token,lang,canEdit,onBack}) {
 const [item,setItem]=useState(null);const [error,setError]=useState('');const [loading,setLoading]=useState(true);const [editing,setEditing]=useState(false);const [saving,setSaving]=useState(false);const [draft,setDraft]=useState({});
 const ar=lang==='ar';
 async function load(){setLoading(true);setError('');try{const r=await apiRequest('/api/patients/'+patientId,{token});setItem(r.item);setDraft({firstName:r.item.firstName||'',lastName:r.item.lastName||'',medicalRecordNo:r.item.medicalRecordNo||'',nationalId:r.item.nationalId||'',phone:r.item.phone||'',email:r.item.email||'',address:r.item.address||'',dateOfBirth:r.item.dateOfBirth?r.item.dateOfBirth.slice(0,10):'',sex:r.item.sex||''});}catch(e){setError(e.message||'Unable to load patient');}finally{setLoading(false);}}
 useEffect(()=>{load();},[patientId,token]);
 const date=v=>v?new Intl.DateTimeFormat(ar?'ar-EG':'en-US',{dateStyle:'medium',timeStyle:'short'}).format(new Date(v)):'—';
 function field(key,value){setDraft(current=>({...current,[key]:value}));}
 async function save(e){e.preventDefault();setSaving(true);setError('');try{await apiRequest('/api/patients/'+patientId,{token,method:'PATCH',body:{...draft,nationalId:draft.nationalId||null,phone:draft.phone||null,email:draft.email||null,address:draft.address||null,dateOfBirth:draft.dateOfBirth||null,sex:draft.sex||null}});setEditing(false);await load();}catch(e){setError(e.message||'Unable to update patient');}finally{setSaving(false);}}
 if(loading)return <div className="state">{ar?'جارٍ تحميل ملف المريض...':'Loading patient profile...'}</div>;
 if(error&&!item)return <div className="state error">{error}<button className="secondary" onClick={onBack}>{ar?'رجوع':'Back'}</button></div>;
 if(!item)return null;
 return <section className="patient-profile">
  <div className="profile-toolbar"><button className="secondary" onClick={onBack}>{ar?'← رجوع للمرضى':'← Back to patients'}</button><span>{ar?'رقم الملف الطبي':'Medical record'}: <b>{item.medicalRecordNo}</b></span>{canEdit&&!editing&&<button className="primary" onClick={()=>setEditing(true)}>{ar?'تعديل بيانات المريض':'Edit patient'}</button>}</div>
  {editing?<form className="operation-form" onSubmit={save}><div className="form-heading"><h2>{ar?'تعديل بيانات المريض':'Edit patient details'}</h2><button type="button" className="secondary" onClick={()=>{setEditing(false);setError('');}}>{ar?'إلغاء':'Cancel'}</button></div><div className="form-grid">
   <label>{ar?'الاسم الأول':'First name'}<input required maxLength="80" value={draft.firstName} onChange={e=>field('firstName',e.target.value)}/></label>
   <label>{ar?'اسم العائلة':'Last name'}<input required maxLength="80" value={draft.lastName} onChange={e=>field('lastName',e.target.value)}/></label>
   <label>{ar?'رقم الملف الطبي':'Medical record number'}<input required maxLength="40" value={draft.medicalRecordNo} onChange={e=>field('medicalRecordNo',e.target.value)}/></label>
   <label>{ar?'الرقم القومي':'National ID'}<input maxLength="20" value={draft.nationalId} onChange={e=>field('nationalId',e.target.value)}/></label>
   <label>{ar?'رقم الهاتف':'Phone'}<input maxLength="25" value={draft.phone} onChange={e=>field('phone',e.target.value)}/></label>
   <label>{ar?'البريد الإلكتروني':'Email'}<input type="email" maxLength="254" value={draft.email} onChange={e=>field('email',e.target.value)}/></label>
   <label>{ar?'تاريخ الميلاد':'Date of birth'}<input type="date" value={draft.dateOfBirth} onChange={e=>field('dateOfBirth',e.target.value)}/></label>
   <label>{ar?'النوع':'Sex'}<select value={draft.sex} onChange={e=>field('sex',e.target.value)}><option value="">{ar?'غير محدد':'Unspecified'}</option><option value="MALE">{ar?'ذكر':'Male'}</option><option value="FEMALE">{ar?'أنثى':'Female'}</option><option value="OTHER">{ar?'آخر':'Other'}</option></select></label>
   <label>{ar?'العنوان':'Address'}<input maxLength="500" value={draft.address} onChange={e=>field('address',e.target.value)}/></label>
  </div>{error&&<div className="error">{error}</div>}<div className="form-actions"><button className="primary" disabled={saving}>{saving?(ar?'جارٍ الحفظ...':'Saving...'):(ar?'حفظ التعديلات':'Save changes')}</button></div></form>:<div className="metric-grid">
   <article className="metric"><small>{ar?'اسم المريض':'Patient name'}</small><strong>{item.firstName} {item.lastName}</strong></article>
   <article className="metric"><small>{ar?'رقم الهاتف':'Phone'}</small><strong>{item.phone||'—'}</strong></article>
   <article className="metric"><small>{ar?'الرقم القومي':'National ID'}</small><strong>{item.nationalId||'—'}</strong></article>
   <article className="metric"><small>{ar?'تاريخ الميلاد':'Date of birth'}</small><strong>{item.dateOfBirth?date(item.dateOfBirth):'—'}</strong></article>
  </div>}
  <article className="panel"><h2>{ar?'سجل العمليات':'Operation history'}</h2>
   {!item.operations?.length?<p>{ar?'لا توجد عمليات مسجلة':'No operations recorded'}</p>:<div className="table-wrap"><table><thead><tr><th>{ar?'رقم العملية':'Operation'}</th><th>{ar?'النوع':'Type'}</th><th>{ar?'الطبيب':'Doctor'}</th><th>{ar?'التاريخ':'Date'}</th><th>{ar?'الحالة':'Status'}</th></tr></thead><tbody>{item.operations.map(op=><tr key={op.id}><td>{op.operationNo}</td><td>{op.operationType?.nameAr||op.operationType?.nameEn||'—'}</td><td>{op.doctor?.fullName||'—'}</td><td>{date(op.scheduledAt)}</td><td>{op.status}</td></tr>)}</tbody></table></div>}
  </article>
  <article className="panel"><h2>{ar?'المواعيد':'Appointments'}</h2>
   {!item.appointments?.length?<p>{ar?'لا توجد مواعيد مسجلة':'No appointments recorded'}</p>:<div className="table-wrap"><table><thead><tr><th>{ar?'التاريخ':'Date'}</th><th>{ar?'الطبيب':'Doctor'}</th><th>{ar?'القسم':'Department'}</th><th>{ar?'الحالة':'Status'}</th></tr></thead><tbody>{item.appointments.map(a=><tr key={a.id}><td>{date(a.startsAt)}</td><td>{a.doctor?.fullName||'—'}</td><td>{a.department?.nameAr||a.department?.nameEn||'—'}</td><td>{a.status}</td></tr>)}</tbody></table></div>}
  </article>
 </section>;
}

function DoctorEdit({doctor,token,lang,onCancel,onSaved}) {
 const ar=lang==='ar';const [fullName,setFullName]=useState(doctor.fullName||'');const [specialty,setSpecialty]=useState(doctor.specialty||'');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 async function submit(e){e.preventDefault();setBusy(true);setError('');try{await apiRequest('/api/doctors/'+doctor.id,{token,method:'PATCH',body:{fullName,specialty:specialty||null}});onSaved();}catch(err){setError(err.message||'Update failed');}finally{setBusy(false);}}
 return <form className="operation-form" onSubmit={submit}><div className="form-heading"><div><h2>{ar?'تعديل بيانات الطبيب':'Edit doctor'}</h2><p>{doctor.department?.nameAr||doctor.department?.nameEn||''}</p></div><button type="button" className="secondary" onClick={onCancel}>{ar?'إغلاق':'Close'}</button></div><div className="form-grid"><label>{ar?'اسم الطبيب':'Doctor name'}<input required maxLength="120" value={fullName} onChange={e=>setFullName(e.target.value)}/></label><label>{ar?'التخصص':'Specialty'}<input maxLength="120" value={specialty} onChange={e=>setSpecialty(e.target.value)}/></label></div>{error&&<div className="error">{error}</div>}<div className="form-actions"><button className="primary" disabled={busy}>{busy?(ar?'جارٍ الحفظ...':'Saving...'):(ar?'حفظ التعديلات':'Save changes')}</button></div></form>;
}
