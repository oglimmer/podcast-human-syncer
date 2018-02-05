
const moduleExports = {
  RECIPIENT_CURRENT: 1,
  RECIPIENT_OTHERS: 2,
  RECIPIENT_ALL: 3,
  CURRENT: 'current',
  NEXT: 'next',
  URGENT: 'urgent',
  WANT_OF_FINISH: 'wantToFinish',
  LAST_TAKE_OVER: 'lastTakerOver',
  CONNECTED: 'connected',
  TOTAL_TIME: 'totalTime',
  CHAT_MESSAGES: 'chatMessages'
}

moduleExports.FIELDS_SIMPLE = [
  moduleExports.CURRENT,
  moduleExports.NEXT,
  moduleExports.URGENT,
  moduleExports.WANT_OF_FINISH,
  moduleExports.LAST_TAKE_OVER
]

moduleExports.FIELDS_ALL = [
  moduleExports.CONNECTED,
  moduleExports.TOTAL_TIME,
  moduleExports.CHAT_MESSAGES,
  ...moduleExports.FIELDS_SIMPLE
]

module.exports = moduleExports
