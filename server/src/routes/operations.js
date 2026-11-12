import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { operationScopeWhere, combineWhere } from '../lib/access-scopes.js';

export const operationsRouter=Router();
operationsRouter.use(requireAuth);
const itemSchema=z.object({
  productId:z.string().optional().nullable(),
  itemName:z.string().trim().min(1).max(160).optional(),
  category:z.enum(['MEDICATION','CONSUMABLE','OTHER']).optional(),
  unit:z.string().trim().min(1).max(30).optional(),
  quantity:z.coerce.number().positive().max(1000000),
  purchaseUnitPrice:z.coerce.number().nonnegative().max(100000000).default(0),
  sellingUnitPrice:z.coerce.number().nonnegative().max(100000000).optional().nullable()
}).superRefine((item,ctx)=>{if(!item.productId&&(!item.itemName||!item.category||!item.unit)){ctx.addIssue({code:'custom',message:'Manual items require name, category and unit'});}});
const operationSchema=z.object({
  operationNo:z.string().trim().min(1).max(40),
  patientId:z.string().min(1),
  doctorId:z.string().min(1),
  operationTypeId:z.string().min(1),
  scheduledAt:z.coerce.date(),
  startedAt:z.coerce.date().optional().nullable(),
  endedAt:z.coerce.date().optional().nullable(),
  status:z.enum(['SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED']).default('SCHEDULED'),
  notes:z.string().trim().max(5000).optional().nullable(),
  items:z.array(itemSchema).max(300).default([])
});
const include={patient:{select:{id:true,medicalRecordNo:true,firstName:true,lastName:true}},doctor:{select:{id:true,fullName:true,specialty:true}},operationType:{select:{id:true,code:true,nameAr:true,nameEn:true,isDelivery:true,isCesarean:true}},items:true};
function canReadCosts(user){return user.role==='SUPER_ADMIN'||user.permissions?.includes('operations.costs.read');}
function protectCosts(item,allowed){
 if(allowed)return item;
 const {consumablesCost,medicationsCost,otherCost,totalCost,...safe}=item;
 return {...safe,items:item.items?.map(({purchaseUnitPrice,sellingUnitPrice,lineCost,...line})=>line)};
}
function calculate(items){
 const lines=items.map(item=>({...item,lineCost:Number((item.quantity*item.purchaseUnitPrice).toFixed(2))}));
 const totals={MEDICATION:0,CONSUMABLE:0,OTHER:0};
 for(const line of lines) totals[line.category]+=line.lineCost;
 return {lines,medicationsCost:Number(totals.MEDICATION.toFixed(2)),consumablesCost:Number(totals.CONSUMABLE.toFixed(2)),otherCost:Number(totals.OTHER.toFixed(2)),totalCost:Number((totals.MEDICATION+totals.CONSUMABLE+totals.OTHER).toFixed(2))};
}
operationsRouter.get('/types',requirePermission('operations.read'),async(_req,res,next)=>{try{const items=await prisma.operationType.findMany({where:{isActive:true},orderBy:{nameAr:'asc'}});res.json({items});}catch(error){next(error);}});
operationsRouter.post('/types',requirePermission('operations.manage_types'),async(req,res,next)=>{try{
 const schema=z.object({code:z.string().trim().min(1).max(40),nameAr:z.string().trim().min(1).max(100),nameEn:z.string().trim().min(1).max(100),isDelivery:z.boolean().default(false),isCesarean:z.boolean().default(false)});
 const p=schema.safeParse(req.body);if(!p.success)return res.status(400).json({error:'Invalid operation type',details:p.error.flatten()});
 const item=await prisma.operationType.create({data:p.data});
 await prisma.auditLog.create({data:{userId:req.user.id,action:'OPERATION_TYPE_CREATED',entity:'OperationType',entityId:item.id,ipAddress:req.ip,afterData:p.data}});
 res.status(201).json({item:protectCosts(item,canReadCosts(req.user))});
}catch(error){if(error.code==='P2002')return res.status(409).json({error:'Operation type code already exists'});next(error);}});
operationsRouter.get('/',requirePermission('operations.read'),async(req,res,next)=>{try{
 const from=req.query.from?new Date(String(req.query.from)):new Date(new Date().getFullYear(),0,1);
 const to=req.query.to?new Date(String(req.query.to)):new Date(new Date().getFullYear()+1,0,1);
 if(Number.isNaN(from.valueOf())||Number.isNaN(to.valueOf())||from>to)return res.status(400).json({error:'Invalid date range'});
 const where={scheduledAt:{gte:from,lte:to}};
 if(typeof req.query.doctorId==='string')where.doctorId=req.query.doctorId;
 if(typeof req.query.patientId==='string')where.patientId=req.query.patientId;
 if(typeof req.query.operationTypeId==='string')where.operationTypeId=req.query.operationTypeId;
 const scopedWhere=combineWhere(where,operationScopeWhere(req.user));
 const items=await prisma.operation.findMany({where:scopedWhere,include,orderBy:{scheduledAt:'desc'},take:500});
 res.json({items:items.map(item=>protectCosts(item,canReadCosts(req.user)))});
}catch(error){next(error);}});
operationsRouter.get('/analytics',requirePermission('operations.read'),async(req,res,next)=>{try{
 const from=req.query.from?new Date(String(req.query.from)):new Date(new Date().getFullYear(),0,1);
 const to=req.query.to?new Date(String(req.query.to)):new Date(new Date().getFullYear()+1,0,1);
 if(Number.isNaN(from.valueOf())||Number.isNaN(to.valueOf())||from>to)return res.status(400).json({error:'Invalid date range'});
 const where={scheduledAt:{gte:from,lte:to},status:{not:'CANCELLED'}};
 if(typeof req.query.doctorId==='string')where.doctorId=req.query.doctorId;
 if(typeof req.query.operationTypeId==='string')where.operationTypeId=req.query.operationTypeId;
 const scopedWhere=combineWhere(where,operationScopeWhere(req.user));
 const rows=await prisma.operation.findMany({where:scopedWhere,select:{id:true,scheduledAt:true,totalCost:true,consumablesCost:true,medicationsCost:true,doctor:{select:{id:true,fullName:true}},operationType:{select:{id:true,nameAr:true,nameEn:true,isDelivery:true,isCesarean:true}},items:{select:{itemNameSnapshot:true,quantity:true,lineCost:true}}},take:10000});
 const byMonth=new Map(),byType=new Map(),byDoctor=new Map(),byItem=new Map();
 let totalCost=0,consumablesCost=0,medicationsCost=0,cesareanCount=0,naturalDeliveryCount=0;
 for(const row of rows){
  const month=row.scheduledAt.toISOString().slice(0,7);const cost=Number(row.totalCost);totalCost+=cost;consumablesCost+=Number(row.consumablesCost);medicationsCost+=Number(row.medicationsCost);
  byMonth.set(month,(byMonth.get(month)||0)+1);
  byType.set(row.operationType.nameAr,(byType.get(row.operationType.nameAr)||0)+1);
  byDoctor.set(row.doctor.fullName,(byDoctor.get(row.doctor.fullName)||0)+1);
  for(const used of row.items){
   const current=byItem.get(used.itemNameSnapshot)||{item:used.itemNameSnapshot,quantity:0,operations:0,cost:0};
   current.quantity+=Number(used.quantity);current.operations+=1;current.cost+=Number(used.lineCost);byItem.set(used.itemNameSnapshot,current);
  }
  if(row.operationType.isCesarean)cesareanCount++;
  if(row.operationType.isDelivery&&!row.operationType.isCesarean)naturalDeliveryCount++;
 }
 const financial=canReadCosts(req.user)?{totalCost:Number(totalCost.toFixed(2)),averageCost:rows.length?Number((totalCost/rows.length).toFixed(2)):0,consumablesCost:Number(consumablesCost.toFixed(2)),medicationsCost:Number(medicationsCost.toFixed(2))}:{};
 res.json({summary:{operations:rows.length,...financial,deliveries:cesareanCount+naturalDeliveryCount,cesareanCount,naturalDeliveryCount},byMonth:[...byMonth].map(([month,count])=>({month,count})),byType:[...byType].map(([operationType,count])=>({operationType,count})),byDoctor:[...byDoctor].map(([doctor,count])=>({doctor,count})),byItem:[...byItem.values()].map(x=>canReadCosts(req.user)?{...x,cost:Number(x.cost.toFixed(2))}:{item:x.item,quantity:x.quantity,operations:x.operations}).sort((a,b)=>b.quantity-a.quantity).slice(0,30)});
}catch(error){next(error);}});
operationsRouter.post('/',requirePermission('operations.create'),async(req,res,next)=>{try{
 const p=operationSchema.safeParse(req.body);if(!p.success)return res.status(400).json({error:'Invalid operation data',details:p.error.flatten()});
 const {items,...data}=p.data;
 const item=await prisma.$transaction(async tx=>{
  const [patient,doctor,type]=await Promise.all([tx.patient.findUnique({where:{id:data.patientId},select:{id:true}}),tx.doctor.findUnique({where:{id:data.doctorId},select:{id:true}}),tx.operationType.findUnique({where:{id:data.operationTypeId},select:{id:true,isActive:true}})]);
  if(!patient||!doctor||!type?.isActive)throw Object.assign(new Error('Patient, doctor or active operation type not found'),{status:400});
  const scope=operationScopeWhere(req.user);
  if(scope.AND?.some(rule=>rule.doctorId&&!rule.doctorId.in.includes(data.doctorId)||rule.patientId&&!rule.patientId.in.includes(data.patientId)))throw Object.assign(new Error('Operation is outside your assigned access scope'),{status:403});
  const normalized=[];const movements=[];
  for(const entry of items){
   if(!entry.productId){normalized.push(entry);continue;}
   const product=await tx.product.findUnique({where:{id:entry.productId},select:{id:true,nameAr:true,unit:true,category:true,isActive:true}});
   if(!product?.isActive)throw Object.assign(new Error('Active inventory product not found'),{status:400});
   if(entry.category&&product.category!==entry.category)throw Object.assign(new Error('Item category does not match inventory product'),{status:400});
   const batches=await tx.stockItem.findMany({where:{productId:product.id,quantity:{gt:0},OR:[{expiryDate:null},{expiryDate:{gte:new Date()}}]},orderBy:[{expiryDate:'asc'},{createdAt:'asc'}]});
   let remaining=entry.quantity,totalValue=0;
   for(const batch of batches){
    if(remaining<=0)break;
    const available=Number(batch.quantity),take=Math.min(available,remaining);
    if(take<=0)continue;
    const deducted=await tx.stockItem.updateMany({where:{id:batch.id,quantity:{gte:take}},data:{quantity:{decrement:take}}});
    if(deducted.count!==1)throw Object.assign(new Error('Stock changed concurrently; retry the operation'),{status:409});
    movements.push({productId:product.id,stockItemId:batch.id,movementType:'OPERATION_CONSUMPTION',quantity:-take,unitCost:batch.unitCost,performedById:req.user.id});
    totalValue+=take*Number(batch.unitCost);remaining-=take;
   }
   if(remaining>0)throw Object.assign(new Error('Insufficient non-expired stock for '+product.nameAr),{status:409});
   normalized.push({...entry,itemName:product.nameAr,unit:product.unit,category:product.category,purchaseUnitPrice:Number((totalValue/entry.quantity).toFixed(4))});
  }
  const totals=calculate(normalized);
  const created=await tx.operation.create({data:{...data,...totals,createdById:req.user.id,items:{create:totals.lines.map(({itemName,unit,...line})=>({...line,itemNameSnapshot:itemName,unitSnapshot:unit}))}},include});
  if(movements.length)await tx.stockMovement.createMany({data:movements.map(m=>({...m,referenceType:'Operation',referenceId:created.id}))});
  await tx.auditLog.create({data:{userId:req.user.id,action:'OPERATION_CREATED',entity:'Operation',entityId:created.id,ipAddress:req.ip,afterData:{operationNo:created.operationNo,totalCost:totals.totalCost,itemCount:items.length}}});
  return created;
 });
 res.status(201).json({item:protectCosts(item,canReadCosts(req.user))});
}catch(error){if(error.code==='P2002')return res.status(409).json({error:'Operation number already exists'});next(error);}});
operationsRouter.get('/:id',requirePermission('operations.read'),async(req,res,next)=>{try{const item=await prisma.operation.findFirst({where:combineWhere({id:req.params.id},operationScopeWhere(req.user)),include});if(!item)return res.status(404).json({error:'Operation not found'});res.json({item:protectCosts(item,canReadCosts(req.user))});}catch(error){next(error);}});
