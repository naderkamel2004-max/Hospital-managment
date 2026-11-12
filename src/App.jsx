import React, { useEffect, useState } from 'react';
import { Activity, CalendarDays, ClipboardList, Languages, LayoutDashboard, LogOut, Package, Search, ShieldCheck, Stethoscope, Users, HeartPulse, RefreshCw } from 'lucide-react';
import { apiRequest } from './lib/api.js';
import './styles.css';
import OperationCreate from './components/OperationCreate.jsx';
import PatientCreate from './components/PatientCreate.jsx';
import StockReceipt from './components/StockReceipt.jsx';
import ProductCreate from './components/ProductCreate.jsx';

const text = {
 ar: {title:'نظام إدارة المستشفى',subtitle:'منصة التشغيل والإدارة الطبية',login:'تسجيل الدخول',email:'البريد الإلكتروني',password:'كلمة المرور',submit:'دخول آمن',dashboard:'لوحة التحكم',operations:'العمليات الجراحية',patients:'المرضى',doctors:'الأطباء',inventory:'المخزون',users:'المستخدمون',welcome:'مرحباً بك',overview:'ملخص أداء المستشفى',opsCount:'عدد العمليات',patientsCount:'المرضى',doctorsCount:'الأطباء',deliveries:'الولادات',cost:'إجمالي التكلفة',recent:'أحدث العمليات',number:'رقم العملية',patient:'المريض',doctor:'الطبيب',type:'نوع العملية',date:'التاريخ',status:'الحالة',search:'ابحث...',loading:'جارٍ تحميل البيانات...',empty:'لا توجد بيانات',logout:'تسجيل الخروج',language:'English',retry:'إعادة المحاولة',forbidden:'ليس لديك صلاحية لعرض هذا القسم',loginError:'بيانات الدخول غير صحيحة أو تعذر الاتصال بالخادم',scheduled:'مجدولة',inProgress:'جارية',completed:'مكتملة',cancelled:'ملغاة',sku:'الكود',name:'الاسم',onHand:'الرصيد المتاح'},
 en: {title:'Hospital Management System',subtitle:'Clinical operations platform',login:'Sign in',email:'Email',password:'Password',submit:'Secure sign in',dashboard:'Dashboard',operations:'Surgical Operations',patients:'Patients',doctors:'Doctors',inventory:'Inventory',users:'Users',welcome:'Welcome back',overview:'Hospital performance overview',opsCount:'Operations',patientsCount:'Patients',doctorsCount:'Doctors',deliveries:'Deliveries',cost:'Total cost',recent:'Recent operations',number:'Operation no.',patient:'Patient',doctor:'Doctor',type:'Procedure',date:'Date',status:'Status',search:'Search...',loading:'Loading...',empty:'No records found',logout:'Sign out',language:'العربية',retry:'Retry',forbidden:'You do not have permission to view this section',loginError:'Invalid credentials or API connection failed',scheduled:'Scheduled',inProgress:'In progress',completed:'Completed',cancelled:'Cancelled',sku:'SKU',name:'Name',onHand:'Available stock'}
};
const nav = [['dashboard','dashboard',LayoutDashboard],['operations','operations',ClipboardList],['patients','patients',Users],['doctors','doctors',Stethoscope],['inventory','inventory',Package],['users','users',ShieldCheck]];
const apiPaths = {dashboard:'/api/dashboard/summary',operations:'/api/operations',patients:'/api/patients?page=1&pageSize=50',doctors:'/api/doctors',inventory:'/api/inventory/products',users:'/api/users'};
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
   {nav.filter(([id])=>id==='dashboard'?permissions.includes('dashboard.read')||user?.role==='SUPER_ADMIN':id==='users'?user?.role==='SUPER_ADMIN':permissions.includes(({operations:'operations.read',patients:'patients.read',doctors:'doctors.read',inventory:'inventory.read'})[id])).map(([id,key,Icon])=><button key={id} className={active===id?'nav-link selected':'nav-link'} onClick={()=>{setActive(id);setQuery('');}}><Icon size={18}/>{t[key]}</button>)}
   <div className="sidebar-foot"><ShieldCheck size={16}/>{rtl?'جلسة آمنة':'Secure session'}</div>
  </aside>
  <main className="main"><header className="topbar"><span>{t.dashboard} / {t[active]}</span><div className="top-actions"><label className="search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={t.search}/></label><button className="secondary" onClick={()=>setLang(rtl?'en':'ar')}><Languages size={16}/>{t.language}</button><div className="user"><b>{user?.fullName||'—'}</b><small>{user?.role||'—'}</small></div><button className="secondary" onClick={logout}><LogOut size={16}/>{t.logout}</button></div></header>
   <section className="content"><div className="heading"><div><small>{t.title}</small><h1>{active==='dashboard'?t.welcome:t[active]}</h1><p>{t.overview}</p></div><div className="heading-actions">{active==='operations'&&permissions.includes('operations.create')&&<button className="primary" onClick={()=>setShowOperationForm(v=>!v)}>{showOperationForm?(rtl?'إغلاق':'Close'):(rtl?'إضافة عملية':'New operation')}</button>}{active==='patients'&&permissions.includes('patients.create')&&<button className="primary" onClick={()=>setShowPatientForm(v=>!v)}>{showPatientForm?(rtl?'إغلاق':'Close'):(rtl?'إضافة مريض':'New patient')}</button>}{active==='inventory'&&permissions.includes('inventory.manage')&&<button className="primary" onClick={()=>setShowProductForm(v=>!v)}>{showProductForm?(rtl?'إغلاق':'Close'):(rtl?'إضافة صنف':'New product')}</button>}{active==='inventory'&&permissions.includes('inventory.read')&&permissions.includes('inventory.receive')&&permissions.includes('inventory.costs.write')&&<button className="primary" onClick={()=>setShowReceiptForm(v=>!v)}>{showReceiptForm?(rtl?'إغلاق':'Close'):(rtl?'استلام مخزون':'Receive stock')}</button>}<button className="secondary" onClick={()=>load(active)}><RefreshCw size={16}/>{t.retry}</button></div></div>
   {selectedDoctor&&active==='doctors'?<DoctorEdit doctor={selectedDoctor} token={token} lang={lang} onCancel={()=>setSelectedDoctor(null)} onSaved={()=>{setSelectedDoctor(null);load('doctors');}}/>:selectedPatient&&active==='patients'?<PatientProfile patientId={selectedPatient} token={token} lang={lang} onBack={()=>setSelectedPatient(null)}/>:showOperationForm&&active==='operations'?<OperationCreate token={token} lang={lang} onCancel={()=>setShowOperationForm(false)} onCreated={()=>{setShowOperationForm(false);load('operations');}}/>:showPatientForm&&active==='patients'?<PatientCreate token={token} lang={lang} onCancel={()=>setShowPatientForm(false)} onCreated={()=>{setShowPatientForm(false);load('patients');}}/>:showReceiptForm&&active==='inventory'?<StockReceipt token={token} lang={lang} onCancel={()=>setShowReceiptForm(false)} onCreated={()=>{setShowReceiptForm(false);load('inventory');}}/>:showProductForm&&active==='inventory'?<ProductCreate token={token} lang={lang} canWriteCosts={permissions.includes('inventory.costs.write')} onCancel={()=>setShowProductForm(false)} onCreated={()=>{setShowProductForm(false);load('inventory');}}/>:loading?<div className="state"><Activity/>{t.loading}</div>:error?<div className="state error">{error}</div>:active==='dashboard'?<Dashboard data={data||{}} t={t} lang={lang}/>:<Records section={active} items={items} t={t} lang={lang} token={token} canUpdate={permissions.includes('operations.update')} onChanged={()=>load(active)} onPatientSelect={setSelectedPatient} canEditDoctors={permissions.includes('doctors.update')} onDoctorEdit={setSelectedDoctor}/>}
   <footer>© {new Date().getFullYear()} {t.title} · HMS</footer></section>
  </main>
 </div>;
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


