import Redis from '../../../server/Redis'
import capitalize from 'capitalize'

export async function get (req, res) {
  const { roomname } = req.params
  const { username } = req.query

  if (username) {
    await Redis.SADD(`${roomname}:connected`, capitalize(username))
  }
  const [current, next, urgent, wantToFinish, lastTakerOverInSecs] = await Redis.MGET(
    `${roomname}:current`,
    `${roomname}:next`,
    `${roomname}:urgent`,
    `${roomname}:wantToFinish`,
    `${roomname}:lastTakerOver`)
  const connected = await Redis.SMEMBERS(`${roomname}:connected`)
  const totalTime = await Redis.HGETALL(`${roomname}:totalTime`)
  const lastTakerOver = Math.floor((Date.now() - new Date(lastTakerOverInSecs).getTime()) / 1000)

  res.set({
    'Content-Type': 'application/json'
  })
  res.end(JSON.stringify({
    connected,
    current,
    wantToFinish,
    next,
    urgent,
    lastTakerOver,
    totalTime
  }))
}
