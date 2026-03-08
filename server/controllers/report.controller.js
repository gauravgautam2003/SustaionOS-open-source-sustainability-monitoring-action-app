const PDFDocument = require("pdfkit");
const reportService = require("../services/report.service");

exports.downloadReport = async (req,res,next)=>{
 try{
  const report = await reportService.generateReportData();

  const doc = new PDFDocument();

  res.setHeader("Content-Type","application/pdf");
  res.setHeader("Content-Disposition","attachment; filename=report.pdf");

  doc.pipe(res);

  doc.fontSize(20).text("SustainOS Sustainability Report",{align:"center"});
  doc.moveDown();

  doc.fontSize(14).text(`Total Water Usage: ${report.totalWater} L`);
  doc.text(`Total Energy Usage: ${report.totalEnergy} kWh`);
  doc.text(`Alerts Triggered: ${report.alerts}`);
  doc.text(`Estimated Cost: ₹${report.cost.toFixed(2)}`);
  doc.text(`Carbon Emission: ${report.carbon.toFixed(2)} kg`);

  doc.moveDown();
  doc.text("System Status: Automated Analysis Enabled");

  doc.end();

 }
 catch(err){next(err)}
};