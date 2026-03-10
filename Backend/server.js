const app=require("./app");
const connectDB=require("./config/db");
const {PORT}=require("./config/env");

const http=require("http");
const {Server}=require("socket.io");

connectDB();

const server=http.createServer(app);

const io=new Server(server,{
 cors:{origin:"*"}
});

global.io=io;

io.on("connection",(socket)=>{
 console.log("Client connected:",socket.id);
});

server.listen(PORT,()=>{
 console.log(`🚀 Server running on ${PORT}`);
});