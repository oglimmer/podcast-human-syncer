import Redis from '../../../server/Redis'
import capitalize from 'capitalize'

import getUpdateObject from '../../../server/getUpdateObject'
import { FIELDS_ALL, CONNECTED } from '../../../server/constants'

export async function get (req, res) {
  const { roomname } = req.params
  const { username } = req.query

  if (username) {
    await Redis.SADD(`${roomname}:${CONNECTED}`, capitalize(username))
  }
  const returnData = await getUpdateObject(roomname, FIELDS_ALL)

  res.set({
    'Content-Type': 'application/json'
  })
  res.end(JSON.stringify(returnData))
}
