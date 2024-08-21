// messageService.ts
import Message from '../../models/Message'; // Giả sử bạn có một model Message để lưu tin nhắn vào DB

const saveMessageToDB = async (room: string, message: any) => {
  const newMessage = new Message({
    room,
    senderId: message.sender, // Giả sử tin nhắn có trường sender
    message: message.content, // Giả sử tin nhắn có trường content
  });

  try {
    await newMessage.save();
    console.log('Message saved to DB successfully');
  } catch (error) {
    console.error('Error saving message to DB', error);
  }
};

export default saveMessageToDB;
