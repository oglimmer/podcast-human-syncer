import Redis from '../../../server/Redis'
import capitalize from 'capitalize'

export async function get (req, res) {
  const { roomname } = req.params
  const { username } = req.query

  if (username) {
    await Redis.SADD(`${roomname}:connectedUsers`, capitalize(username))
  }
  const [current, next, urgent, wantToFinish] = await Redis.MGET(
    `${roomname}:current`, `${roomname}:next`, `${roomname}:urgent`, `${roomname}:wantToFinish`)
  const connected = await Redis.SMEMBERS(`${roomname}:connectedUsers`)

  res.set({
    'Content-Type': 'application/json'
  })
  res.end(JSON.stringify({
    connected,
    current,
    wantToFinish,
    next,
    urgent
  }))
}
