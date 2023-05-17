const http = require('http');

const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const app = express();
const path = require('path');
const bodyParser = require('body-parser'); // Form Body(Post) Passing
const session = require('express-session'); // Login Session
const memoryStore = require('memorystore')(session); // Session 데이터 메모리 저장
const { MemoryStore } = require('express-session');

app.use(express.static(path.join(__dirname, '/public'))); // Public Use
app.use(expressLayouts);
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

const maxTime = 60 * 60 * 24; // Session 라이프 타임
const sessionObj = { // Session 보안 및 저장 위치, 라이프 타임 설정
    secret: 'security',
    resave: false,
    saveUninitialized: true,
    store: new MemoryStore({ checkPeriod:maxTime }),
    cookie: { maxTime }
};
app.use(session(sessionObj));

app.set('layout', 'layout'); // 레이아웃으로 Layout.ejs 설정
app.set("layout extractScripts", true);

app.set('views', __dirname + '/views'); // views(ejs) 디렉토리 설정
app.set('view engine', 'ejs'); // Ejs 사용
app.engine('html', require('ejs').renderFile);

app.use(require('./routes/getRouter')); // GetRouter 등록
app.use(require('./routes/postRouter')); // PostRouter 등록

const mongoose = require('mongoose'); // MongoDB
const chatLog = require('./Env/mongo'); // MonboDB Model

let httpServer = http.createServer(app);
const io = require('socket.io')(httpServer);

io.on('connection', (socket) => { // Chat Socket
    try {
        mongoose.connect('mongodb://yow:yow@13.125.77.214:27017/yow', { useNewUrlParser: true }); // MongoDB 접속
    } catch (error) {
        console.log(error);
    }

    socket.on('chat message', (msg) => { // 데이터 전송 이벤트
        var str = String(msg).split('|');
        var site = str[0];
        var content = str[2];
        var id = content.split(':')[0];
        content = content.replace(id + ": ", ""); // 메시지 정제
        
        var chat = new chatLog(); // MongoDB Model 생성
        chat.site = site;
        chat.id = id;
        chat.content = content;
        chat.save().then(() => {}).catch((error) => {}); // 데이터 저장

        io.emit('chat message', msg);
    });

    socket.on('disconnect', () => { // 채팅 서버 연결 해제 이벤트
        try {
            mongoose.disconnect(); // MongoDB 연결 해제
        } catch (error) {
            console.log(error);
        }
    });
});

httpServer.listen(9090, '0.0.0.0', ()=>{
    console.log("YOW Start...");
});