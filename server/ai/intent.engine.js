/**
 * SustainOS AI Intent Detection Engine
 * Detects user intent from natural language query
 * Author: SustainOS Core AI Module
 */

const intents = {
 telemetry: [
  "submit",
  "save data",
  "voice data",
  "record data",
  "add data",
  "telemetry",
  "building",
  "energy",
  "water",
  "location",
  "sensor"
 ],

 profile: [
  "my profile",
  "update profile",
  "profile",
  "name",
  "building",
  "call me",
  "my name is",
  "mera naam"
 ],

 voice: [
  "voice",
  "speak",
  "spoken",
  "listen",
  "mic",
  "microphone",
  "hindi",
  "hinglish"
 ],

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

 compare: [
  "compare","comparison","better","worse","vs","versus","trend"
 ],

 action: [
  "what should i do","action","next step","next best action","fix","resolve","plan"
 ],

 report: [
  "report","summary","overview","executive","insight","dashboard"
 ],

 building: [
  "building","floor","site","campus","property","location"
 ],

 operations: [
  "operations","operation","facility","facilities","maintenance","uptime","downtime","asset","assets","equipment","hvac","occupancy","workflow","audit","compliance","sla","incident","shift","service","budget","procurement","industry"
 ],

 cause: [
 "cause","reason","why","problem","issue","root"],


 suggestion:["suggest","tip","improve","optimize","save","recommend"]

 ,
 smalltalk: [
  "hi","hello","hey","thanks","thank you","how are you","what can you do","who are you","good morning","good afternoon","good evening","what's up","whats up","how was your day","how is your day","tell me a joke"
 ]


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

 // choose intent with highest keyword match, but prefer user-facing modes first when tied
  if(score > maxMatch){
   maxMatch = score;
   detected = intent;
  }
 }

 return detected;
};
