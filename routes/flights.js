var express = require('express');
var router = express.Router();
var sql = require('mssql');

var config = require('../config');

router.route('/')
.get((req, res, next) => {
    sql.connect(config)
    .then(db => {
        if (req.body.direct) {
            return db.request()
                .query`SELECT TOP (${req.body.itineraries}) * FROM FLIGHTS WHERE day_of_month = ${req.body.date} AND canceled <> 1 AND origin_city = ${req.body.origin} AND dest_city = ${req.body.dest} ORDER BY actual_time ASC, fid ASC`
        } else {
            return db.request()
                .query`SELECT TOP (${req.body.itineraries}) * FROM FLIGHTS f1 JOIN FLIGHTS f2 ON f1.day_of_month = f2.day_of_month AND f1.dest_city = f2.origin_city WHERE f1.day_of_month = ${req.body.date} AND f1.canceled <> 1 AND f2.canceled <> 1 AND f1.origin_city = ${req.body.origin} AND f2.dest_city = ${req.body.dest} ORDER BY f1.actual_time + f2.actual_time ASC`
        }
    })
    .then(result => {
        res.status(200)
        res.setHeader('Conent-Type', 'application/json')
        res.json(result.recordset)
    })
    .catch(err => next(err))
})

module.exports = router