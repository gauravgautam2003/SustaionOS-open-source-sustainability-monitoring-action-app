import React, { useState } from "react";
import { Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "../utils/api";

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

      const res = await fetch(apiUrl("/api/auth/register"),{
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

    } catch {

      setError("Server error");

    }

    setLoading(false);

  };

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100dvh-3rem)] w-full max-w-6xl items-stretch gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="hidden overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.22),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(34,197,94,0.16),transparent_26%),linear-gradient(135deg,rgba(2,6,23,0.98),rgba(15,23,42,0.92))] p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">
              Join SustainOS
            </div>
            <h1 className="mt-6 max-w-lg text-4xl font-bold leading-tight">
              Create an account and start turning campus data into action.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
              Register once, then track telemetry, alerts, reports, and AI guidance from one clean dashboard.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 text-sm text-slate-200">
            {[
              "Built for live hackathon demos and judges",
              "Responsive dashboard with mobile-friendly controls",
              "AI-assisted workflows for voice and analytics",
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center">
          <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/95 p-6 text-gray-900 shadow-2xl backdrop-blur-xl sm:p-8 dark:bg-gray-950/90 dark:text-white">
            <h2 className="text-center text-3xl font-bold text-gray-900 dark:text-white">
              Create <span className="text-primary">Account</span>
            </h2>

            <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
              Join SustainOS platform
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 dark:border-gray-700 dark:bg-gray-800">
                <User size={18} className="shrink-0 text-gray-500" />
                <input
                  type="text"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full min-w-0 bg-transparent outline-none text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 dark:border-gray-700 dark:bg-gray-800">
                <Mail size={18} className="shrink-0 text-gray-500" />
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full min-w-0 bg-transparent outline-none text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 dark:border-gray-700 dark:bg-gray-800">
                <Lock size={18} className="shrink-0 text-gray-500" />
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full min-w-0 bg-transparent outline-none text-gray-900 dark:text-white"
                />
                {showPass ? (
                  <EyeOff
                    size={18}
                    className="cursor-pointer text-gray-500"
                    onClick={() => setShowPass(false)}
                  />
                ) : (
                  <Eye
                    size={18}
                    className="cursor-pointer text-gray-500"
                    onClick={() => setShowPass(true)}
                  />
                )}
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 dark:border-gray-700 dark:bg-gray-800">
                <Lock size={18} className="shrink-0 text-gray-500" />
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full min-w-0 bg-transparent outline-none text-gray-900 dark:text-white"
                />
                {showConfirm ? (
                  <EyeOff
                    size={18}
                    className="cursor-pointer text-gray-500"
                    onClick={() => setShowConfirm(false)}
                  />
                ) : (
                  <Eye
                    size={18}
                    className="cursor-pointer text-gray-500"
                    onClick={() => setShowConfirm(true)}
                  />
                )}
              </div>

              {error ? <p className="text-sm text-red-500">{error}</p> : null}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-primary py-3 font-medium text-black transition hover:scale-[1.01] disabled:opacity-60"
              >
                {loading ? "Creating account..." : "Register"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
              Already have an account?{" "}
              <span
                className="cursor-pointer text-primary hover:underline"
                onClick={() => navigate("/login")}
              >
                Login
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
