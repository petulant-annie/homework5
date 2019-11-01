require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const passport = require('passport');
const redis = require('redis');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const RateLimit = require('express-rate-limit');
const RedisStoreLimit = require('rate-limit-redis');

const router = require('./routes/main');
const sequelize = require('./dbConnection');
const errorLogger = require('./loggers/errorLogger').logger;
const infoLogger = require('./loggers/infoLogger').logger;

const app = express();

const PORT = process.env.PORT || 3000;

const redisClient = redis.createClient();

app.use(bodyParser.json());
app.use(cookieParser());
app.use(cors());

app.set('trust proxy', 1);

redisClient.on('error', (err) => {
  console.log('Redis error: ', err);
});

const limiter = new RateLimit({
  store: new RedisStoreLimit({
    client: redisClient,
  }),
  max: 100,
  delayMs: 0,
  prefix: 'anna:',
});

app.use(session({
  store: new RedisStore({
    client: redisClient,
    url: process.env.REDIS_URL,
  }),
  name: '_redisStore',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 600000 },
}));

app.use(limiter);
app.use(passport.initialize());
app.use(passport.session());
require('./config/passport')(passport);

app.use('/', router);
app.use((err, req, res) => {
  errorLogger.error(err, err.message);
  res.status(500).send(err);
});

sequelize
  .authenticate()
  .then(() => {
    infoLogger.info('Connection has been established successfully.');
    mongoose.connect(`${process.env.MONGO_DB}`,
      { useNewUrlParser: true, useUnifiedTopology: true }, (err) => {
        if (err) { return errorLogger.error(err, err.message) }
        app.listen(PORT, () => infoLogger.info(`Server started on port ${PORT}`));
      });
  })
  .catch(err => {
    errorLogger.error('Unable to connect to the database:', err);
  })
  .done();