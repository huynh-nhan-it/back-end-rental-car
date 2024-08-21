"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var createError = require('http-errors');
const express_1 = __importDefault(require("express"));
var path = require('path');
var cookieParser = require('cookie-parser');
const express_session_1 = __importDefault(require("express-session"));
var logger = require('morgan');
var db = require("./db/connect");
require('dotenv').config();
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
db.Connect();
var app = (0, express_1.default)();
app.use((0, express_session_1.default)({
    secret: 'Car-Rental',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(logger('dev'));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express_1.default.static(path.join(__dirname, 'public')));
app.use('/api', indexRouter);
app.use('/api/users', usersRouter);
// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});
// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    // render the error page
    res.status(err.status || 500);
    res.render('error');
});
module.exports = app;
