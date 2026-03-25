import { io } from "socket.io-client";
import { getSocketBase } from "./api";

const SOCKET_URL = getSocketBase();

const socket = io(SOCKET_URL, { autoConnect: false });

export default socket;
