import React, { useState } from "react";
import { Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Register = () => {

  const navigate = useNavigate();

  const [name,setName]=useState("");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [confirmPassword,setConfirmPassword]=useState("");

  const [showPass,setShowPass]=useState(false);
  const [showConfirm,setShowConfirm]=useState(false);

  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");

  const handleSubmit=async(e)=>{

    e.preventDefault();

    if(password!==confirmPassword){
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError("");

    try{

      const res = await fetch("http://localhost:5000/api/auth/register",{
        method:"POST",
        headers:{
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
          name,
          email,
          password
        })
      });

      const data = await res.json();

      if(!res.ok){
        setError(data.msg || "Registration failed");
        setLoading(false);
        return;
      }

      navigate("/login");

    }catch(err){

      setError("Server error");

    }

    setLoading(false);

  };

  return (

<div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-950 dark:to-gray-900">

<div className="w-full max-w-md bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-8">

<h2 className="text-3xl font-bold text-center mb-2 text-gray-900 dark:text-white">
Create <span className="text-primary">Account</span>
</h2>

<p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-6">
Join SustainOS platform
</p>

<form onSubmit={handleSubmit} className="space-y-4">

{/* Name */}

<div className="flex items-center border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-800">

<User size={18} className="text-gray-500"/>

<input
type="text"
placeholder="Full Name"
value={name}
onChange={(e)=>setName(e.target.value)}
required
className="w-full bg-transparent outline-none px-2 text-gray-900 dark:text-white"
/>

</div>

{/* Email */}

<div className="flex items-center border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-800">

<Mail size={18} className="text-gray-500"/>

<input
type="email"
placeholder="Email"
value={email}
onChange={(e)=>setEmail(e.target.value)}
required
className="w-full bg-transparent outline-none px-2 text-gray-900 dark:text-white"
/>

</div>

{/* Password */}

<div className="flex items-center border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-800">

<Lock size={18} className="text-gray-500"/>

<input
type={showPass ? "text":"password"}
placeholder="Password"
value={password}
onChange={(e)=>setPassword(e.target.value)}
required
className="w-full bg-transparent outline-none px-2 text-gray-900 dark:text-white"
/>

{showPass ?

<EyeOff
size={18}
className="cursor-pointer text-gray-500"
onClick={()=>setShowPass(false)}
/>

:

<Eye
size={18}
className="cursor-pointer text-gray-500"
onClick={()=>setShowPass(true)}
/>

}

</div>

{/* Confirm Password */}

<div className="flex items-center border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-800">

<Lock size={18} className="text-gray-500"/>

<input
type={showConfirm ? "text":"password"}
placeholder="Confirm Password"
value={confirmPassword}
onChange={(e)=>setConfirmPassword(e.target.value)}
required
className="w-full bg-transparent outline-none px-2 text-gray-900 dark:text-white"
/>

{showConfirm ?

<EyeOff
size={18}
className="cursor-pointer text-gray-500"
onClick={()=>setShowConfirm(false)}
/>

:

<Eye
size={18}
className="cursor-pointer text-gray-500"
onClick={()=>setShowConfirm(true)}
/>

}

</div>

{/* Error */}

{error && (
<p className="text-red-500 text-sm">{error}</p>
)}

{/* Button */}

<button
type="submit"
disabled={loading}
className="w-full bg-primary text-black py-2 rounded-lg font-medium hover:scale-105 transition"
>

{loading ? "Creating account..." : "Register"}

</button>

</form>

{/* Login link */}

<p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-6">

Already have an account?{" "}

<span
className="text-primary cursor-pointer hover:underline"
onClick={()=>navigate("/login")}
>
Login
</span>

</p>

</div>

</div>

  );
};

export default Register;