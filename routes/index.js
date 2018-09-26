const express=require('express');
const Room=require('../schemas/room');
const Chat=require('../schemas/chat');
const router=express.Router();

router.get('/',async(req,res,next)=>{
  try{
    const rooms=await Room.find({});
    res.render('main',{rooms,title:'GIF 채팅방',error:req.flash('roomError')});
  }catch(error){
    console.error();
    next(error);
  }});

  router.get('/room',(req,res)=>{
    res.render('room',{title:'GIF 채팅방 생성'});
  });
  router.post('/room',async(req,res,next)=>{
    try{
      const room=new Room({
        title:req.body.title,
        max:req.body.max,
        owner:req.session.color,
        password:req.body.password,
      });
      const newRoom=await room.save();
      const io=req.app.get('io');
      io.of('/room').emit('newRoom',newRoom);
      res.redirecct(`/room/${newRoom._id}?password=${req.body.password}`);
    }catch(error){
      console.error(error);
      next(error);
    }
  });

  router.get('/room/:id',async(req,res,next)=>{
    try{
      const room=await Room.findOne({_id:req.params.id});
      const io=req.app.get('io');
      if(!room){
        req.flash('roomError','존재하지 않는 방입니다');
        return res.redirect('/');
      }
      if(room.password&&room.password!==req.query.password){
        req.flash('roomError','비밀번호가 틀렸습니다');
        return res.redirecct('/');
      }
      const {rooms}=io.of('/chat').adapter;
      if(rooms&&room[req.params.id]&&room.max<=rooms[req.params.id].length){
        req.flash('roomError','허용인원을 초과하였습니다');
        return res.redirect('/');
      }
      //강퇴당한사람인지 체크
      return res.render('chat',{
        room,
        title:room.title,
        chats:[],
        number:(rooms&&rooms[req.params.is]&&rooms[req.param.id].length+1) || 1,
        user:req.session.color,
      });
    }catch(error){
      console.error(error);
      return next(error);
    }
  });

  router.delete('/room/:id',async(req,res,next)=>{
    try{
      await Room.remove({_id:req.params.id});
      await Chat.remove({room:req.params.id});
      res.send('OK');
      setTimeout(()=>{
        req.app.get('io').of('/room').emit('removeRoom',req.params.id);
      },2000);
    }catch(error){
      console.error(error);
      next(error);
    }
  });

  //시스템메시지 db에 넣기
  router.post('/room/:id/sys',async(req,res,next)=>{
    try{
      const chat =req.body.type=='join'
      ? `${req.session.color}님이 입장하셨습니다.`
      : `${req.session.color}님이 퇴장하셨습니다.`;
      const sys=new Chat({
        room:req.params.id,
        user:'system',
        chat,
      });
      await sys.save();
      req.app.get('io').of('/chat').to(req.params.id).emit('join',{
        user:'system',
        chat,
        number:req.app.get('io').of('/chat').adapter.rooms[req.params.id].length,
      });
      res.send('ok');
    }catch(error){
      console.error(error);
      next(error);
    }
  });

  //검색
  router.get('/search', function(req, res){
    var search_word = req.param('searchWord');
    var searchCondition = {$regex:search_word};

    BoardContents.find({deleted:false, $or:[{title:searchCondition},{contents:searchCondition},{writer:searchCondition}]}).sort({date:-1}).exec(function(err, searchContents){
        if(err) throw err;

        res.render('board', {title: "Board", contents: searchContents});
    });
});
  //router ban 강퇴당한 사람은 디비에 저장한다.

//검색기능 함수
function createSearch(queries){
  var firstPost={};
  if(queries.searchType && queries.searchText && queries.searchText.length>=2){
    var searchTypes=queries.searchType.toLowerCase().split(",");
    var postQueries=[];
    if(searchTypes.indexOf('chat')>=0){
      postQueries.push({chat:{$regex:new RegExp(queries.searchText,"i")}});
    }
    if(postQueries.length>0) findPost={$or:postQueries};
  }
  return {searchType:queries.searchType,searchText:queries.searchText,
  findPost:findPost};
}
  module.exports=router;