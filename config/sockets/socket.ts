// socket.ts
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import registerSocketEvents from './events';

const initializeSocketIO = (httpServer: HTTPServer): SocketIOServer => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*", // hoặc cấu hình chi tiết hơn tùy thuộc vào yêu cầu của bạn
      methods: ["GET", "POST"],
    },
  });

  io.on('connection', (socket: any) => {
    console.log('A user connected');
    registerSocketEvents(socket, io);
  });

  return io;
};

export default initializeSocketIO;
