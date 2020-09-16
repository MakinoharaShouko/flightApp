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
      const transaction = new sql.Transaction()
      transaction.begin(4, err => {
        if (err)
          next(err)
        else {
          db.request()
            .input('username', req.body.username)
            .query('SELECT * FROM USERS WHERE username = @username',
            (err, result) => {
              if (err)
                next(err)
              else if (result.recordset.length > 0) {
                transaction.rollback(err => {
                  if (err)
                    next(err)
                  else {
                    err = new Error(`Fail to create user ${req.body.username}`)
                    err.status = 403
                    next(err)
                  }
                })
              } else {
                var hash = getHash(req.body.password)
                db.request()
                  .input('username', req.body.username)
                  .input('hash', hash)
                  .input('initial_amount', req.body.initial_amount)
                  .query('INSERT INTO USERS VALUES (@username, @hash, @initial_amount)',
                    (err, result) => {
                      if (err)
                        next(err)
                      else {
                        transaction.commit(err => {
                          if (err)
                            next(err)
                          else {
                            res.status(200)
                            res.setHeader('Content-Type', 'text/html')
                            res.send('Created user ' + req.body.username)
                          }
                        })
                      }
                    })
              }
            })
        }
      })
    })
  }
})

router.get('/login', (req, res, next) => {
  sql.connect(config)
  .then(db => {
    return db.request()
      .query`SELECT * FROM USERS WHERE username = ${req.body.username}`
  })
  .then(result => {
    if (result.recordset.length == 0) {
      err = new Error('Invalid username or password')
      err.status = 403
      next(err)
    } else {
      var hash = getHash(req.body.password)
      //console.log(hash)
      //console.log(result.recordsets[0][0].hash)
      if (hash == result.recordset[0].hash) {
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