function PatientProfile({patientId,token,lang,onBack}) {
 const [item,setItem]=useState(null);const [error,setError]=useState('');const [loading,setLoading]=useState(true);
 const ar=lang==='ar';
 useEffect(()=>{let alive=true;apiRequest('/api/patients/'+patientId,{token}).then(r=>{if(alive)setItem(r.item);}).catch(e=>{if(alive)setError(e.message||'Unable to load patient');}).finally(()=>{if(alive)setLoading(false);});return()=>{alive=false;};},[patientId,token]);
 const date=v=>v?new Intl.DateTimeFormat(ar?'ar-EG':'en-US',{dateStyle:'medium',timeStyle:'short'}).format(new Date(v)):'—';
 if(loading)return <div className="state">{ar?'جارٍ تحميل ملف المريض...':'Loading patient profile...'}</div>;
 if(error)return <div className="state error">{error}<button className="secondary" onClick={onBack}>{ar?'رجوع':'Back'}</button></div>;
 if(!item)return null;
 return <section className="patient-profile">
  <div className="profile-toolbar"><button className="secondary" onClick={onBack}>{ar?'← رجوع للمرضى':'← Back to patients'}</button><span>{ar?'رقم الملف الطبي':'Medical record'}: <b>{item.medicalRecordNo}</b></span></div>
  <div className="metric-grid">
   <article className="metric"><small>{ar?'اسم المريض':'Patient name'}</small><strong>{item.firstName} {item.lastName}</strong></article>
   <article className="metric"><small>{ar?'رقم الهاتف':'Phone'}</small><strong>{item.phone||'—'}</strong></article>
   <article className="metric"><small>{ar?'الرقم القومي':'National ID'}</small><strong>{item.nationalId||'—'}</strong></article>
   <article className="metric"><small>{ar?'تاريخ الميلاد':'Date of birth'}</small><strong>{item.dateOfBirth?date(item.dateOfBirth):'—'}</strong></article>
  </div>
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
