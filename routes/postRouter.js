const express = require('express');
const router = express.Router();
const DBPool = require('../Env/db');
const multer = require('multer');
var FileStorage = multer.diskStorage({ // 일반 게시글 파일(이미지, 파일) 경로
    destination: function (req, file, cb) { cb(null, 'public/files/'); },
    filename: function (req, file, cb) { cb(null, file.originalname); }
});
var FileUpload = multer({ storage: FileStorage });
var MovieStorage = multer.diskStorage({ // 영상 게시글 파일(썸네일, 동영상) 경로
    destination: function (req, file, cb) { cb(null, 'public/movies/'); },
    filename: function (req, file, cb) { cb(null, file.originalname); }
});
var MovieUpload = multer({ storage: MovieStorage });

router.post('/loginCheck', async (req, res) => { // 로그인 처리
    let result, field;

    try {
        [result, field] = await DBPool.query("SELECT * FROM userinfo WHERE id=?", req.body.id);

        if (req.body.id == '' || req.body.pw == '') res.redirect('/msg?str=ID or PW Input&url=/'); // ID, PW 입력 검증
        else if (result[0] == null) res.redirect('/msg?str=Not Find ID&url=/'); // 없는 계정
        else if (result[0].usetf == 'x') res.redirect('/msg?str=Not Using ID&url=/'); // 정지 계정
        else if (result[0].pw == req.body.pw) {
            req.session.user = { // 세션에 user 필드에 특정 데이터 저장
                id: result[0].id,
                name: result[0].name,
                img: result[0].img,
                email: result[0].email,
                admin: result[0].admin,
                usetf: result[0].usetf
            }
            res.redirect('/msg?str=Login&url=/');
        }
        else res.redirect('/msg?str=ID And PW Error&url=/');
    } catch (error) {
        console.log(error);
    }
});

router.post('/joinSubmit', async (req, res) => { // 회원가입 처리
    let sqlItem;
    sqlItem = [req.body.id, req.body.pw, req.body.name, req.body.email];

    try {
        if (req.body.id == '' || req.body.pw == '') res.redirect('/msg?str=ID or PW Input&url=/join'); // ID, PW 입력 검증
        else {
            await DBPool.query("INSERT INTO userinfo(id, pw, name, email) VALUES(?, ?, ?, ?)", sqlItem);

            res.redirect('/msg?str=Join!&url=/');
        }
    } catch (error) {
        console.log(error);
    }
});

router.post('/userInfoChange', async (req, res) => { // 회원 정보 수정
    let sqlItem, result, field;;
    sqlItem = [req.body.pw, req.body.name, req.body.email, req.body.id];

    try {
        if (req.body.pw == '') res.redirect('/msg?str=PW Input&url=/myPage'); // PW 입력 검증
        else {
            await DBPool.query("UPDATE userinfo SET pw=?, name=?, email=? WHERE id=?", sqlItem); // 정보 수정

            [result, field] = await DBPool.query("SELECT * FROM userinfo WHERE id=?", req.body.id); // 수정한 데이터 조회
            req.session.user = { // 수정한 데이터 저장
                id: result[0].id,
                name: result[0].name,
                img: result[0].img,
                email: result[0].email,
                admin: result[0].admin,
                usetf: result[0].usetf
            }

            res.redirect('/msg?str=UPDATE!&url=/myPage');
        }
    } catch (error) {
        console.log(error);
    }
});
router.post('/profileUpload', FileUpload.single('file'), async (req, res) => { // 회원 프로필 사진 업로드
    let sqlItem, result, field;

    if (req.file == undefined) res.redirect('/msg?str=Img Null!&url=/myPage'); // 업로드된 이미지 없을 시 Error 출력
    else {
        sqlItem = [req.file.originalname, req.session.user.id];
        await DBPool.query("UPDATE userinfo SET img=? WHERE id=?", sqlItem); // 프로필 업데이트

        [result, field] = await DBPool.query("SELECT * FROM userinfo WHERE id=?", req.session.user.id); // 업데이트된 데이터 Select
        req.session.user = {
            id: result[0].id,
            name: result[0].name,
            img: result[0].img,
            email: result[0].email,
            admin: result[0].admin,
            usetf: result[0].usetf
        }

        res.redirect('/msg?str=Profile Update!&url=/myPage'); // MyPage로 Redirect
    }
});

router.post('/memberOut', async (req, res) => { // 회원 탈퇴
    await DBPool.query("DELETE FROM userinfo WHERE id=?", req.session.user.id);
    res.redirect('/msg?str=User Delete!&url=/logout');
});

