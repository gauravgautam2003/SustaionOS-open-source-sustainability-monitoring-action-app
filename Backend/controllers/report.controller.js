const PDFDocument = require("pdfkit");
const reportService = require("../services/report.service");

exports.getReportData = async (req, res, next) => {
  try {
    const report = await reportService.generateReportData();
    res.json(report);
  } catch (err) {
    next(err);
  }
};

exports.downloadReport = async (req, res, next) => {
  try {

    const report = await reportService.generateReportData();

    const doc = new PDFDocument();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=Sustainability_Report.pdf"
    );

    doc.pipe(res);

    doc.fontSize(20).text("SustainOS Sustainability Report", {
      align: "center",
    });

    doc.moveDown();

    doc.fontSize(14).text(`Total Water Usage: ${report.totalWater} L`);
    doc.text(`Total Energy Usage: ${report.totalEnergy} kWh`);
    doc.text(`Alerts Triggered: ${report.alerts}`);
    doc.text(`Estimated Cost: ₹${report.cost}`);
    doc.text(`Carbon Emission: ${report.carbon} kg`);

    doc.end();
  } catch (err) {
    next(err);
  }
};