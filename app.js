import express from 'express'
import cookieParser from 'cookie-parser'
import session from 'express-session'
import passport from 'passport'
import {Server} from 'socket.io'
import bcrypt from 'bcryptjs'
import MongoStore from 'connect-mongo'
import {productRouter} from './routes/productRouter.js'
import {chatRouter} from './routes/chat-router.js'
import { infoRouter } from './routes/info-router.js'
import ProductManager from './controllers/manager.js'
import ChatManager from './controllers/chatManager.js'
import loader from './daos/dataBaseLoader.js'
import * as dotenv from 'dotenv' 
import userModel from './models/User.js'
import './strategies/local.js'
import { randomRouter } from './routes/randoms-router.js'
import compression from 'compression'
import log4js from 'log4js'
dotenv.config()

const uri = process.env.USER_URI
loader.start()

const productManager = new ProductManager()
const chatManager = new ChatManager()
const app = express()
const PORT = parseInt(process.argv.slice(2)) || 8080
const server = app.listen(PORT, () => console.log(`Server up on port ${PORT}`))
const io = new Server(server)

app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(compression({
  level: 6
}))
app.use('/content', express.static('./public'))
app.set('views', './views')
app.set('view engine', 'ejs')
app.use(cookieParser())
app.use(session({
  store: MongoStore.create({
    mongoUrl: uri,
    collectionName: 'sessions',
    ttl: 120
  }),
  key: process.env.USER_KEY,
  secret: 'c0d3r',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 600000 }
}))
app.use(passport.initialize());
app.use(passport.session());

log4js.configure({
  appenders: {
    console: { type: 'console' },
    warn: { type: 'file', filename: 'warn.log' },
    error: { type: 'file', filename: 'error.log' },
  },
  categories: {
    default: { appenders: ['console'], level: 'all' },
    warn: { appenders: ['console', 'warn'], level: 'warn' },
    error: { appenders: ['console', 'error'], level: 'error' },
  },
});

const logger = log4js.getLogger();
const warnLogger = log4js.getLogger('warn');
const errorLogger = log4js.getLogger('error');
export default errorLogger

export function loggerInfo (req, res, next) {
  const fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
  logger.info(`${req.method} ${fullUrl}`)
  next()
}

const logChecker = (req, res, next) => {
  if (req.isAuthenticated()) return next()
  res.redirect('/login')
}

const outlineChecker = (req, res, next) => {
  if (!req.isAuthenticated()) return next()
  res.redirect('/')
}

app.get('/', logChecker, loggerInfo, (req, res) => {
  res.render('index', {user: req.user.username})
})

app.get('/signup', loggerInfo, (req, res) => {
  res.render('signup')
})

app.get('/dashboard', logChecker, loggerInfo, (req, res) => {
    logger.info(`${req.method} ${req.url}`)
    res.render('index', {user: req.user.username})
})

app.get('/registerError', loggerInfo, (req, res) => {
  res.render('register_error')
})

app.get('/loginError', loggerInfo, (req, res) => {
  res.render('login_error')
})

app.post('/signup', loggerInfo, async (req, res) => {
  const {username, email, password} = req.body
  try {
    let user = await userModel.findOne({username})
    if(user) res.redirect('/registerError')
    const cryptPass = await bcrypt.hash(password, 12)
    user = await userModel.create({
      username,
      email,
      password: cryptPass
    })
    res.redirect('/')
  } catch (err) {
    console.log(err);
  }
})

app.get('/login', outlineChecker, loggerInfo, (req, res) => {  
  res.render('index_login');
})

app.post('/login', loggerInfo, passport.authenticate('local', {
  successRedirect: '/dashboard',
  failureRedirect: '/loginError'
}))

app.get('/logout', loggerInfo, function (req, res, next) {
  const username = req.user.username
	req.logout(function(err) {
    if (err) { 
      return next(err); 
    }
    res.render('index_logout', {user: username})
  })
})

app.use('/info', infoRouter)
app.use('/api/random', randomRouter)
app.use('/products', productRouter)
app.use('/chat', chatRouter)

io.on('connection', socket => {
  console.log(`Client ${socket.id} connected...`)
  productManager.findAll().then(result => socket.emit('history', result))
                          .catch(err => console.log(err))
  chatManager.findAll().then(result => socket.emit('chatHistory', result))
                       .catch(err => console.log(err))
  socket.on('products', data => {
      io.emit('history', data)
  })
  socket.on('chat', data => {
      io.emit('chatHistory', data)
  })
})

app.use((req, res) => {
  const fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl
  warnLogger.warn(`M??todo ${req.method} y ruta ${fullUrl} no implementada`)
  res.status(404).send('<h2>P??gina no encontrada en el servidor</h2>')
});