router.post('/insertBoard', FileUpload.array('multifile'), async (req, res) => { // 일반 게시글 등록
    let title = req.body.title;
    let content = req.body.content;
    let sqlItem, result, field, strtime;
    let time = new Date(Date.now());

    if (title == '' || content == '') res.redirect('/msg?str=Title or Content Input!&url=/boardInsert?opt=board');
    else {
        sqlItem = [req.session.user.id, req.session.user.img, title, content, time, req.body.BandM];
        await DBPool.query("INSERT INTO board(id, img, title, content, time, opt) VALUES(?, ?, ?, ?, ?, ?)", sqlItem); // 글 데이터 삽입

        strtime = time.getFullYear() + "-0" + (time.getMonth() + 1) + "-0" + time.getDate() + " " +
            time.getHours() + ":" + time.getMinutes() + ":" + time.getSeconds(); // 시간 데이터 정제

        sqlItem = [req.session.user.id, title, strtime];
        [result, field] = await DBPool.query("SELECT * FROM board WHERE id=? AND title=? AND time=?", sqlItem); // 게시글 번호 SELECT

        for (var i = 0; i < req.files.length; i++) {
            sqlItem = [result[0].bno, req.files[i].originalname];
            await DBPool.query("INSERT INTO boardFiles VALUES(?, ?)", sqlItem); // 파일 데이터 저장
        }

        res.redirect('/msg?str=Board Insert!&url=/');
    }
});
router.post('/insertMovie', MovieUpload.array('movie'), async (req, res) => { // 영상 게시글 등록
    let title = req.body.title;
    let content = req.body.content;
    let sqlItem, result, field, strtime;
    let time = new Date(Date.now());

    if (title == '' || content == '') res.redirect('/msg?str=Title or Content Input!&url=/boardInsert?opt=movie');
    else if (req.files.length != 2) res.redirect('/msg?str=Thumbnail or Movie Input!&url=/boardInsert?opt=movie');
    else {
        sqlItem = [req.session.user.id, req.session.user.img, req.files[0].originalname, title, content, time, req.body.BandM];
        await DBPool.query("INSERT INTO board(id, img, thumbnail, title, content, time, opt) VALUES(?, ?, ?, ?, ?, ?, ?)", sqlItem); // 글 데이터 삽입

        strtime = time.getFullYear() + "-0" + (time.getMonth() + 1) + "-0" + time.getDate() + " " +
            time.getHours() + ":" + time.getMinutes() + ":" + time.getSeconds(); // 시간 데이터 정제

        sqlItem = [req.session.user.id, title, strtime];
        [result, field] = await DBPool.query("SELECT * FROM board WHERE id=? AND title=? AND time=?", sqlItem); // 게시글 번호 SELECT
        sqlItem = [result[0].bno, req.files[1].originalname];
        await DBPool.query("INSERT INTO boardFiles VALUES(?, ?)", sqlItem); // 영상 데이터 저장

        res.redirect('/msg?str=Board Insert!&url=/');
    }
});
router.post('/updateBoard', FileUpload.array('multifile'), async (req, res) => {
    let title = req.body.title;
    let content = req.body.content;
    let bno = req.body.bno;
    
    if (title == '' || content == '') res.redirect('/msg?str=Title or Content Input!&url=/boardInsert?opt=board');
    else
    {
        sqlItem = [title, content, req.body.BandM, bno];
        await DBPool.query("UPDATE board SET title=?, content=?, opt=? WHERE bno=?", sqlItem); // 글 데이터 수정
        await DBPool.query("DELETE FROM boardFiles WHERE bno=?", bno); // 기존 파일 데이터 제거

        for (var i = 0; i < req.files.length; i++) {
            sqlItem = [bno, req.files[i].originalname];
            await DBPool.query("INSERT INTO boardFiles VALUES(?, ?)", sqlItem); // 파일 데이터 저장
        }

        res.redirect('/msg?str=Board Update!&url=/boardContent?opt=all-|-bno=' + bno);
    }
});
router.post('/updateMovie', MovieUpload.array('movie'), async (req, res) => {
    let title = req.body.title;
    let content = req.body.content;
    let bno = req.body.bno;

    if (title == '' || content == '') res.redirect('/msg?str=Title or Content Input!&url=/boardInsert?opt=movie');
    else if (req.files.length != 2) res.redirect('/msg?str=Thumbnail or Movie Input!&url=/boardInsert?opt=movie');
    else
    {
        sqlItem = [req.files[0].originalname, title, content, req.body.BandM, bno];
        await DBPool.query("UPDATE board SET thumbnail=?, title=?, content=?, opt=? WHERE bno=?", sqlItem); // 글 데이터 수정
        await DBPool.query("DELETE FROM boardFiles WHERE bno=?", bno); // 기존 파일 데이터 제거
        
        sqlItem = [bno, req.files[1].originalname];
        await DBPool.query("INSERT INTO boardFiles VALUES(?, ?)", sqlItem); // 영상 데이터 저장

        res.redirect('/msg?str=Board Update!&url=/boardContent?opt=all-|-bno=' + bno);
    }
});

router.post('/iuComment', async (req, res) => { // 댓글 작성 및 수정 요청
    let bno = req.body.bno;
    let id = req.session.user.id;
    let img = req.session.user.img;
    let content = req.body.content;
    let time = new Date(Date.now());
    let sqlItem = [bno, id, img, content, time];

    if (content == '') res.redirect('/msg?str=Content Input!&url=/boardContent?opt=all-|-bno=' + bno);
    else
    {
        let opt = req.body.opt;
        if (opt == 'i') // 댓글 작성 요청일 경우
        {
            await DBPool.query("INSERT INTO boardComment(bno, id, img, content, time) VALUES(?, ?, ?, ?, ?)", sqlItem); // 댓글 작성
            res.redirect('/msg?str=Comment Insert!&url=/boardContent?opt=all-|-bno=' + bno);
        }
        else if (opt == 'u') // 댓글 수정 요청일 경우
        {
            let cno = req.body.cno;
            sqlItem = [content, bno, cno];
            await DBPool.query("UPDATE boardComment SET content=? WHERE bno=? AND cno=?", sqlItem); // 댓글 업데이트
            res.redirect('/msg?str=Comment Update!&url=/boardContent?opt=all-|-bno=' + bno);
        }
    }
});

module.exports = router;