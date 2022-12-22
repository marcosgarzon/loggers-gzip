import { Router } from "express";
import {loggerInfo} from '../app.js'
import {numeroRandom} from '../apis/randoms.js'

const router = new Router 

router.get('/', loggerInfo, (req, res) => {
  const userAmount = parseInt(req.query.cant)
  let taskCompleted = numeroRandom(userAmount)
  return res.render('random', {message: taskCompleted.message, amount: taskCompleted.amount})
})

const randomRouter = router
export {randomRouter}

