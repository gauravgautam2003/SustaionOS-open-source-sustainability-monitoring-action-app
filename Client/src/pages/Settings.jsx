import React, { useState, useEffect, useContext } from "react";
import Card from "../components/ui/Card";
import { ThemeContext } from "../context/ThemeContext";

const Settings = () => {

const { darkMode, setDarkMode } = useContext(ThemeContext);

const [settings,setSettings]=useState({
 aiSuggestions:true,
 predictiveInsights:true,
 energyLimit:500,
 waterLimit:200,
 energyAlerts:true,
 waterAlerts:true,
 weeklyReports:false,
 sustainabilityGoal:20
});

const [loading,setLoading]=useState(true);

useEffect(()=>{

fetch("http://localhost:5000/api/settings",{
 headers:{
  Authorization:`Bearer ${localStorage.getItem("token")}`
 }
})
.then(res=>res.json())
.then(data=>{
 setSettings(data)
 setDarkMode(data.darkMode)
 setLoading(false)
})

},[])

const saveSettings=async()=>{

await fetch("http://localhost:5000/api/settings",{

 method:"PUT",

 headers:{
  "Content-Type":"application/json",
  Authorization:`Bearer ${localStorage.getItem("token")}`
 },

 body:JSON.stringify(settings)

})

alert("Settings updated successfully")

}

if(loading) return <div className="text-center">Loading Settings...</div>

return(

<div className="space-y-8">

{/* Header */}

<div>

<h1 className="text-3xl font-bold text-gray-900 dark:text-white">
System Settings
</h1>

<p className="text-gray-600 dark:text-gray-400 mt-1">
Manage your sustainability platform configuration
</p>

</div>


{/* Profile */}

<Card>

<h3 className="text-lg font-semibold mb-6">
Profile Preferences
</h3>

<div className="grid md:grid-cols-2 gap-4">

<input
type="text"
placeholder="Full Name"
className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 px-4 py-2 rounded-lg"
/>

<input
type="email"
placeholder="Email Address"
className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 px-4 py-2 rounded-lg"
/>

</div>

</Card>


{/* AI System */}

<Card>

<h3 className="text-lg font-semibold mb-6">
AI Intelligence System
</h3>

<div className="space-y-4">

<label className="flex justify-between">

Enable AI Suggestions

<input
type="checkbox"
checked={settings.aiSuggestions}
onChange={(e)=>setSettings({...settings,aiSuggestions:e.target.checked})}
/>

</label>

<label className="flex justify-between">

Predictive Analytics

<input
type="checkbox"
checked={settings.predictiveInsights}
onChange={(e)=>setSettings({...settings,predictiveInsights:e.target.checked})}
/>

</label>

</div>

</Card>


{/* Sustainability Goals */}

<Card>

<h3 className="text-lg font-semibold mb-6">
Sustainability Goals
</h3>

<input
type="number"
value={settings.sustainabilityGoal}
onChange={(e)=>setSettings({...settings,sustainabilityGoal:e.target.value})}
className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 px-4 py-2 rounded-lg"
/>

<p className="text-sm text-gray-500 mt-2">
Target percentage reduction in energy consumption
</p>

</Card>


{/* Monitoring Threshold */}

<Card>

<h3 className="text-lg font-semibold mb-6">
Monitoring Thresholds
</h3>

<div className="grid md:grid-cols-2 gap-4">

<input
type="number"
value={settings.energyLimit}
onChange={(e)=>setSettings({...settings,energyLimit:e.target.value})}
className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 px-4 py-2 rounded-lg"
/>

<input
type="number"
value={settings.waterLimit}
onChange={(e)=>setSettings({...settings,waterLimit:e.target.value})}
className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 px-4 py-2 rounded-lg"
/>

</div>

</Card>


{/* Notifications */}

<Card>

<h3 className="text-lg font-semibold mb-6">
Alert Notifications
</h3>

<div className="space-y-4">

<label className="flex justify-between">

Energy Alerts

<input
type="checkbox"
checked={settings.energyAlerts}
onChange={(e)=>setSettings({...settings,energyAlerts:e.target.checked})}
/>

</label>

<label className="flex justify-between">

Water Leakage Alerts

<input
type="checkbox"
checked={settings.waterAlerts}
onChange={(e)=>setSettings({...settings,waterAlerts:e.target.checked})}
/>

</label>

<label className="flex justify-between">

Weekly Sustainability Reports

<input
type="checkbox"
checked={settings.weeklyReports}
onChange={(e)=>setSettings({...settings,weeklyReports:e.target.checked})}
/>

</label>

</div>

</Card>


{/* Theme */}

<Card>

<h3 className="text-lg font-semibold mb-6">
Theme Preferences
</h3>

<div className="flex justify-between">

Dark Mode

<input
type="checkbox"
checked={darkMode}
onChange={(e)=>{

 setDarkMode(e.target.checked)

 setSettings({...settings,darkMode:e.target.checked})

}}
/>

</div>

</Card>


{/* Data Management */}

<Card>

<h3 className="text-lg font-semibold mb-6">
Data Management
</h3>

<div className="flex gap-4">

<button className="bg-blue-500 text-white px-4 py-2 rounded-lg">
Export Data
</button>

<button className="bg-yellow-500 text-black px-4 py-2 rounded-lg">
Clear AI Chat
</button>

</div>

</Card>


{/* Danger Zone */}

<Card className="border border-red-400">

<h3 className="text-lg text-red-500 font-semibold mb-4">
Danger Zone
</h3>

<button className="bg-red-500 text-white px-4 py-2 rounded-lg">
Delete Account
</button>

</Card>


<button
onClick={saveSettings}
className="bg-primary text-black px-6 py-2 rounded-lg hover:scale-105 transition"
>

Save All Settings

</button>

</div>

)

}

export default Settings