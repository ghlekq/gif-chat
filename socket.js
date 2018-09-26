const SocketIO = require('socket.io');
const axios = require('axios');

module.exports = (server, app, sessionMiddleware) => {
  const io = SocketIO(server, { path: '/socket.io' });

  app.set('io', io);
  const room = io.of('/room');
  const chat = io.of('/chat');

  io.use((socket, next) => {
    sessionMiddleware(socket.request, socket.request.res, next);
  });

  room.on('connection', (socket) => {
    console.log('room 네임스페이스에 접속');
    socket.on('disconnect', () => {
      console.log('room 네임스페이스 접속 해제');
    });
  });

  chat.on('connection', (socket) => {
    console.log('chat 네임스페이스에 접속');
    const req = socket.request;
    const { headers: { referer } } = req;
    const roomId = referer
      .split('/')[referer.split('/').length - 1]
      .replace(/\?.+/, '');
    socket.join(roomId);
    // socket.to(roomId).emit('join', {
    //   user: 'system',
    //   chat: `${req.session.color}님이 입장하셨습니다.`,
    //   number:socket.adapter.rooms[roomId].length,
    // });

    //시험용 추가 시스템 메시지 db에추가
    axios.post(`https://localhost:8005/room/${roomId}/sys`,{
      type:'join',
    }, {
      headers: {
        Cookie: `connect.sid=${'s%3A'+cookie.sign(req.signedCookies['connect.sid'],process.env.COOKIE_SECRET)}`,
      },
    });
    socket.on('disconnect', () => {
      console.log('chat 네임스페이스 접속 해제');
      socket.leave(roomId);
      //방장이 나간 경우 방 인원 한명 랜덤으로 방장 위임
      //몽고디비로 room 스키마 owner update 
      const currentRoom = socket.adapter.rooms[roomId];
      const userCount = currentRoom ? currentRoom.length : 0;
      if (userCount === 0) {
        axios.delete(`http://localhost:8005/room/${roomId}`)
          .then(() => {
            console.log('방 제거 요청 성공');
          })
          .catch((error) => {
            console.error(error);
          });
      } else {
        // socket.to(roomId).emit('exit', {
        //   user: 'system',
        //   chat: `${req.session.color}님이 퇴장하셨습니다.`,
        //   number:socket.adapter.rooms[roomId].length,
        // });
        //시험용 추가 시스템 메시지 db에추가
       axios.post(`https://localhost:8005/room/${roomId}/sys`,{
        type:'exit',
      }, {
       headers: {
         Cookie: `connect.sid=${'s%3A'+cookie.sign(req.signedCookies['connect.sid'],process.env.COOKIE_SECRET)}`,
       },
     });
      }
    });
    socket.on('ban',(data)=>{
      socket.to(data.id).emit('ban');
    });
    socket.on('delegate',(data)=>{
      socket.to(data.id).emit('delegate');
    });
  });
};
