exports.getAction = (reason) => {

 reason = reason.toLowerCase();

 if(reason.includes("water"))
  return {
   action:"Inspect pipeline valves",
   priority:"HIGH",
   eta:"Immediate"
  };

 if(reason.includes("energy"))
  return {
   action:"Check heavy load devices",
   priority:"MEDIUM",
   eta:"30 minutes"
  };

 if(reason.includes("spike"))
  return {
   action:"Check abnormal consumption source",
   priority:"HIGH",
   eta:"Immediate"
  };

 return {
  action:"Manual inspection required",
  priority:"LOW",
  eta:"Routine check"
 };
};