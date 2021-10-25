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

const app = express();

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

// enable cors
app.use(cors());
app.options('*', cors());

// jwt authentication
app.use(passport.initialize());
passport.use('jwt', jwtStrategy);

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

if (config.proxy.enabled) {
  var dbproxy = require('mongodb-proxy')        
  proxy_config = {
    port: config.proxy.port,
    host: config.proxy.host,
    name: config.proxy.db
  }

  if (config.proxy.username) {
    proxy_config.credentials = {
      username: config.proxy.username,
      password: config.proxy.password
    }
  }

  var db = dbproxy.create(proxy_config)

  db.configure(function (cf) {
    // register a collection "users". (check out the tutorial Register a collection for more)        
    for (const collection_name of config.proxy.collections) {
        cf.register({
          name: collection_name
      })  
    }
  })
        console.log('Adding proxy')
    // listen for all requests under an '/api' location 
    app.all('/db/:collection/**', function (req, res, next) {    
      console.log('Received')
        // prepare an info object for the routing function     
        console.log('Params collection:')
        console.log(req.params.collection)
        var route = {
            method: req.method,
            collection: req.params.collection,
            path: req._parsedUrl.pathname.substring('/db/'.length + req.params.collection.length),
            query: req.query.q,
            data: req.body,
            req: req,
            res: res
        }

        req.on('response', function(response) {
          console.log('Sending response')
          console.log(response)
        })
        
        // get the post data 
        var postdata = ""        
        req.on('data', function (postdataChunk) {
            postdata += postdataChunk
        })  
        
        req.on('end', function () {
            var jsonData = JSON.parse(postdata || '{}')
            route.data = jsonData
            console.log('Gestendo evento')
            // pass the work on the proxy 
            db.handle(route, () => {console.log('Fallito'); next()}, function (error, results) {
                if (error) {
                  console.log('Sending error')
                  console.log(error)
                    if (typeof (error) === 'object') {
                        if (error.code && error.messages) {
                            res.status(error.code).send(error.messages)
                        } else {
                            res.status(500).send(error.message)
                        }
                    } else {
                        res.status(500).send(error)
                    }
                } else {
                  console.log('Sending output')
                    res.send(results)
                }
            })
        })
    })
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
