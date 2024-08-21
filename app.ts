var createError = require('http-errors');
import express from 'express';
var path = require('path');
var cookieParser = require('cookie-parser');
import session from 'express-session';
import http from 'http';
var logger = require('morgan');
const cors = require('cors');
var db = require("./db/connect");
import { Request, Response, NextFunction } from 'express';
import initializeSocketIO from './config/sockets/socket';

require('dotenv').config();
var carRouter = require('./routes/car');
var authensRouter = require('./routes/authentication');
var usersRouter = require('./routes/user');
var reviewsRouter = require('./routes/review');
var bookingRouter = require('./routes/booking');
var adminRouter = require('./routes/admin');



db.Connect();
var app = express();
const server = http.createServer(app);

app.use(session({
  secret: 'Car-Rental',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));
const io = initializeSocketIO(server);
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/cars', carRouter);
app.use('/api/authens', authensRouter);
app.use('/api/users', usersRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/bookings', bookingRouter);
app.use('/api/admin', adminRouter);

// catch 404 and forward to error handler
app.use(function(req: Request, res: Response, next: NextFunction) {
  next(createError(404));
});

// error handler
app.use(function(err: any, req: Request, res: Response, next: NextFunction) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
