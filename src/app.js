const express = require('express');
const helmet = require('helmet');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');
const cors = require('cors');
const passport = require('passport');
const httpStatus = require('http-status');
const path = require('path');
const config = require('./config/config');
const morgan = require('./config/morgan');
const { jwtStrategy } = require('./config/passport');
const { authLimiter } = require('./middlewares/rateLimiter');
const routes = require('./routes/v1');
const { errorConverter, errorHandler } = require('./middlewares/error');
const ApiError = require('./utils/ApiError');
const dynamicRoutes = require('./middlewares/dynamicRoutes')
const fileUpload = require('express-fileupload');

const app = express();

// Enable CORS
app.use((req, res, next) => {
  res.append('Access-Control-Allow-Origin', ['*']);
  res.append('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.append('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.enable('strict routing');

if (config.env !== 'test') {
  app.use(morgan.successHandler);
  app.use(morgan.errorHandler);
}

// set security HTTP headers
// TODO: stabilire una content security policy
app.use(helmet({ contentSecurityPolicy: (process.env.NODE_ENV === 'production') ? undefined : false }));

// parse json request body
app.use(express.json());

// parse urlencoded request body
app.use(express.urlencoded({ extended: true }));

// sanitize request data
app.use(xss());
app.use(mongoSanitize());

// gzip compression
app.use(compression());


app.options('*', cors());

// jwt authentication
app.use(passport.initialize());
passport.use('jwt', jwtStrategy);

app.use(fileUpload());

// limit repeated failed requests to auth endpoints
if (config.env === 'production') {
  app.use('/v1/auth', authLimiter);
}

// v1 api routes
app.use('/v1', routes);

if (config.modules.user) {
  const userPath = path.join(__dirname, config.user_path);

  app.use(dynamicRoutes('/', userPath))
  
  app.use('/', express.static(userPath));
  
  app.get('/', function (req, res) {
    res.sendFile('index.html', { root: userPath });
  });
}

if (config.modules.back_office) {
  const backOfficePath = path.join(__dirname, config.back_office_path);

  app.use(dynamicRoutes('/back/', backOfficePath, 'dynamicRoutes.js', false))
  
  app.use('/back/', express.static(backOfficePath));
  
  app.get('/back/', function (req, res) {
    res.sendFile('index.html', { root: backOfficePath });
  });
}

if (config.modules.manager) {
  const managerPath = path.join(__dirname, config.manager_path);

  app.use(dynamicRoutes('/manager/', managerPath, 'dynamicRoutes.js', false))
  
  app.use('/manager/', express.static(managerPath));
  
  app.get('/manager/', function (req, res) {
    res.sendFile('index.html', { root: managerPath });
  });
}

// send back a 404 error for any unknown api request
app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'Not found'));
});

// convert error to ApiError, if needed
app.use(errorConverter);

// handle error
app.use(errorHandler);

module.exports = app;