import { io } from "socket.io-client";
import { getApiBase } from "./api";

const SOCKET_URL = getApiBase();

const socket = io(SOCKET_URL, { autoConnect: false });

export default socket;
