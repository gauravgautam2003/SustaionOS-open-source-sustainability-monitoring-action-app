import { io } from "socket.io-client";

// Tera backend URL
const SOCKET_URL = "http://localhost:5000";

// Ek single socket instance create karo
const socket = io(SOCKET_URL, { autoConnect: false });

export default socket;