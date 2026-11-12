import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';

export const patientsRouter = Router();
patientsRouter.use(requireAuth);
const patientInput = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  medicalRecordNo: z.string().trim().min(1).max(40),
  nationalId: z.string().trim().max(20).optional().nullable(),
  dateOfBirth: z.coerce.date().optional().nullable(),
  sex: z.enum(['MALE','FEMALE','OTHER']).optional().nullable(),
  phone: z.string().trim().max(25).optional().nullable(),
  email: z.email().max(254).optional().nullable(),
  address: z.string().trim().max(500).optional().nullable(),
  departmentId: z.string().optional().nullable()
});
const select = { id:true, medicalRecordNo:true, nationalId:true, firstName:true, lastName:true, dateOfBirth:true, sex:true, phone:true, email:true, address:true, departmentId:true, createdAt:true, updatedAt:true };

patientsRouter.get('/', requirePermission('patients.read'), async (req,res,next)=>{
  try {
    const page = Math.max(1, Math.min(10000, Number.parseInt(req.query.page,10) || 1));
    const pageSize = Math.max(1, Math.min(100, Number.parseInt(req.query.pageSize,10) || 20));
    const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0,100) : '';
    const where = q ? { OR:[
      { medicalRecordNo:{contains:q, mode:'insensitive'} },
      { firstName:{contains:q, mode:'insensitive'} },
      { lastName:{contains:q, mode:'insensitive'} },
      { phone:{contains:q, mode:'insensitive'} }
    ] } : {};
    if(req.user.role!=='SUPER_ADMIN'){
      const patientScopes=req.user.scopes.filter(x=>x.resource==='patient').map(x=>x.resourceId);
      const doctorScopes=req.user.scopes.filter(x=>x.resource==='doctor').map(x=>x.resourceId);
      if(patientScopes.length)where.id={in:patientScopes};
      if(doctorScopes.length)where.operations={some:{doctorId:{in:doctorScopes}}};
    }
    const [items,total] = await prisma.$transaction([
      prisma.patient.findMany({where,select,orderBy:{createdAt:'desc'},skip:(page-1)*pageSize,take:pageSize}),
      prisma.patient.count({where})
    ]);
    res.json({items,pagination:{page,pageSize,total,totalPages:Math.ceil(total/pageSize)}});
  } catch(error){next(error);}
});
patientsRouter.get('/:id', requirePermission('patients.read'), async(req,res,next)=>{
  try {
    const patient=await prisma.patient.findUnique({where:{id:req.params.id,...(req.user.role!=='SUPER_ADMIN'&&req.user.scopes.some(x=>x.resource==='patient')?{id:{in:req.user.scopes.filter(x=>x.resource==='patient').map(x=>x.resourceId)}}:{})},select:{...select,appointments:{orderBy:{startsAt:'desc'},take:10,select:{id:true,startsAt:true,status:true,reason:true,doctor:{select:{fullName:true}},department:{select:{nameAr:true,nameEn:true}}}},encounters:{orderBy:{startedAt:'desc'},take:10,select:{id:true,startedAt:true,status:true,diagnosis:true}},operations:{orderBy:{scheduledAt:'desc'},take:50,include:{doctor:{select:{id:true,fullName:true}},operationType:{select:{nameAr:true,nameEn:true}},items:true}}}});
    if(!patient) return res.status(404).json({error:'Patient not found'});
    if(req.user.role!=='SUPER_ADMIN'&&!req.user.permissions.includes('operations.costs.read')){
      patient.operations=patient.operations.map(({totalCost,consumablesCost,medicationsCost,otherCost,...operation})=>({...operation,items:operation.items.map(({purchaseUnitPrice,sellingUnitPrice,lineCost,...line})=>line)}));
    }
    res.json({item:patient});
  }catch(error){next(error);}
});
patientsRouter.post('/', requirePermission('patients.create'), async(req,res,next)=>{
  try {
    const parsed=patientInput.safeParse(req.body);
    if(!parsed.success) return res.status(400).json({error:'Invalid patient data',details:parsed.error.flatten()});
    const data={...parsed.data,nationalId:parsed.data.nationalId||null,email:parsed.data.email||null};
    const item=await prisma.$transaction(async tx=>{
      const created=await tx.patient.create({data,select});
      await tx.auditLog.create({data:{userId:req.user.id,action:'PATIENT_CREATED',entity:'Patient',entityId:created.id,ipAddress:req.ip}});
      return created;
    });
    res.status(201).json({item});
  }catch(error){if(error.code==='P2002') return res.status(409).json({error:'Medical record number or national ID already exists'});next(error);}
});
patientsRouter.patch('/:id', requirePermission('patients.update'), async(req,res,next)=>{
  try {
    const parsed=patientInput.partial().safeParse(req.body);
    if(!parsed.success||Object.keys(parsed.data||{}).length===0) return res.status(400).json({error:'Invalid patient update',details:parsed.error?.flatten()});
    const item=await prisma.$transaction(async tx=>{
      const updated=await tx.patient.update({where:{id:req.params.id},data:parsed.data,select});
      await tx.auditLog.create({data:{userId:req.user.id,action:'PATIENT_UPDATED',entity:'Patient',entityId:updated.id,ipAddress:req.ip}});
      return updated;
    });
    res.json({item});
  }catch(error){if(error.code==='P2025') return res.status(404).json({error:'Patient not found'});if(error.code==='P2002') return res.status(409).json({error:'Medical record number or national ID already exists'});next(error);}
});
