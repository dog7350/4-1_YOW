const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const chatLog = require('../Env/mongo');
const DBPool = require('../Env/db');

router.get('/', async (req, res) => { // 메인 화면 라우팅
  let boardList, boardfield, filesList, filesfield;
  user = req.session.user; // 유저의 세션 정보

  [boardList, boardfield] = await DBPool.query("SELECT * FROM board"); // 게시글 리스트 조회
  [filesList, filesfield] = await DBPool.query("SELECT * FROM boardFiles"); // 게시글에 관련된 파일 조회

  res.render('index', { user: user, boardList: boardList, filesList: filesList});
});

router.get('/msg', async (req, res) => { // alert 출력 후 이동
  let str = req.query.str; // alart에 출력될 URL 메시지 데이터
  let url = req.query.url; // 이동할 페이지 경로
  url = url.replace("-|-", "&"); // 만약 이동할 페이지의 URL에서 Query문이 2개 이상일 경우
                                // 특수 문자를 '&'가 아닌 '-|-'로 받은 후 변경

  res.write("<script>\
                alert('" + str + "');\
                location.href='" + url + "';\
             </script>");
});

router.get('/join', async (req, res) => { // 회원가입 화면 라우팅
  res.render('join');
});

router.get('/logout', async (req, res) => { // 로그아웃 라우팅
  req.session.destroy((err) => { // session 삭제 콜백 함수 호출
    if (err) {
      console.log(err);
      return;
    }

    req.session; // 세션 전체 삭제
    res.redirect("/");
  });
});

router.get('/myPage', async (req, res) => { // 마이페이지 라우팅
  user = req.session.user;

  res.render('mypage', { user: user });
});

router.get('/boardInsert', async (req, res) => { // 게시글 페이지 라우팅
  let opt = req.query; // 게시글 종류(board, movie)에 따라 업로드 파일 개수와 형태 조절을 위한 파라미터
  user = req.session.user;

  res.render('boardinsert', { user: user, opt: opt });
});
router.get('/boardContent', async (req, res) => { // 게시글 본문 라우팅
  let board, boardfield, file, filefield, comment, commentField;
  let bno = req.query.bno;
  let opt = req.query.opt;
  user = req.session.user;

  [board, boardfield] = await DBPool.query("SELECT * FROM board WHERE bno=?", bno); // 게시글 데이터
  [comment, commentfield] = await DBPool.query("SELECT * FROM boardComment WHERE bno=?", bno); // 게시글의 댓글 데이터
  [file, filefield] = await DBPool.query("SELECT * FROM boardFiles WHERE bno=?", bno); // 게시글의 관련 파일 데이터

  res.render('boardcontent', { user: user, board: board[0], file: file, comment: comment, opt: opt});
});
router.get('/boardUpdate', async (req, res) => { // 게시글 수정
  let board, boardfield, file, filefield;
  let opt = req.query.opt;
  let bno = req.query.bno;
  user = req.session.user;

  [board, boardfield] = await DBPool.query("SELECT * FROM board WHERE bno=?", bno); // 게시글 데이터
  [file, filefield] = await DBPool.query("SELECT * FROM boardFiles WHERE bno=?", bno); // 게시글 관련 파일 데이터

  res.render('boardupdate', { user: user, board: board[0], file: file, opt: opt });
});
router.get('/boardDelete', async (req, res) => { // 게시글 삭제
  let bno = req.query;

  await DBPool.query("DELETE FROM board WHERE bno=?", bno.bno);

  res.redirect('/msg?str=Board Delete!&url=/');
});

router.get('/searchBoard', async (req, res) => { // 게시글 검색
  let search = req.query.search;
  let searchOpt = req.query.searchOpt;
  let boardList, boardfield, filesList = [], filesfield;
  user = req.session.user;

  search = '%' + search + '%';
  if (searchOpt == 'title') // 검색 옵션
    [boardList, boardfield] = await DBPool.query("SELECT * FROM board WHERE title LIKE ?", search);
  else if (searchOpt == 'id')
    [boardList, boardfield] = await DBPool.query("SELECT * FROM board WHERE id LIKE ?", search);

  for (var i = 0; i < boardList.length; i++) { // 검색된 게시글의 관련 파일 반복 로드
    let files;
    [files, filesfield] = await DBPool.query("SELECT * FROM boardFiles WHERE bno=?", boardList[i].bno);

    if (files != undefined) // 관련 파일이 로드된 경우
    {
      for (var j = 0; j < files.length; j++)
      {
        let data = new Object(); // JSON 형태로 변환하기 위해 객체 생성
        data.bno = files[j].bno;
        data.filename = files[j].filename;

        filesList.push(data); // JSON 형태를 위해 리스트에 push
      }
    }
  }

  res.render('searchboard', { user: user, boardList: boardList, filesList: filesList});
});

