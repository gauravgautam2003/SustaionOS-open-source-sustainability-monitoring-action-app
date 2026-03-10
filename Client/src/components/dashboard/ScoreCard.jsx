import React from "react";
import Card from "../ui/Card";

const ScoreCard = ({ score }) => {
  const getColor = () => {
    if (score >= 80) return "text-green-400";
    if (score >= 50) return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <Card className="flex flex-col items-center justify-center text-center">
      <h3 className="text-lg text-gray-400 mb-2">
        Sustainability Score
      </h3>

      <div className={`text-5xl font-bold ${getColor()}`}>
        {score}
      </div>

      <p className="text-sm text-gray-500 mt-2">
        Overall Performance Index
      </p>
    </Card>
  );
};

export default ScoreCard;