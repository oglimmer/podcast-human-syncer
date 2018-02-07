#!/usr/bin/env node

const compression = require('compression')
const sapper = require('sapper')
const staticServe = require('serve-static')
const websockets = require('./server/websockets')
const cookieParser = require('cookie-parser')

const app = require('express')()
const server = require('http').createServer(app)

const { PORT = 3000, BIND = '127.0.0.1' } = process.env

// this allows us to do e.g. `fetch('/api/blog')` on the server
const fetch = require('node-fetch')
global.fetch = (url, opts) => {
  if (url[0] === '/') url = `http://localhost:${PORT}${url}`
  return fetch(url, opts)
}

app.use(compression({ threshold: 0 }))

app.use(cookieParser())

app.use(staticServe('assets'))

app.use(sapper())

server.listen(PORT, BIND, () => {
  console.log(`listening on ${BIND}:${PORT}`)
})

websockets(server)
