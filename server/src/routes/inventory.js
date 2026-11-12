import {Router} from 'express';
import {z} from 'zod';
import {prisma} from '../lib/prisma.js';
import {requireAuth,requirePermission} from '../middleware/auth.js';
export const inventoryRouter=Router();
const canReadInventoryCosts=user=>user.role==='SUPER_ADMIN'||user.permissions?.includes('inventory.costs.read');
const protectProduct=(product,allowed)=>{if(allowed)return product;const {purchasePrice,sellingPrice,...safe}=product;return {...safe,stockItems:product.stockItems?.map(({unitCost,...batch})=>batch)};};
inventoryRouter.use(requireAuth);
inventoryRouter.get('/products',requirePermission('inventory.read'),async(req,res,next)=>{try{
 const q=typeof req.query.q==='string'?req.query.q.trim().slice(0,100):'';
 const items=await prisma.product.findMany({where:{isActive:true,...(q?{OR:[{sku:{contains:q,mode:'insensitive'}},{nameAr:{contains:q,mode:'insensitive'}},{nameEn:{contains:q,mode:'insensitive'}}]}:{})},include:{stockItems:{where:{quantity:{gt:0}},select:{id:true,batchNo:true,expiryDate:true,quantity:true,unitCost:true}}},orderBy:{nameAr:'asc'},take:500});
 res.json({items:items.map(p=>protectProduct({...p,onHand:p.stockItems.reduce((n,b)=>n+Number(b.quantity),0)},canReadInventoryCosts(req.user)))});
}catch(error){next(error);}});
inventoryRouter.post('/products',requirePermission('inventory.manage'),async(req,res,next)=>{try{
 const p=z.object({sku:z.string().trim().min(1).max(50),nameAr:z.string().trim().min(1).max(160),nameEn:z.string().trim().min(1).max(160),category:z.enum(['MEDICATION','CONSUMABLE','OTHER']),unit:z.string().trim().min(1).max(30),purchasePrice:z.coerce.number().nonnegative(),sellingPrice:z.coerce.number().nonnegative().nullable().optional(),reorderLevel:z.coerce.number().nonnegative().default(0)}).safeParse(req.body);
 if(!p.success)return res.status(400).json({error:'Invalid product data',details:p.error.flatten()});
 const item=await prisma.product.create({data:p.data});
 await prisma.auditLog.create({data:{userId:req.user.id,action:'PRODUCT_CREATED',entity:'Product',entityId:item.id,ipAddress:req.ip,afterData:p.data}});
 res.status(201).json({item:protectProduct(item,canReadInventoryCosts(req.user))});
}catch(error){if(error.code==='P2002')return res.status(409).json({error:'SKU already exists'});next(error);}});
inventoryRouter.post('/receipts',requirePermission('inventory.receive'),requirePermission('inventory.costs.write'),async(req,res,next)=>{try{
 const p=z.object({productId:z.string().min(1),batchNo:z.string().trim().min(1).max(80),expiryDate:z.coerce.date().optional().nullable(),quantity:z.coerce.number().positive().max(1000000),unitCost:z.coerce.number().nonnegative().max(100000000)}).safeParse(req.body);
 if(!p.success)return res.status(400).json({error:'Invalid stock receipt',details:p.error.flatten()});
 const product=await prisma.product.findUnique({where:{id:p.data.productId}});
 if(!product||!product.isActive)return res.status(404).json({error:'Active product not found'});
 const item=await prisma.$transaction(async tx=>{
  const existing=await tx.stockItem.findUnique({where:{productId_batchNo:{productId:p.data.productId,batchNo:p.data.batchNo}}});
  let batch;
  if(existing){
   if(p.data.expiryDate!==undefined&&(existing.expiryDate?.toISOString()??null)!==(p.data.expiryDate?.toISOString()??null))throw Object.assign(new Error('Batch expiry date does not match the existing batch'),{status:409});
   const oldQty=Number(existing.quantity),receivedQty=p.data.quantity;
   const averageCost=(oldQty*Number(existing.unitCost)+receivedQty*p.data.unitCost)/(oldQty+receivedQty);
   batch=await tx.stockItem.update({where:{id:existing.id},data:{quantity:{increment:receivedQty},unitCost:Number(averageCost.toFixed(4))}});
  }else{
   batch=await tx.stockItem.create({data:p.data});
  }
  await tx.stockMovement.create({data:{productId:p.data.productId,stockItemId:batch.id,movementType:'RECEIPT',quantity:p.data.quantity,unitCost:p.data.unitCost,referenceType:'StockReceipt',performedById:req.user.id}});
  await tx.auditLog.create({data:{userId:req.user.id,action:'STOCK_RECEIVED',entity:'StockItem',entityId:batch.id,ipAddress:req.ip,afterData:p.data}});
  return batch;
 });
 res.status(201).json({item:canReadInventoryCosts(req.user)?item:(()=>{const {unitCost,...safe}=item;return safe;})()});
}catch(error){if(error.code==='P2002')return res.status(409).json({error:'Batch conflict'});next(error);}});
