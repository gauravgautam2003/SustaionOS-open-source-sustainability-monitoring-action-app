exports.detect=(water,energy)=>{

 if(water>300)
  return {status:true,reason:"Water Spike",severity:"high"};

 if(energy>200)
  return {status:true,reason:"Energy Spike",severity:"medium"};

 return {status:false};
}