router.get('/adminPage', async (req, res) => { // 관리자 페이지 라우팅
  let userList, userField;
  let opt = req.query.opt;
  user = req.session.user;

  if (opt == 'all') { // 유저 검색을 하지 않았을 경우
    [userList, userField] = await DBPool.query("SELECT * FROM userinfo");
  }
  else // 유저 검색을 한 경우
  {
    let id = req.query.searchId;
    id = "%" + id + "%";
    [userList, userField] = await DBPool.query("SELECT * FROM userinfo WHERE id LIKE ?", id);
  }

  res.render('adminpage', { user: user, userList: userList });
});
router.get('/adminUser', async (req, res) => { // 관리자 권한 임명
  let sqlItem;
  let id = req.query.id;
  var admin = req.query.admin;

  if (admin == 'x') admin = 'o';
  else if (admin == 'o') admin = 'x';

  sqlItem = [admin, id];

  await DBPool.query("UPDATE userinfo SET admin=? WHERE id=?", sqlItem);

  res.redirect('/msg?str=User Admin Update!&url=/adminPage?opt=all');
});
router.get('/adminUsing', async (req, res) => { // 계정 정지
  let sqlItem;
  let id = req.query.id;
  var usetf = req.query.usetf;

  if (usetf == 'x') usetf = 'o';
  else if (usetf == 'o') usetf = 'x';

  sqlItem = [usetf, id];

  await DBPool.query("UPDATE userinfo SET usetf=? WHERE id=?", sqlItem);

  res.redirect('/msg?str=User Using Update!&url=/adminPage?opt=all');
});
router.get('/adminDelete', async (req, res) => { // 계정 강제 탈퇴
  let id = req.query.id;

  await DBPool.query("DELETE FROM userinfo WHERE id=?", id);

  res.redirect('/msg?str=User Delete!&url=/adminPage?opt=all');
});
router.get('/adminUserInfo', async (req, res) => { // 관리자 특정 유저 정보 조회
  let boardList, boardField, filesList, filesfield;
  var log;
  let id = req.query.id;
  user = req.session.user;

  [boardList, boardField] = await DBPool.query("SELECT * FROM board WHERE id=?", id); // 유저가 작성한 게시글 조회
  for (var i = 0; i < boardList.length; i++)
    [filesList, filesfield] = await DBPool.query("SELECT * FROM boardFiles WHERE bno=?", boardList[i].bno); // 게시글 관련 파일 조회

  mongoose.connect('mongodb://yow:yow@13.125.77.214:27017/yow', { useNewUrlParser: true }); // MongoDB 접속
  chatLog.find({ id: id }, { _id:0, updatedAt:0, __v:0 }).exec() // 유저 채팅 로그 조회
                          .then((result) => {
                            log = result;
                          })
                          .then((cons) => {
                            mongoose.disconnect(); // MongoDB 연결 해제
                            res.render('adminuserinfo', { user: user, boardList: boardList, filesList: filesList, chatLog: log }); // 페이지 렌더링
                          })
                          .catch((error) => {
                            console.log(error);
                          });
});

router.get('/updateComment', async (req, res) => { // 댓글 수정 페이지
  let board, boardfield, file, filefield, comment, commentField, cmt, cmtField;
  let cno = req.query.cno;
  let bno = req.query.bno;
  let opt = req.query.opt;
  let sqlItem = [bno, cno];
  user = req.session.user;

  [board, boardfield] = await DBPool.query("SELECT * FROM board WHERE bno=?", bno); // 게시글 데이터 조회
  [comment, commentfield] = await DBPool.query("SELECT * FROM boardComment WHERE bno=?", bno); // 게시글 댓글 조회
  [cmt, cmtField] = await DBPool.query("SELECT * FROM boardComment WHERE bno=? AND cno=?", sqlItem); // 수정할 댓글 번호로 데이터 조회
  [file, filefield] = await DBPool.query("SELECT * FROM boardFiles WHERE bno=?", bno); // 게시글 관련 파일 조회

  res.render('boardcontent', { user: user, board: board[0], file: file, comment: comment, cmt: cmt[0], opt: opt});
});
router.get('/deleteComment', async (req, res) => { // 댓글 삭제
  let cno = req.query.cno;
  let bno = req.query.bno;
  let sqlItem = [bno, cno];
  user = req.session.user;

  await DBPool.query("DELETE FROM boardComment WHERE bno=? AND cno=?", sqlItem);

  res.redirect('/msg?str=Comment Delete!&url=/boardContent?opt=all-|-bno=' + bno);
});

module.exports = router;