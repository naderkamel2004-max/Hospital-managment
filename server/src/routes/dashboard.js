import {Router} from 'express';
import {prisma} from '../lib/prisma.js';
import {requireAuth,requirePermission} from '../middleware/auth.js';
import { operationScopeWhere, patientScopeWhere, doctorScopeWhere, combineWhere } from '../lib/access-scopes.js';
export const dashboardRouter=Router();
dashboardRouter.use(requireAuth,requirePermission('dashboard.read'));
dashboardRouter.get('/summary',async(req,res,next)=>{try{
 const from=req.query.from?new Date(String(req.query.from)):new Date(new Date().getFullYear(),0,1);
 const to=req.query.to?new Date(String(req.query.to)):new Date(new Date().getFullYear()+1,0,1);
 if(Number.isNaN(from.valueOf())||Number.isNaN(to.valueOf())||from>to)return res.status(400).json({error:'Invalid date range'});
 const where={scheduledAt:{gte:from,lte:to},status:{not:'CANCELLED'}};
 if(typeof req.query.doctorId==='string')where.doctorId=req.query.doctorId;
 if(typeof req.query.operationTypeId==='string')where.operationTypeId=req.query.operationTypeId;
 const scopedWhere=combineWhere(where,operationScopeWhere(req.user));
 const [ops,doctors,patients]=await Promise.all([
  prisma.operation.findMany({where:scopedWhere,select:{totalCost:true,consumablesCost:true,operationType:{select:{isDelivery:true,isCesarean:true}}},take:10000}),
  prisma.doctor.count({where:doctorScopeWhere(req.user)}),
  prisma.patient.count({where:patientScopeWhere(req.user)})
 ]);
 const totalCost=ops.reduce((n,x)=>n+Number(x.totalCost),0);
 const financial=req.user.role==='SUPER_ADMIN'||req.user.permissions.includes('operations.costs.read')?{totalCost:Number(totalCost.toFixed(2)),averageCost:ops.length?Number((totalCost/ops.length).toFixed(2)):0,consumablesCost:Number(ops.reduce((n,x)=>n+Number(x.consumablesCost),0).toFixed(2))}:{};
 res.json({operations:ops.length,...financial,doctors,patients,deliveries:ops.filter(x=>x.operationType.isDelivery).length,cesarean:ops.filter(x=>x.operationType.isCesarean).length,naturalDeliveries:ops.filter(x=>x.operationType.isDelivery&&!x.operationType.isCesarean).length});
}catch(error){next(error);}});
