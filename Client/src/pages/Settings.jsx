import React, { useState, useContext, useEffect } from "react";
import Card from "../components/ui/Card";
import { ThemeContext } from "../context/ThemeContext";

const Settings = () => {

const { darkMode, setDarkMode } = useContext(ThemeContext);

const [notifications,setNotifications]=useState(true);
const [aiSuggestions,setAiSuggestions]=useState(true);
const [predictions,setPredictions]=useState(true);

const [energyLimit,setEnergyLimit]=useState(500);
const [waterLimit,setWaterLimit]=useState(200);

useEffect(()=>{

 const savedEnergy=localStorage.getItem("energyLimit");
 const savedWater=localStorage.getItem("waterLimit");

 if(savedEnergy) setEnergyLimit(savedEnergy);
 if(savedWater) setWaterLimit(savedWater);

},[])

const saveLimits=()=>{

 localStorage.setItem("energyLimit",energyLimit);
 localStorage.setItem("waterLimit",waterLimit);

 alert("Monitoring limits saved");

}

const clearChat=()=>{

 localStorage.removeItem("aiChatHistory");
 alert("AI chat history cleared");

}

const exportData=()=>{

 alert("Export feature will generate sustainability report");

}

return (

<div className="space-y-8">

{/* Header */}

<div>
<h1 className="text-2xl md:text-3xl font-bold">
Account Settings
</h1>

<p className="text-gray-600 dark:text-gray-400 mt-1">
Manage system preferences and sustainability monitoring configuration
</p>
</div>


{/* Profile Section */}

<Card>

<h3 className="text-lg font-semibold mb-6">
Profile Information
</h3>

<div className="grid grid-cols-1 md:grid-cols-2 gap-6">

<input
type="text"
placeholder="Full Name"
className="bg-gray-200 dark:bg-gray-900
border border-gray-300 dark:border-gray-700
text-gray-900 dark:text-white
px-4 py-2 rounded-lg text-sm"
/>

<input
type="email"
placeholder="Email Address"
className="bg-gray-200 dark:bg-gray-900
border border-gray-300 dark:border-gray-700
text-gray-900 dark:text-white
px-4 py-2 rounded-lg text-sm"
/>

</div>

<button className="mt-6 bg-primary text-black px-4 py-2 rounded-lg hover:scale-105 transition">
Save Profile
</button>

</Card>


{/* Notification Settings */}

<Card>

<h3 className="text-lg font-semibold mb-6">
Notification Settings
</h3>

<div className="space-y-6">

<div className="flex items-center justify-between">

<span>Email Notifications</span>

<button
onClick={()=>setNotifications(!notifications)}
className={`w-12 h-6 flex items-center rounded-full p-1 transition ${
notifications ? "bg-primary":"bg-gray-400"
}`}
>

<div
className={`bg-white w-4 h-4 rounded-full transform transition ${
notifications ? "translate-x-6":"translate-x-0"
}`}
/>

</button>

</div>

</div>

</Card>


{/* AI Assistant Settings */}

<Card>

<h3 className="text-lg font-semibold mb-6">
AI Assistant Settings
</h3>

<div className="space-y-6">

<div className="flex items-center justify-between">

<span>Enable AI Suggestions</span>

<button
onClick={()=>setAiSuggestions(!aiSuggestions)}
className={`w-12 h-6 flex items-center rounded-full p-1 transition ${
aiSuggestions ? "bg-primary":"bg-gray-400"
}`}
>

<div
className={`bg-white w-4 h-4 rounded-full transform transition ${
aiSuggestions ? "translate-x-6":"translate-x-0"
}`}
/>

</button>

</div>


<div className="flex items-center justify-between">

<span>Enable Predictive Insights</span>

<button
onClick={()=>setPredictions(!predictions)}
className={`w-12 h-6 flex items-center rounded-full p-1 transition ${
predictions ? "bg-primary":"bg-gray-400"
}`}
>

<div
className={`bg-white w-4 h-4 rounded-full transform transition ${
predictions ? "translate-x-6":"translate-x-0"
}`}
/>

</button>

</div>

</div>

</Card>


{/* Monitoring Limits */}

<Card>

<h3 className="text-lg font-semibold mb-6">
Resource Monitoring Limits
</h3>

<div className="grid md:grid-cols-2 gap-6">

<div>

<p className="text-sm mb-1">
Energy Alert Threshold (kWh)
</p>

<input
type="number"
value={energyLimit}
onChange={(e)=>setEnergyLimit(e.target.value)}
className="w-full bg-gray-200 dark:bg-gray-900
border border-gray-300 dark:border-gray-700
px-4 py-2 rounded-lg"
/>

</div>

<div>

<p className="text-sm mb-1">
Water Usage Limit (Liters)
</p>

<input
type="number"
value={waterLimit}
onChange={(e)=>setWaterLimit(e.target.value)}
className="w-full bg-gray-200 dark:bg-gray-900
border border-gray-300 dark:border-gray-700
px-4 py-2 rounded-lg"
/>

</div>

</div>

<button
onClick={saveLimits}
className="mt-6 bg-primary text-black px-4 py-2 rounded-lg hover:scale-105 transition"
>

Save Limits

</button>

</Card>


{/* Dashboard Preferences */}

<Card>

<h3 className="text-lg font-semibold mb-6">
Dashboard Preferences
</h3>

<div className="flex items-center justify-between">

<span>Dark Mode</span>

<button
onClick={()=>setDarkMode(!darkMode)}
className={`w-12 h-6 flex items-center rounded-full p-1 transition ${
darkMode ? "bg-primary":"bg-gray-400"
}`}
>

<div
className={`bg-white w-4 h-4 rounded-full transform transition ${
darkMode ? "translate-x-6":"translate-x-0"
}`}
/>

</button>

</div>

</Card>


{/* Data Management */}

<Card>

<h3 className="text-lg font-semibold mb-6">
Data Management
</h3>

<div className="flex gap-4 flex-wrap">

<button
onClick={exportData}
className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:scale-105 transition"
>

Export System Data

</button>

<button
onClick={clearChat}
className="bg-yellow-500 text-black px-4 py-2 rounded-lg hover:scale-105 transition"
>

Clear AI Chat History

</button>

</div>

</Card>


{/* Danger Zone */}

<Card className="border border-red-400/40">

<h3 className="text-lg font-semibold text-red-500 mb-4">
Danger Zone
</h3>

<button className="bg-red-500 text-white px-4 py-2 rounded-lg hover:scale-105 transition">
Delete Account
</button>

</Card>

</div>

);

};

export default Settings;