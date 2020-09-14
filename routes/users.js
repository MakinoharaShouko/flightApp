var express = require('express');
var router = express.Router();
var sql = require('mssql');

var config = require('../config');

var getToken = require('../authenticate').getToken
var getHash = require('../authenticate').getHash

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.post('/signup', (req, res, next) => {
  if (req.body.initial_amount < 0) {
    err = new Error('Fail to create user: negative money')
    err.status = 403
    next(err)
  } else {
    sql.connect(config)
    .then(db => {
      var hash = getHash(req.body.password)
      return db.request()
        .query`INSERT INTO USERS VALUES (${req.body.username}, ${hash}, ${req.body.initial_amount}`
    })
    .then(result => {
      res.status(200)
      res.setHeader('Content-Type', 'text/html')
      res.send('Created user ' + req.body.username)
    })
    .catch(err => next(err))
  }
})

router.get('/login', (req, res, next) => {
  sql.connect(config)
  .then(db => {
    return db.request()
      .query`SELECT * FROM USERS WHERE username = ${req.body.username}`
  })
  .then(result => {
    if (result.length == 0) {
      err = new Error('Invalid username or password')
      err.status = 403
      next(err)
    } else {
      var hash = getHash(req.body.password)
      //console.log(hash)
      //console.log(result.recordsets[0][0].hash)
      if (hash == result.recordsets[0][0].hash) {
        res.status(200)
        res.setHeader('Content-Type', 'text/html')
        var jwt = getToken(result)
        res.end('Welcome ' + req.body.username + ', your token is ' + jwt)
      } else {
        err = new Error('Invalid username or password')
        err.status = 403
        next(err)
      }
    }
  })
  .catch(err => next(err))
})

module.exports = router;
