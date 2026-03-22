const calculateScore = (data) => {

 let score = 100;

 // ⚡ ENERGY
 if (data.energy > 500) score -= 10;
 if (data.energy > 800) score -= 15;

 // 💧 WATER
 if (data.water > 200) score -= 5;
 if (data.water > 500) score -= 10;

 // 🌍 CARBON (optional safe check)
 if (data.carbon && data.carbon > 100) {
  score -= 8;
 }

 // LIMIT
 if (score < 0) score = 0;

 // 🎯 GRADE
 let grade = "Excellent";
 if (score < 80) grade = "Good";
 if (score < 60) grade = "Moderate";
 if (score < 40) grade = "Poor";

 // 🧠 MESSAGE
 let message = "System running efficiently.";
 if (score < 80) message = "Can be improved.";
 if (score < 60) message = "Optimization needed.";
 if (score < 40) message = "Immediate action required!";

 return {
  score,
  grade,
  message
 };
};

module.exports = calculateScore;