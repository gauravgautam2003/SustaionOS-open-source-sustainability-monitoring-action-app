exports.analyze=(reason)=>{
 return {
 explanation:`Detected anomaly due to ${reason}`,
 solution:"Inspect infrastructure immediately",
 confidence:"97%"
 };
}