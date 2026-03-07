exports.predict=(values)=>{
 const avg=values.reduce((a,b)=>a+b,0)/values.length;
 return Math.round(avg);
}