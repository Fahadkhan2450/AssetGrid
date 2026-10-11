import { Schema, model } from 'mongoose';
const schema=new Schema({actorId:{type:Schema.Types.ObjectId,index:true},action:{type:String,required:true},entityType:{type:String,required:true},entityId:String,oldValue:Schema.Types.Mixed,newValue:Schema.Types.Mixed,metadata:Schema.Types.Mixed,createdAt:{type:Date,default:Date.now,index:true}},{collection:'auditLogs'});
export const AuditLog=model('AuditLog',schema);
