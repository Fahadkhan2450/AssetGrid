import { Router } from 'express';
import { requireAuth, requireAdmin, AuthRequest } from '../../middleware/auth.js';
import { Member } from '../../models/Member.js';
import { Customer } from '../../models/Customer.js';
import { Location } from '../../models/Location.js';
import { audit } from '../../utils/audit.js';

const router=Router();
router.get('/members',requireAuth,async(_req,res)=>res.json(await Member.find({isActive:true}).sort({name:1}).lean()));
router.get('/customers',requireAuth,async(_req,res)=>res.json(await Customer.find({isActive:true}).sort({name:1}).lean()));
router.get('/locations',requireAuth,async(_req,res)=>res.json(await Location.find().sort({name:1}).lean()));
router.post('/members',requireAuth,requireAdmin,async(req:AuthRequest,res)=>{const x=await Member.create(req.body);await audit({actorId:req.user!.id,action:'CREATE',entityType:'Member',entityId:x.id,newValue:x.toObject()});res.status(201).json(x);});
router.post('/customers',requireAuth,requireAdmin,async(req:AuthRequest,res)=>{const x=await Customer.create(req.body);await audit({actorId:req.user!.id,action:'CREATE',entityType:'Customer',entityId:x.id,newValue:x.toObject()});res.status(201).json(x);});
router.post('/locations',requireAuth,requireAdmin,async(req:AuthRequest,res)=>{const x=await Location.create(req.body);await audit({actorId:req.user!.id,action:'CREATE',entityType:'Location',entityId:x.id,newValue:x.toObject()});res.status(201).json(x);});
export default router;
