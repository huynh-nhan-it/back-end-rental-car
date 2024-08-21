// events.ts
import { Socket, Server } from 'socket.io';
import saveMessageToDB from './messageService'; // Giả sử bạn có một service để lưu tin nhắn vào DB

interface JoinRoomPayload {
  room: string;
}

interface SendMessagePayload {
  room: string;
  message: string;
}

const registerSocketEvents = (socket: Socket, io: Server): void => {
  socket.on('joinRoom', ({ room }: JoinRoomPayload) => {
    socket.join(room);
    console.log(`User joined room: ${room}`);
  });

  socket.on('sendMessage', ({ room, message }: SendMessagePayload) => {
    io.to(room).emit('receiveMessage', message);
    saveMessageToDB(room, message);
  });

  socket.on('offer', (data) => {
    socket.broadcast.emit('offer', data);
  });

  socket.on('answer', (data) => {
    socket.broadcast.emit('answer', data);
  });

  socket.on('candidate', (data) => {
    socket.broadcast.emit('candidate', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
};

export default registerSocketEvents;
