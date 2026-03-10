import React, { useEffect, useState } from "react";
import Card from "../components/ui/Card";
import { Download } from "lucide-react";

const Reports = () => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Fetch report data from backend
  useEffect(() => {
    const fetchReportData = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/report/data");
        if (!res.ok) throw new Error("Failed to fetch report data");
        const data = await res.json();
        setReportData(data);
      } catch (err) {
        console.error("Error fetching report data:", err);
        alert("Failed to load report data. Check backend.");
      } finally {
        setLoading(false);
      }
    };
    fetchReportData();
  }, []);

  // Export PDF
  const handleExportPDF = async () => {
    setPdfLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/report/pdf", {
        method: "GET",
      });

      if (!res.ok) throw new Error("Failed to generate PDF");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Sustainability_Report.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error("PDF Export Error:", err);
      alert("Failed to export PDF. Check server.");
    } finally {
      setPdfLoading(false);
    }
  };

  if (loading)
    return <p className="text-gray-600 dark:text-gray-400">Loading report...</p>;

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            Sustainability Reports
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Executive summary & downloadable reports
          </p>
        </div>

        <button
          onClick={handleExportPDF}
          disabled={pdfLoading}
          className={`flex items-center justify-center gap-2 bg-primary text-black px-4 py-2 rounded-lg hover:scale-105 transition w-full md:w-auto ${
            pdfLoading ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          <Download size={18} />
          {pdfLoading ? "Generating..." : "Export Report"}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Total Energy Consumption
          </p>
          <h2 className="text-2xl font-semibold mt-2">
            {reportData?.totalEnergy} kWh
          </h2>
        </Card>

        <Card>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Total Water Usage
          </p>
          <h2 className="text-2xl font-semibold mt-2">
            {reportData.totalWater} L
          </h2>
        </Card>

        <Card>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Carbon Emission
          </p>
          <h2 className="text-2xl font-semibold text-red-500 mt-2">
            {reportData.carbon} kg CO₂
          </h2>
        </Card>
      </div>

      {/* Monthly Breakdown */}
      {reportData.monthly && (
        <Card>
          <h3 className="text-lg font-semibold mb-4">
            Monthly Sustainability Overview
          </h3>
          <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
            {reportData.monthly.map((m, idx) => (
              <div
                key={idx}
                className={`flex justify-between border-b border-gray-300 dark:border-gray-800 pb-2 ${
                  idx === reportData.monthly.length - 1 ? "" : ""
                }`}
              >
                <span>{m.month}</span>
                <span>Efficiency Score: {m.efficiency}%</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recommendation Summary */}
      <Card>
        <h3 className="text-lg font-semibold mb-4">
          AI Executive Recommendation
        </h3>

        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
          {reportData.recommendation}
        </p>
      </Card>
    </div>
  );
};

export default Reports;