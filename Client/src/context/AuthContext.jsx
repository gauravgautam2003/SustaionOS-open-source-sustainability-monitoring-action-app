import { createContext, useState, useEffect } from "react";

const AuthContext = createContext();

const AuthProvider = ({ children }) => {

 const [user,setUser]=useState(null);
 const [loading,setLoading]=useState(true);

 useEffect(()=>{

  const token = localStorage.getItem("token");

  if(token){
   setUser({token});
  }

  setLoading(false);

 },[]);

 const login=(token)=>{

  localStorage.setItem("token",token);
  setUser({token});

 };

 const logout=()=>{

  localStorage.removeItem("token");
  setUser(null);

 };

 return(

<AuthContext.Provider value={{user,login,logout,loading}}>
{children}
</AuthContext.Provider>

 );

};

export {AuthContext,AuthProvider};