const Data = require("../models/Data");
const detect = require("../services/detection.service").detect;
const alertService = require("../services/alert.service");
const ai = require("../ai/aiAnalyzer");

exports.sendData = async (req, res, next) => {
 try {
  const { building, water, energy } = req.body;

  // save reading
  const saved = await Data.create({ building, water, energy });

  // realtime emit
  if (global.io) {
   global.io.emit("newData", saved);
  }

  // anomaly detection
  const result = detect(water, energy);

  let aiResult = null;

  if (result.status) {

   // save alert
   await alertService.createAlert({
    building,
    message: result.reason,
    severity: result.severity
   });

   // AI analysis
   aiResult = ai.analyze(result.reason);

   // realtime alert emit
   if (global.io) {
    global.io.emit("newAlert", {
     building,
     message: result.reason,
     severity: result.severity
    });
   }
  }

  res.status(201).json({
   success: true,
   data: saved,
   anomaly: result,
   ai: aiResult
  });

 } catch (err) {
  next(err);
 }
};