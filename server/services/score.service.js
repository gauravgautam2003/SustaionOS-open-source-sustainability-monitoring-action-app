exports.calculateScore=(records,alerts)=>{

 let score=100;

 records.forEach(r=>{
  if(r.water>300) score-=15;
  if(r.energy>200) score-=15;
 });

 score-=alerts.length*5;

 if(score<0) score=0;

 let status="Excellent";

 if(score<80) status="Good";
 if(score<60) status="Warning";
 if(score<40) status="Critical";

 return{
  score,
  status
 };
}