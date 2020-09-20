# flightApp
Based on UW CSE414 HW5 (flightApp), implemented with NodeJS &amp; REST API

## SQL Schema

### FLIGHTS
```
{
  "fid": int,
  "month_id": int,
  "day_of_month": int,
  "day_of_week_id": int,
  "carrier_id": varchar(7),
  "flight_num": int,
  "origin_city": varchar(34),
  "origin_state": varchar(47),
  "dest_city": varchar(34),
  "dest_state": varchar(46),
  "departure_delay": int,
  "taxi_out": int,
  "arrival_delay": int,
  "canceled": int,
  "actual_time": int,
  "distance": int,
  "capacity": int,
  "price": int,
  "seat_taken": int
}
```

### RESERVATIONS
```
{
  "rid": int,
  "username": varchar(20),
  "fid_1": int,
  "fid_2": int,
  "day_of_month": int,
  "canceled": int,
  "paid": int
}
```

### USERS
```
{
  "username": varchar(32),
  "hash": varchar(64),
  "balance": int
}
```

## User Signup & Login
The username, password (and initial amount if for signup) should be provided in `req.body` in `json` format. The user schema is modified. There is no more `salt` field and `hash` is now **VARCHAR(64)** 

### Sign Up 
Send `post` request to `/users/signup`

### Log In
Send `get` request to `users/login` 
After logging in, the system returns a json web token to be used for booking/canceling/fetching itineraries operations. The toekn should be included in the `header`'s `Authorization` field as `bearer`

## Flight Look Up
Send `get` request to `/flights`  
Use the following json format  
```
{
  "itineraries": Number,
  "direct": Boolean,
  "date": Number,
  "origin": String,
  "dest": String
}
```

## Reservation

### Book
Since this is a server application, it would be impossible to keep track of itineraries from the last search,
considering that many users may do the search concurrently. Thus, to book a reservation, send `post` request
to `/reservations` in the following json format
```
{
  "flight1": Number,
  "flight2": Number
}
```

### Pay
Send `put` request to `/reservations/:rid/pay`

### Cancel
Send `put` request to `reservations/:rid/cancel`
