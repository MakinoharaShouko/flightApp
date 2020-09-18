var express = require('express');
var router = express.Router();
var sql = require('mssql');
var verifyUser = require('../authenticate').verifyUser

var config = require('../config');

sameDayReservation = (db, username, date, callback) => {
    db.request()
        .input('username', username)
        .input('date', date)
        .query('SELECT * FROM RESERVATIONS WHERE username = @username AND day_of_month = @date AND canceled = 0',
            (err, result) => callback(err, result))
}

getFlightInfo = (db, flight, callback) => {
    db.request()
        .input('flight', flight)
        .query('SELECT * FROM FLIGHTS WHERE fid = @flight',
            (err, result) => callback(err, result))
}

takeSeat = (db, flight, seat, callback) => {
    db.request()
        .input('flight', flight)
        .input('seat', seat)
        .query('UPDATE FLIGHTS SET seat_taken = @seat WHERE fid = @flight',
            (err, result) => callback(err, result))
}

makeReservation = (db, transaction, flights, username, callback) => {
    transaction.begin(4, err => {
        if (err)  // try to restart transaction
            makeReservation(db, transaction, flights, username, callback)
        else {
            var f1 = null
            var f2 = null
            var date = null
            if (flights.hasOwnProperty('flight2')) {  // two flights
                f1 = flights.flight1
                f2 = flights.flight2
            } else  // one flight
                f1 = flights.flight1
            getFlightInfo(db, f1, (err, result) => {
                if (err) {
                    transaction.rollback()
                    .then(result => callback(err, null))
                    .catch(err => callback(err, null)) 
                } else {
                    if (result.recordset.length == 0) {
                        transaction.rollback(err => {
                            if (err)
                                callback(err, null)
                            else {
                                err = new Error('Invalid flight ID ' + f1)
                                err.status = 404
                                callback(err, null)
                            }
                        })
                    } else {
                        date = result.recordset[0].day_of_month
                        if (result.recordset[0].capacity > result.recordset[0].seat_taken) {
                            var seat1 = result.recordset[0].seat_taken
                            var inter = result.recordset[0].dest_city
                            sameDayReservation(db, username, date, (err, result) => {
                                if (err) {
                                    transaction.rollback()
                                    .then(result => callback(err, null))
                                    .catch(err => callback(err, null))
                                } else if (result.recordset.length > 0) {
                                    transaction.rollback(err => {
                                        if (err)
                                            callback(err, null)
                                        else {
                                            err = new Error('You cannot book two flights in the same day')
                                            err.status = 403
                                            callback(err, null)
                                        }
                                    })
                                } else {
                                    if (f2) {  // two flights
                                        getFlightInfo(db, f2, (err, result) => {
                                            if (err) {
                                                transaction.rollback()
                                                .then(result => callback(err, null))
                                                .catch(err => this.callback(err, null))
                                            } else {
                                                if (result.recordset.length == 0) {
                                                    transaction.rollback(err => {
                                                        if (err)
                                                            callback(err, null)
                                                        else {
                                                            err = new Error('Invalid flight ID ' + f2)
                                                            err.status = 404
                                                            callback(err, null)
                                                        }
                                                    })
                                                } else {
                                                    // We do not allow transfering flights on different days
                                                    if (result.recordset[0].day_of_month != date) {
                                                        transaction.rollback(err => {
                                                            if (err)
                                                                callback(err, null)
                                                            else {
                                                                err = new Error('Transfer flights need to be on the same day!')
                                                                err.status = 403
                                                                callback(err, null)
                                                            }
                                                        })
                                                    // Not a valid indirect flight
                                                    } else if (result.recordset[0].origin_city != inter) {
                                                        transaction.rollback(err => {
                                                            if (err)
                                                                callback(err, null)
                                                            else {
                                                                err = new Error('Two flights cannot make a valid indirect flight!')
                                                                err.status = 403
                                                                callback(err, null)
                                                            }
                                                        })
                                                    } else {
                                                        if (result.recordset[0].capacity > result.recordset[0].seat_taken) {
                                                            var seat2 = result.recordset[0].seat_taken
                                                            takeSeat(db, f1, seat1, (err, result) => {
                                                                if (err) {
                                                                    transaction.rollback()
                                                                    .then(result => callback(err, null))
                                                                    .catch(err => callback(err, null))
                                                                } else {
                                                                    takeSeat(db, f2, seat2, (err, result) => {
                                                                        if (err) {
                                                                            transaction.rollback()
                                                                            .then(result => callback(err, null))
                                                                            .catch(err => callback(err, null))
                                                                        } else {
                                                                            db.request()
                                                                                .query('SELECT * FROM RESERVATIONS',
                                                                                    (err, result) => {
                                                                                        if (err) {
                                                                                            transaction.rollback()
                                                                                            .then(result => callback(err, null))
                                                                                            .catch(err => callback(err, null))
                                                                                        } else {
                                                                                            var rid = result.recordset.length + 1
                                                                                            db.request()
                                                                                                .input('rid', rid)
                                                                                                .input('user', username)
                                                                                                .input('f1', f1)
                                                                                                .input('f2', f2)
                                                                                                .input('date', date)
                                                                                                .query('INSERT INTO RESERVATIONS VALUES (@rid, @user, @f1, @f2, @date, 0, 0)',
                                                                                                    (err, result) => {
                                                                                                        if (err) {
                                                                                                            transaction.rollback()
                                                                                                            .then(result => callback(err, null))
                                                                                                            .catch(err => callback(err, null))
                                                                                                        } else {
                                                                                                            transaction.commit(err => {
                                                                                                                if (err)
                                                                                                                    makeReservation(db, transaction, flights, username, callback)
                                                                                                                else
                                                                                                                    callback(null, rid)
                                                                                                            })
                                                                                                        }
                                                                                                    })
                                                                                        }
                                                                                })
                                                                        }
                                                                    })
                                                                }
                                                            })
                                                        } else {
                                                            err = new Error('Booking failed')
                                                            err.status = 403
                                                            callback(err, null)
                                                        }
                                                    }
                                                }
                                            }
                                        })
                                    } else {
                                        takeSeat(db, f1, seat1, (err, result) => {
                                            if (err) {
                                                transaction.rollback()
                                                .then(result => callback(err, null))
                                                .catch(err => this.callback(err, null))
                                            } else {
                                                    db.request()
                                                        .query('SELECT * FROM RESERVATIONS',
                                                            (err, result) => {
                                                                if (err) {
                                                                    transaction.rollback()
                                                                    .then(result => callback(err, null))
                                                                    .catch(err => this.callback(err, null))
                                                                } else {
                                                                    var rid = result.recordset.length + 1
                                                                    db.request()
                                                                        .input('rid', rid)
                                                                        .input('user', username)
                                                                        .input('f1', f1)
                                                                        .input('f2', -1)  // just one flight
                                                                        .input('date', date)
                                                                        .query('INSERT INTO RESERVATIONS VALUES (@rid, @user, @f1, @f2, @date, 0, 0)',
                                                                            (err, result) => {
                                                                                if (err) {
                                                                                    transaction.rollback()
                                                                                    .then(result => callback(err, null))
                                                                                    .catch(err => this.callback(err, null))
                                                                                } else {
                                                                                    transaction.commit(err => {
                                                                                        if (err)
                                                                                            makeReservation(db, transaction, flights, username, callback)
                                                                                        else {
                                                                                            callback(null, rid)
                                                                                        }
                                                                                    })
                                                                                }
                                                                            })
                                                                }
                                                            })
                                            }
                                        })
                                    }
                                } 
                            })
                        } else {  // No more seats available
                            transaction.rollback(err => {
                                if (err)
                                    callback(err, null)
                                else {
                                    err = new Error('Booking failed')
                                    err.status = 403
                                    callback(err, null)
                                }
                            })
                        }
                    }
                }
            })
        }
    })
}

router.route('/')
.post(verifyUser, (req, res, next) => {
    if (!req.body.hasOwnProperty('flight1')) {
        err = new Error(`No flight information provided`)
        err.status = 403
        next(err)
    }
    sql.connect(config)
    .then(db => {
        const transaction = new sql.Transaction()
        makeReservation(db, transaction, req.body, req.user.username,
            (err, rid) => {
                if (err)
                    next(err)
                else {
                    res.status(200)
                    res.setHeader('Content-Type', 'text/html')
                    res.send('Booked flight(s), reservation ID ' + rid)
                }
            })
    })
    .catch(err => next(err))
})

module.exports = router