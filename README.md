# flightApp
Based on UW CSE414 HW5 (flightApp), implemented with NodeJS &amp; REST API

## User Signup & Login
The username, password (and initial amount if for signup) should be provided in `req.body` in `json` format.  
To sign up, send `post` request to `/users/signup`; to log in, send `get` request to `users/login`
The user schema is modified. There is no more `salt` field and `hash` is now **VARCHAR(64)**  
After logging in, the system returns a json web token to be used for booking/canceling/fetching itineraries operations

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
