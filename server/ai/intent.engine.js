/**
 * SustainOS AI Intent Detection Engine
 * Detects user intent from natural language query
 * Author: SustainOS Core AI Module
 */

const intents = {
 water: [
  "water","leak","usage","litre","liter","consumption","pipeline","tank","flow"
 ],
 energy: [
  "energy","electricity","power","kwh","current","voltage","load","units"
 ],
 alert: [
  "alert","warning","issue","problem","fault","error","notification"
 ],
 cost: [
  "cost","bill","expense","price","money","charge","payment"
 ],
 carbon: [
  "carbon","co2","emission","pollution","footprint","environment"
 ],
 prediction: [
  "predict","prediction","forecast","tomorrow","next","future","estimate"
 ],
 score: [
  "score","rating","efficiency","performance","sustainability"
 ],
 history: [
  "history","previous","past","last","records","log","data"
 ],

 cause: [
 "cause","reason","why","problem","issue","root"],


 suggestion:["suggest","tip","improve","optimize","save","recommend"]


};

exports.detectIntent = (question) => {

 if(!question || typeof question !== "string")
  return "unknown";

 const q = question.toLowerCase();

 let detected = "unknown";
 let maxMatch = 0;

 // loop through all intents
 for(const intent in intents){

  const keywords = intents[intent];
  let score = 0;

  keywords.forEach(word=>{
   if(q.includes(word))
    score++;
  });

  // choose intent with highest keyword match
  if(score > maxMatch){
   maxMatch = score;
   detected = intent;
  }
 }

 return detected;
};