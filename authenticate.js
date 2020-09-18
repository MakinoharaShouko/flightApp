const jwt = require('jsonwebtoken')
const passport = require('passport')
const JWTStrategy = require('passport-jwt').Strategy
const ExtractJWT = require('passport-jwt').ExtractJwt
const crypto = require('crypto')
const sql = require('mssql')
const config = require('./config')
const secret = '1145141919810'

var opts = {}
opts.secretOrKey = secret
opts.jwtFromRequest = ExtractJWT.fromAuthHeaderAsBearerToken()

passport.use(new JWTStrategy(opts,
    (jwtPayload, done) => {
        sql.connect(config)
        .then(db => {
            return db.request()
                .query`SELECT * FROM USERS WHERE username = ${jwtPayload.username}`
        })
        .then(result => {
            if (result.recordset.length == 0)
                done(null, false)
            else
                done(null, result.recordset[0])
        })
        .catch(err => done(err, null))
}))

exports.getToken = function(user) {
    return jwt.sign(user, secret, {expiresIn: 3600})
}

exports.getHash = function(password) {
    return crypto.createHmac('sha256', secret).update(password).digest('hex')
}

exports.verifyUser = passport.authenticate('jwt', {session: false})