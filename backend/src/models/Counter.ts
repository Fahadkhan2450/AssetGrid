import { Schema, model } from 'mongoose';
const schema=new Schema({key:{type:String,unique:true},value:{type:Number,default:0}},{collection:'counters'});
export const Counter=model('Counter',schema);
