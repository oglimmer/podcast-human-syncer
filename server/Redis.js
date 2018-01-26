
const { promisify } = require('util')
const redis = require('redis')

var SMEMBERS = null
var SISMEMBER = null
var SADD = null
var SREM = null
var GET = null
var MGET = null
var SET = null
var MSET = null

if (process.env.NODE_ENV !== 'test') {
  const client = redis.createClient()
  SMEMBERS = promisify(client.SMEMBERS).bind(client)
  SISMEMBER = promisify(client.SISMEMBER).bind(client)
  SADD = promisify(client.SADD).bind(client)
  SREM = promisify(client.SREM).bind(client)
  GET = promisify(client.GET).bind(client)
  MGET = promisify(client.MGET).bind(client)
  SET = promisify(client.SET).bind(client)
  MSET = promisify(client.MSET).bind(client)

  global.DBREF = {
    SADD,
    SMEMBERS,
    MGET
  }
}

module.exports = {
  SMEMBERS,
  SISMEMBER,
  SADD,
  SREM,
  GET,
  MGET,
  SET,
  MSET
}
