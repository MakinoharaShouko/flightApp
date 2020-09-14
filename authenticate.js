const jwt = require('jsonwebtoken')
var crypto = require('crypto')
const secret = '1145141919810'

exports.getToken = function(user) {
    return jwt.sign(user, secret, {expiresIn: 3600})
}

exports.getHash = function(password) {
    return crypto.createHmac('sha256', secret).update(password).digest('hex')
}