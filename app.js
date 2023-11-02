const { Telegraf } = require('telegraf')

const bot = new Telegraf(env.token)
const activeUsers = {}
const participants = {}
const data = {
  messages: [],
  markedUsers: {},
}
const keywords = ['keyWord1', 'keyWord2']

function markActiveUsers(chatId) {
  const chat = bot.telegram.chat(chatId)
  chat.getAdministrators().then((admins) => {
    for (const admin of admins) {
      const userId = admin.user.id
      if (activeUsers[userId]) {
        continue
      }

      activeUsers[userId] = true
      bot.telegram.sendMessage(
        chatId,
        `User ${admin.user.first_name} is active.`
      )
    }
  })
}

setInterval(() => {
  const chatId = env.chatid
  markActiveUsers(chatId)
}, 300000) // 5 min

function markUsersByKeywords(messageText) {
  const markedUsers = []
  keywords.forEach((keyword) => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi')
    const matches = messageText.match(regex)
    if (matches) {
      markedUsers.push(...matches)
    }
  })
  return markedUsers
}

function markUsersByDate() {
  const currentDate = new Date()
  data.messages.forEach((message) => {
    const messageDate = new Date(message.date * 1000)
    if (isSameDay(currentDate, messageDate)) {
      const userId = message.from.id
      if (!data.markedUsers[userId]) {
        data.markedUsers[userId] = true
        console.log(`User ${userId} date stamped.`)
      }
    }
  })
}
function isSameDay(date1, date2) {
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  )
}

bot.start((ctx) => {
  ctx.reply(
    `Hi, I'm a bot for tagging chat participants. Send me the chat URL to get started.`
  )
})

bot.on('text', (ctx) => {
  const chatId = extractChatId(ctx.message.text)
  const userId = ctx.message.from.id
  const userName = ctx.message.from.username

  if (!participants[userId]) {
    participants[userId] = {
      name: userName,
      chatId: chatId,
      isActive: false,
      keywords: [],
      date: new Date(),
    }
  }

  const chatName = extractChatName(ctx.message.text)

  if (ctx.message.text.includes('/activity')) {
    bot.command('active', (ctx) => {
      const activeUserIds = Object.keys(participants).filter(
        (userId) => participants[userId].isActive
      )
      if (activeUserIds.length > 0) {
        const activeUserNames = activeUserIds.map(
          (userId) => participants[userId].name
        )
        ctx.reply(
          `Active participants in the chat room: ${activeUserNames.join(', ')}`
        )
      } else {
        ctx.reply('There are no active participants in the chat room.')
      }
    })
    ctx.reply('Recognize participants by activity.')
  } else if (ctx.message.text.includes('/keywords')) {
    bot.command('text', (ctx) => {
      const messageText = ctx.message.text
      const markedUsers = markUsersByKeywords(messageText)
      if (markedUsers.length > 0) {
        const markedUsersText = markedUsers.join(', ')
        ctx.reply(`Marked chat participants: ${markedUsersText}`)
      }
    })
    ctx.reply('Tagging participants by keywords')
  } else if (ctx.message.text.includes('/date')) {
    bot.command('date', (ctx) => {
      const message = ctx.message
      data.messages.push(message)
      markUsersByDate()
    })
    ctx.reply('Mark participants by date')
  } else if (ctx.message.text.includes('/all')) {
    Object.values(participants).forEach((participant) => {
      participant.isActive = true
    })
    ctx.reply('Celebrating all chat participants')
  } else {
    ctx.reply('Unknown command. Try again.')
  }
})

function extractChatId(url) {
  const regex = /https:\/\/t\.me\/([^\/]+)\/?/
  const match = url.match(regex)
  if (match && match[1]) {
    return match[1]
  } else {
    return null
  }
}
function extractChatName(message) {
  const regex = /\/start (.+)/
  const match = message.match(regex)
  if (match && match[1]) {
    return match[1]
  } else {
    return null
  }
}
bot.launch()
