module.exports = (data)=>{

 if(data.water > 300){
  return { detected:true, reason:"Water spike" };
 }

 if(data.energy > 200){
  return { detected:true, reason:"Energy spike" };
 }

 return { detected:false };
};