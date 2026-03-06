const axios = require("axios");

setInterval(()=>{
 axios.post("http://localhost:5000/api/data/send",{
  building:"Block A",
  water: Math.floor(Math.random()*400),
  energy: Math.floor(Math.random()*300)
 });
},2000);