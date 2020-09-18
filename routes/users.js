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

userSignUp = (db, transaction, user, callback) => {
  transaction.begin(4, err => {
    if (err)
      userSignUp(db, transaction, user, callback)
    else {
      db.request()
        .input('username', user.username)
        .query('SELECT * FROM USERS WHERE username = @username',
        (err, result) => {
          if (err) {
            transaction.rollback()
            .then(result => callback(err, null))
            .catch(err => callback(err, null))
          } else if (result.recordset.length > 0) {
            transaction.rollback(err => {
              if (err)
                callback(err, null)
              else {
                err = new Error(`Fail to create user ${user.username}`)
                err.status = 403
                callback(err, null)
              }
            })
          } else {
            var hash = getHash(user.password)
            db.request()
              .input('username', user.username)
              .input('hash', hash)
              .input('initial_amount', user.initial_amount)
              .query('INSERT INTO USERS VALUES (@username, @hash, @initial_amount)',
                (err, result) => {
                  if (err) {
                    transaction.rollback()
                    .then(result => callback(err, null))
                    .catch(err => callback(err, null))
                  } else {
                    transaction.commit(err => {
                      if (err)
                        userSignUp(db, transaction, user, callback)
                      else
                        callback(null, result)
                    })
                  }
                })
          }
        })
    }
  })
}

router.post('/signup', (req, res, next) => {
  if (!req.body.hasOwnProperty('username') ||
    !req.body.hasOwnProperty('password') ||
    !req.body.hasOwnProperty('initial_amount')) {
      err = new Error('Fail to create user: incomplete information')
      err.status = 403
      next(err)
  } else if (req.body.initial_amount < 0) {
    err = new Error('Fail to create user: negative money')
    err.status = 403
    next(err)
  } else {
    sql.connect(config)
    .then(db => {
      const transaction = new sql.Transaction()
      userSignUp(db, transaction, req.body, (err, result) => {
        if (err)
          next(err)
        else if (result) {
          res.status(200)
          res.setHeader('Content-Type', 'text/html')
          res.send('Created user ' + req.body.username)
        }
      })
    })
  }
})

router.get('/login', (req, res, next) => {
  if (!req.body.hasOwnProperty('username') ||
    !req.body.hasOwnProperty('password')) {
      err = new Error('Login failed: incomplete information')
      err.status = 403
      next(err)
  } else {
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
          var jwt = getToken(result.recordset[0])
          res.end('Welcome ' + req.body.username + ', your token is ' + jwt)
        } else {
          err = new Error('Invalid username or password')
          err.status = 403
          next(err)
        }
      }
    })
    .catch(err => next(err))
  }
})

module.exports = router;
