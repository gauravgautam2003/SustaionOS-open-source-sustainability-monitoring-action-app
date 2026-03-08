const Data = require("../models/Data");
const Alert = require("../models/Alert");
const scoreService = require("../services/score.service");

exports.getScore = async (req, res, next) => {
 try {
  const { building } = req.params;
  const result = await scoreService.getScore(building);
  res.json(result);
 }
 catch (err) {
  next(err);
 }
};