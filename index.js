import baileys from "@adiwajshing/baileys"
import axios from "axios"
import fetch from "node-fetch"
import fs from "fs"
import util from "util"
import cp from "child_process"
import module from "module"
import os from "os"
import hr from "human-readable"
import got from "got"
import chalk from "chalk"
import moment from "moment-timezone"
import EventEmitter from "events"
import { JSDOM } from "jsdom"
import cheerio from "cheerio"
import formData from "form-data"
import fileType from "file-type"
import emojiRegex from "emoji-regex"
import { Sticker } from "wa-sticker-formatter"
import webpmux from "node-webpmux"
import Database from "./Database.js"
import gTTS from "gtts"
import P from "pino"
import qrCode from "qrcode-terminal"
import ytdl from "ytdl-core"
import yts from "yt-search"
import Message, { pino, color, audio, owner, anon, map, set, chatsFilter } from "./functions.js"
import data, { dl, savefrom, aiovideodl, idML, idFF, idCOC, JSObfuscator, topup, identifymusic } from "./data.js"
//create require module
let require = module.createRequire(import.meta.url)
let loggedOut = 401
let MONGO_URI = "mongodb+srv://SanZ:pantek@cluster0.8o5aa.mongodb.net/KONTOL?retryWrites=true&w=majority"
var ytRegex = /(?:http(?:s|):\/\/|)(?:(?:www\.|)?youtube(?:\-nocookie|)\.com\/(?:shorts\/)?(?:watch\?.*(?:|\&)v=|embed\/|v\/)?|youtu\.be\/)([-_0-9A-Za-z]{11})/

let setting = {
    owner: owner,
    prefix: "z",
    simi: false,
    simiGroup: false,
    voiceSimi: false,
    antiSpam: false,
    antiViewonce: true,
    auth: "auth.json"
}

const main = async(auth, memStr, multi, md) => {
  let store = memStr ? baileys.makeInMemoryStore({ logger: P().child({ level: "debug" }), stream: "store" }) : undefined
  let { version, isLatest } = await baileys.fetchLatestBaileysVersion()
    store.readFromFile("auth_store.json")
    if (md) {
        var fileAuth = baileys.useSingleFileAuthState(auth)
        var sock = baileys.default({
            auth: fileAuth.state,
            logger: pino,
            printQRInTerminal: true,
            version: version,
            getMessage: async key => {
              return {
                conversation: "p"
              }
            }
        })
    } else {
        var fileAuth = baileys.useSingleFileLegacyAuthState(auth)
        var sock = baileys.makeWALegacySocket({
            auth: fileAuth.state,
            logger: pino,
            printQRInTerminal: false,
            version: setting.version
        })
    }
        store?.bind(sock.ev)
        setInterval(() => {
            store?.writeToFile("auth_store.json")
        }, 10_000)
        sock.ev.on("creds.update", fileAuth.saveState)
        sock.ev.on("connection.update", update => {
            if (multi) {
              sock.ev.emit("multi.sessions", update)
            }
            if (update.connection == "close") {
              var code = update.lastDisconnect?.error?.output?.statusCode;
                console.log(update.lastDisconnect?.error)
                if (code != 401) {
                  main(setting.auth, true, false, true)
                }
                if (update.connection == "open") {
                    console.log("Connect to WA Web")
                }
            }
        })
        sock.ev.on("messages.upsert",
            async(message) => {
              try {
                if (!message.messages[0]) return;
                let timestamp = new Date()
                let msg = message.messages[0]
                if (!msg.message) return;
                let m = new Message(msg, sock, store)
                let type = Object.keys(msg.message)[0]
                let from = msg.key.remoteJid;
                let isGroup = from.endsWith("@g.us")
                let sender = isGroup ? msg.key.participant: from;
                let metadata = isGroup ? await sock.groupMetadata(from): ""
                let me = sock.type == "md" ? sock.user.id.split(":")[0] + baileys.S_WHATSAPP_NET : sock.state.legacy.user.id
                let isMeAdmin = isGroup ? metadata.participants.find(v => v.id == me).admin: ""
                let isAdmin = isGroup ? metadata.participants.find(u => u.id == sender)?.admin: ""
                isMeAdmin = isMeAdmin == "admin" || isMeAdmin == "superadmin"
                isAdmin = isAdmin == "admin" || isAdmin == "superadmin"
                let pushname = msg.pushName
                let body = msg.message?.conversation || msg.message?.imageMessage?.caption || msg.message?.videoMessage?.caption || msg.message?.extendedTextMessage?.text || msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId || msg.message?.buttonsResponseMessage?.selectedButtonId || msg.message?.templateButtonReplyMessage?.selectedId || "";
                let args = body.trim().split(/ +/).slice(1)
                let q = args.join(" ")
                let command = body.slice(0).trim().split(/ +/).shift().toLowerCase()
                let isOwner = !!setting.owner.find(o => o == sender)
                let time = moment.tz("Asia/Jakarta").format("HH:mm:ss")
                let prefix = setting.prefix
                let isCmd = command.startsWith(prefix)
                //if (command.startsWith(setting.prefix)) console.log("["+"\n"+color("Time: ", "yellow")+color(time, "magneta")+"\n"+color("From: ", "yellow")+pushname+"\n"+color("Command: ", "yellow")+command.replace(setting.prefix, "")+"\n"+color("MessageType: ", "yellow")+type+"\n]")
                
                sock.ev.on("contacts.update", async(update) => {
                  for (let { id, notify } of update) {
                    let check = await db.get({ id }, "users")
                    if (check.length == 0) return db.add({ id, time, name: notify }, "users")
                    if (check.length >= 1) return db.delete({ id }, "users")
                    db.set({ id }, { id, time, name: notify }, "users")
                  }
                })

                function reply(text) {
                    sock.sendMessage(from, {
                        text
                    }, {
                        quoted: msg
                    })
                }
                function sendListMessage(jid, title, text, footer, buttonText, sections) {
                    return sock.sendMessage(from, {
                        text,
                        footer,
                        buttonText,
                        title,
                        sections
                    })
                }
                async function sendContact(jid, numbers, name, quoted, men) {
                  let number = numbers.replace(/[^0-9]/g, '')
                  const vcard = 'BEGIN:VCARD\n' +
                  'VERSION:3.0\n' +
                  'FN:' + name + '\n' +
                  'ORG:;\n' +
                  'TEL;type=CELL;type=VOICE;waid=' + number + ':+' + number + '\n' +
                  'END:VCARD'
                  return sock.sendMessage(jid, {
                    contacts: {
                      displayName: name,
                      contacts: [{
                        vcard
                      }]
                    },
                    mentions: men ? men : []
                  }, {
                    quoted: quoted
                  })
                }
                async function getName(id) {
                  let users = await db.get({ id }, "users")
                  let sender = users[users.length -1]
                  return sender.name
                }
                async function sendButton(jid, url, caption, buttons, headerType = 4) {
                    let media;
                    if (url.startsWith("http://") || url.startsWith("https://")) {
                        var buff = await (await fetch(url)).buffer()
                        media = buff
                    } else if (Buffer.isBuffer(url)) {
                        media = url
                    } else if (fs.existsSync(url) && url.endsWith(".png") || url.endsWith(".jpg") || url.endsWith(".jpeg")) {
                        media = await fs.readFileSync(url)
                    } else if (/^data:.*?\/.*?;base64,/i.test(url)) {
                        media = Buffer.from(url.split(",")[1], "base64")
                    } else {
                        var buff = await (await fetch("https://github.com/SanzBase.png")).buffer()
                        media = buff
                    }
                    let FT = fileType.fromBuffer ? fileType.fromBuffer : fileType
                    var mime = FT(media)?.mime?.split("/") ?? ["image"]
                    if (media) {
                        return sock.sendMessage(jid, {
                            [mime[0]]: media,
                            caption,
                            buttons,
                            footer: "©SanZ",
                            headerType
                        })
                    }
                }

                switch (command) {
                    case prefix + "resetlink":
                        case prefix + "restlink":
                            if (!isGroup) return reply("Only group")
                            if (!isMeAdmin) return reply("Bot bukan admin")
                            if (!isAdmin) reply("Only admin")
                            try {
                                var code = await sock.groupRevokeInvite(from)
                                reply("Suscess reset link\nnew link: https://chat.whatsapp.com/" + code)
                            } catch(e) {
                                console.error(e)
                            }
                            break;
                        case prefix + "getpp":
                            if (isGroup && !q) return reply("Masukan nomor atau tag member!")
                            if (!q) return reply("Masukan nomor!")
                            let no;
                            let image;
                            if (q.includes(baileys.S_WHATSAPP_NET)) no = q.split("@")[0]
                            else if (q.startsWith("@")) no = q.split("@")[1]
                            else no = q;
                            var data = await sock.onWhatsApp(no + baileys.S_WHATSAPP_NET)
                            if (data.length > 0) {
                                sock.profilePictureUrl(data[0].jid, "image").then(async(pp) => {
                                    sock.sendMessage(from, {
                                        image: {
                                          url: pp
                                        }
                                    }, {
                                        quoted: msg
                                    })
                                }).catch(_ => {
                                    reply("No Profile")
                                })
                            }
                            break;
                        case prefix + "link":
                            if (!isGroup) return reply("Only group")
                            if (!isMeAdmin) return reply("Bot bukan admin")
                            var code = await sock.groupInviteCode(from)
                            reply("https://chat.whatsapp.com/" + code)
                            break;
                        case prefix + "join":
                            if (!isOwner) return reply("Only owner")
                            if (!q) return reply("Link?")
                            if (!/https?:\/\/(chat\.whatsapp\.com)\/[A-Za-z]/.test(q)) return reply("Link tidak valid")
                            try {
                                var code = q.split("/")[3]
                                await sock.groupAcceptInvite(code)
                                reply("Suscess join")
                            } catch(e) {
                                reply(String(e))
                            }
                            break;
                        case prefix + "yts":
                            case prefix + "ytsearch":
                              return reply("[  REJECTED  ] Maintenance")
                                if (!q) return reply("Masukan parameter query")
                                var yt = await Youtube()
                                
                                
                                
                                break;
                            case prefix + "yt":
                              return reply("[  REJECTED  ] Maintenance")
                                if (!q) return;
                                var yt = await Youtube()
                                
                                
                                
                                break;
                            case prefix + "yt3":
                                case prefix + "ytmp3":
                                  return reply("[  REJECTED  ] Maintenance")
                                if (!q) return reply("Id atau url kosong")
                                var yt = await Youtube()
                                
                                
                                
                                break;
                            case prefix + "yt4":
                                case prefix + "ytmp4":
                                  return reply("[  REJECTED  ] Maintenance")
                                if (!q) return reply("Id kosong")
                                if (ytRegex.test(q)) q = ytRegex.exec(q)[1]
                                var yt = await Youtube()
                                
                                
                                
                                break;
                                case prefix + "play":
                                  return reply("[  REJECTED  ] Maintenance")
                                    if (!q) return reply("Masukan parameter query")
                                    var yt = await Youtube()
                                    
                                    
                                    
                                break;
                                case prefix + "wm":
                                  reply("[  REJECTED  ] Maintenance")
                                break;
                                case "read":
                                  if (!msg.message[type]?.contextInfo?.quotedMessage) return;
                                  var tipeQuot = Object.keys(msg.message[type].contextInfo.quotedMessage)[0]
                                  if (tipeQuot == "viewOnceMessage") {
                                    var anu = msg.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessage.message
                                    var tipe = Object.keys(anu)[0]
                                    delete anu[tipe].viewOnce
                                    var ah = {}
                                    if (anu[tipe].caption) ah.caption = anu[tipe].caption
                                    if (anu[tipe]?.contextInfo?.mentionedJid) {
                                        ah.contextInfo = {}
                                        ah.contextInfo.mentionedJid = anu[tipe]?.contextInfo?.mentionedJid || []
                                    }
                                    var dta = await baileys.downloadContentFromMessage(anu[tipe], tipe.split("M")[0])
                                    sock.sendMessage(from, { 
                                        [tipe.split("M")[0]]: await streamToBuff(dta),
                                        ...ah 
                                      }, {
                                        quoted: msg
                                      })
                                  }
                                  if (tipeQuot == "documentMessage") {
                                    var text = (await m.quoted.download()).toString()
                                    if (text.length >= 65000) text.slice(65000)
                                    reply(util.format(text))
                                  }
                                break;
                                case prefix + "tt":
                                  case prefix + "tiktok":
                                    case prefix + "tiktod": 
                                        if (!q) return reply("masukan url")
                                        try {
                                            var data = await tiktod(q)
                                            sock.sendMessage(from, { video: { url: data.url[0] ?? data.url[1] ?? data.url[2] } }, { quoted: msg })
                                        } catch(e) {
                                          reply(String(e))
                                        }
                                break;
                                case prefix + "ttmp3":
                                  case prefix + "tiktodmp3":
                                    case prefix + "tiktokmp3":
                                      if (!q) return reply("masukan url")
                                      try {
                                          var { url } = await tiktod(q)
                                          var filename = getRandom("mp4")
                                          var out = getRandom("mp3")
                                          var buff = await ( await fetch(url[0] ?? url[1] ?? url[2])).buffer()
                                          await fs.writeFileSync(filename, buff)
                                          var outname = await ffmpegDefault(filename, out)
                                          sock.sendMessage(from, {
                                            audio: fs.readFileSync(outname),
                                            mimetype: "audio/mpeg"
                                          }, {
                                            quoted: msg
                                          })
                                      } catch(e) {
                                        reply(String(e))
                                      }
                                break;
                                case prefix + "emojimix":
                                  case prefix + "mix":
                                 if (!q) return reply("masukan emoji")
                                var [emoji1, emoji2] = q.split("|")
                               if (!emoji1) return reply("masukan emoji 1");
                               if (!emoji2) return reply("masukan emoji 2");
                               if (!emojiRegex().test(emoji1)) return reply("Masukan emoji 1 dengan benar")
                               if (!emojiRegex().test(emoji2)) return reply("Masukan emoji 2 dengan benar")
                               emoji1 = parseEmoji(emoji1)
                               emoji2 = parseEmoji(emoji2)
                               var url = await mix(emoji1, emoji2)
                               if (!url || url?.results?.length == 0) return reply(`Emoji ${emoji1} dan ${emoji2} tidak di temukan`)
                               var author, pack
                               if (q.includes("--wm")) {
                                 pack = q.split("--wm")[1].split("|")[0]
                                 author = q.split("--wm")[1].split("|")[1]
                               }
                               var buff = await fetch(url.results[0].url)
                               var stc = await sticker(await buff.buffer(), {
                                 author: author,
                                 pack: pack,
                                 crop: false,
                                 type: "FULL"
                               })
                               sock.sendMessage(from, {
                                 sticker: stc
                               }, {
                                 quoted: msg
                               })
                               break;
                               case prefix + "akinator":
                                 return reply("[  REJECTED  ] Maintenance")
                                 if (!args[0]) return reply(`Contoh penggunaan:\n\n${prefix}akinator start <memulai game>\n${prefix}akinator delete <menghapus sesi>`)
                                 sock.game = sock.game ? sock.game : {}
                                 if (args[0].toLowerCase() == "start"){
                                   if (sock.game[m.from]) return reply("Masih ada game tod :v")
                                   var aki = await Akinator()
                                   var { key } = await sock.sendMessage(from, { text: `*AKINATOR*\n\n${aki.question}\n\nBlom jadi bang 🗿` }, { quoted: msg })
                                   sock.game[m.from] = { jid: m.from, aki: aki, id: Buffer.from(key.id).toString("hex") }
                                 } else if (args[0].toLowerCase() == "delete" || args[0].toLowerCase() == "del") {
                                   delete sock.game[m.from]
                                 } else {}
                               break;
                               case prefix + "react":
                                   if (sock.type == "legacy") return reply("Error does not support legacy")
                                   if (!args[0]) return reply("Masukan emoji")
                                   let reac = await react({
                                     jid: m.from,
                                     participant: m.quoted ? m.quoted.sender : m.sender,
                                     id: m.quoted ? m.quoted.id : m.id,
                                     emoji: args[0],
                                     timestamp: m.messageTimestamp
                                   })
                                   await sock.relayMessage(reac.key.remoteJid, {
                                     reactionMessage: reac
                                   }, { messageId: baileys.generateMessageID()});
                                   reply("Ok")
                               break;
                               case prefix + "leave":
                                 case prefix + "next": {
                                   if (isGroup && isOwner && command == prefix + "leave") return sock.groupLeave(from)
                                   if (isGroup) return reply("Only private chat")
                                   var room = Object.values(anon.anonymous).find(p => p.check(sender))
                                   if (!room) return reply("Anda tidak berada didalam room")
                                   reply("Ok")
                                   var other = room.other(sender)
                                   delete anon.anonymous[room.id]
                                   if (other != "") sock.sendMessage(other, { text: "Partner meninggalkan room chat" })
                                 if (command == prefix + "leave") break;
                                 }
                               case prefix + "start":
                                 if (isGroup) return reply("Only private chat")
                                 if (Object.values(anon.anonymous).find(p => p.check(sender))) return reply("Anda masih didalam room")
                                 var check = Object.values(anon.anonymous).find(p => p.state == "WAITING")
                                 if (!check) {
                                   anon.createRoom(sender)
                                   console.log("[  ANONYMOUS  ] Creating room for: " + sender);
                                   return reply("Menunggu partner")
                                 }
                                 var join = anon.joinRoom(sender)
                                 if (join) {
                                   reply("Menunggu partner")
                                   console.log("[  ANONYMOUS  ] Join a room " + sender);
                                   sock.sendMessage(from, { text: "Menemukan partner" })
                                   sock.sendMessage(join.other(sender), { text: "Menemukan partner" })
                                 }
                               break;
                               case prefix + "sendprofile":
                                 if (isGroup) return reply("Only private chat")
                                 var wait = Object.values(anon.anonymous).find(p => p.state == "WAITING" && p.check(sender))
                                 if (wait) return reply("lu mau kirim profile ke siapa su")
                                 var chat = Object.values(anon.anonymous).find(p => p.state == "CHATTING" && p.check(sender))
                                 if (!chat) return reply("Anda tidak berada didalam room")
                                 var other = chat.other(sender)
                                 var msgs = await sendContact(other, sender.split("@")[0], await getName(sender))
                                 reply("Send profile success")
                                 sock.sendMessage(other, { text: "Teman chat kamu mengirimkan profilnya!" }, { quoted: msgs })
                               break;
                                case ">":
                                    if (!isOwner) return;
                                    try {
                                        var text = util.format(await eval(`(async()=>{ ${args.join(" ")} })()`))
                                        sock.sendMessage(from, {
                                            text
                                        }, {
                                            quoted: msg
                                        })
                                    } catch(e) {
                                        sock.sendMessage(from, {
                                            text: util.format(e)}, {
                                            quoted: msg
                                        })
                                    }
                                break;
                                case prefix + "q":
                                    if (!m.quoted) return reply("Reply pesan") 
                                    var quotedObj = await m.quoted.getQuotedObj()
                                    if (!quotedObj.quoted) return reply("Pesan yang anda reply tidal mengandung reply")
                                    sock.relayMessage(from, {
                                        ...quotedObj.quoted.fakeObj
                                        }, {
                                        messageId: baileys.generateMessageID()
                                    })
                                break;
                                case "=>":
                                    if (!isOwner) return;
                                    try {
                                        var text = util.format(await eval(`(async() => { return ${args.join(" ")} })()`))
                                        sock.sendMessage(from, {
                                            text
                                        }, {
                                            quoted: msg
                                        })
                                    } catch(e) {
                                        sock.sendMessage(from, {
                                            text: util.format(e)}, {
                                            quoted: msg
                                        })
                                    }
                                break;
                                case "$":
                                      if (!isOwner) return;
                                      try {
                                        cp.exec(args.join(" "), function(er, st) {
                                            if (er) sock.sendMessage(from, {
                                                text: util.format(er.toString().replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, ''))
                                            }, {
                                                quoted: msg
                                            })
                                            if (st) sock.sendMessage(from, {
                                                text: util.format(st.toString().replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, ''))}, {
                                                quoted: msg
                                            })
                                        })
                                    } catch(e) {
                                        console.warn(e)
                                    }
                                break;
                                default:
                                if (setting.simi && body && !msg.key.fromMe) {
                                    if (isGroup && !(setting.simiGroup && msg.message[type]?.contextInfo?.stanzaId?.startsWith("BAE5") && msg.message[type]?.contextInfo?.participant == m.me)) return;
                                    var data = await axios.get(`https://api.simsimi.net/v2/?text=${encodeURIComponent(body)}&lc=id`)
                                    console.log(`[ SIMI ] from ${from} pushname ${pushname} delay ${delay}`);
                                    if (setting.voiceSimi) {
                                      //await sock.sendPresenceUpdate("recording", from)
                                      var path = await gtts(data.data.success, "id")
                                      await baileys.delay(3000)
                                      return sock.sendMessage(from, {
                                        audio: fs.readFileSync(path),
                                        mimetype: "audio/mpeg",
                                        ptt: true,
                                        contextInfo: {
                                          forwardingScore: 9292,
                                          isForwarded: true
                                        }
                                      }, {
                                        quoted: msg
                                      })
                                    }
                                    else
                                    await sock.sendPresenceUpdate("composing", from)
                                    var delay = [1000, 2000, 3000, 4000][Math.floor(Math.random() * 4)]
                                    await baileys.delay(delay)
                                    sock.sendMessage(from, {
                                        text: data.data.success,
                                        contextInfo: {
                                            forwardingScore: 9292,
                                            isForwarded: true
                                        }
                                      }, {
                                        quoted: msg
                                      })
                                }
                                if (!isGroup && !isCmd && !m.key.fromMe) {
                                  let room = Object.values(anon.anonymous).find(p => p.state == "CHATTING" && p.check(sender))
                                  //console.log(room);
                                  if (room) {
                                    let other = room.other(sender)
                                    sock.relayMessage(other, baileys.generateForwardMessageContent(m.fakeObj, 1), { messageId: baileys.generateMessageID() })
                                  }
                                }
                                if (setting.antiSpam && isGroup && !m.key.fromMe) {
                                  chatsFilter.add(body)
                                  let h = chatsFilter.has(body)
                                  console.log(h);
                                  if (h) {
                                    //reply("Jangan spam!")
                                  }
                                }
                                if (setting.antiViewonce && type == "viewOnceMessage") {
                                  var anu = msg.message.viewOnceMessage.message
                                  var tipe = Object.keys(anu)[0]
                                  delete anu[tipe].viewOnce
                                  var ah = {}
                                  if (anu[tipe].caption) ah.caption = anu[tipe].caption
                                  if (anu[tipe]?.contextInfo?.mentionedJid) {
                                      ah.contextInfo = {}
                                      ah.contextInfo.mentionedJid = anu[tipe]?.contextInfo?.mentionedJid || []
                                  }
                                  reply(`ANTI VIEWONCE MESSAGE\n\nNama: ${await getName(sender)}\nWaktu: ${moment.tz("Asia/Jakarta").format("DD/MM/yy HH.mm.ss")}`)
                                  var data = await baileys.downloadContentFromMessage(anu[tipe], tipe.split("M")[0])
                                  sock.sendMessage(from, { 
                                      [tipe.split("M")[0]]: await streamToBuff(data),
                                      ...ah 
                                    })
                                }
                                  if (sock.game && from in sock.game) {
                                  let jid = from;
                                  var aki = sock.game[jid]
                                  var id = Buffer.from(aki.id, "hex").toString()
                                  if (m.quoted && m.quoted?.id == id) {
                                      if (aki.aki.progress >= 80 && m.quoted?.id == id) {
                                    var answers = await aki.aki.win()
                                    sock.sendMessage(jid, {
                                      image: {
                                        url: answers[0].absolute_picture_path
                                      },
                                      caption: `*AKINATOR*\n\n${answers[0].name} - ${answers[0].description}`
                                    }, {
                                      quoted: msg
                                    })
                                    delete sock.game[jid]
                                    return;
                                  }
                                    if (/^([0-4])$/g.test(body)) {
                                      await aki.aki.step(body)
                                      var { key } = await sock.sendMessage(jid, {
                                        text: `*AKINATOR*\n\n${aki.aki.question}\n\nhoree🗿`
                                      }, {
                                        quoted: msg
                                      })
                                      aki.id = Buffer.from(key.id).toString("hex")
                                    }
                                  }
                                }
                }
              } catch(e) {
                console.error(e)
                return;
              }
            })
}
;(async() => {
  let db;
  try {
    db = await Database.connect(MONGO_URI)
  } catch(e) {
    console.log(e);
  }
  global.db = db
  main(setting.auth, true, false, true)
})();
process.on("exit", code => {
  console.log("[ PROCESS ] Exit with code: " + code)
})
process.on("UnhandledPromiseRejection", qm => {
  console.log("[  INFO  ] " + qm)
})
    async function Youtube(str) {
      if (!str) return new Error(str)
        return {
          search: async() => {
            let res = await yts.search(str)
            return res.all
          },
          download: async(type, quality) => {
            if (!type) return new Error("received type '" + type + "'")
            let res = await ytdl.getInfo(str)
            let all = res.formats.filter(v => v[type == "audio" ? "hasAudio" : "hasVideo"] && !v[type == "audio" ? "qualityLabel" : "hasAudio"])
            let urlFetch = all[0].url
            if (quality && type == "video") urlFetch = all.find(v => v.qualityLabel == quality)[0].url
            let data = await fetch(urlFetch)
            return {
              data: all,
              [type]: await data.buffer()
            }
          },
          getDetails: async() => {
            if (!id) return new Error("video id null")
            var data = await ytdl.getInfo(str)
            return data;
          }
        }
    }
    function getRandom(ext) {
      ext = ext || ""
      return `${Math.floor(Math.random() * 100000)}.${ext}`
    }

async function streamToBuff(stream) {
let buff = Buffer.alloc(0)
for await (const chunk of stream) buff = Buffer.concat([buff, chunk])
return buff
}

function ffmpegDefault(path, out) {
let ff = cp.execSync(`ffmpeg -i ${path} ${out}`)
if (ff.length == 0) return out
}

function deletePath(path) {
    return fs.unlinkSync(path)
}

async function tiktod(url) {
    var { data, headers } = await axios.get("https://musicaldown.com/")
    var $ = cheerio.load(data)
    var asu = []
    $('form > div > div > input').each(function(){
        asu.push({
            value: $(this).attr('value'),
            name: $(this).attr('name')
        })
    })
    var form = new formData
    form.append(asu[0].name, url)
    form.append(asu[1].name, asu[1].value)
    form.append(asu[2].name, asu[2].value)
    var html = await axios({
        url: "https://musicaldown.com/download",
        method: "POST",
        data: form,
        headers: {
            accept: "*/*",
            cookie: headers["set-cookie"].join(" "),
            ...form.getHeaders()
        }
    })
    var { document } = (new JSDOM(html.data)).window
    var doc = document.querySelectorAll("a[target=_blank]")
    return {
        thumb: document.querySelector(".responsive-img")?.src,
        url: [doc[0]?.href,
        doc[1]?.href,
        doc[2]?.href]
    }
}

async function mix(emoji1, emoji2) {
    if (!emoji1 || !emoji2) throw CustomError("Emojis needed", "EmojiError")
    let data = await ( await fetch(`https://tenor.googleapis.com/v2/featured?key=AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ&contentfilter=high&media_filter=png_transparent&component=proactive&collection=emoji_kitchen_v5&q=${encodeURIComponent(emoji1)}_${encodeURIComponent(emoji2)}`) ).json()
    if (data) return data
    else return !1
}

async function sticker(metadata, options) {
    if (!metadata) throw CustomError("Data must be of type string or an instanceof buffer", "StickerError")
    let stc = new Sticker(metadata, options)
    await stc.build()
    return await stc.get()
}

async function getExif(data) {
    let s = new webpmux.Image()
    await s.load(data)
    return JSON.parse(s.exif.slice(22).toString())
}

function parseEmoji(emoji) {
    let match = emoji.matchAll(emojiRegex())
    for(let emo of match) {
        return emo[0]
    }
}

async function gtts(teks, lang) {
    var ran = "./cache/" + getRandom("mp3")
    var _gtts = new gTTS(teks, lang);
    _gtts.save(ran, function() {
      return ran
    })
}

function CustomError(msg, name = "Error") {
  let err = new TypeError;
  err.name = name
  err.message = msg
  return err
}

async function react(options = {}, sock) {
    if (!options.jid) throw new Error("Jid not be empty")
    if (!options.id) throw new Error("id not be empty")
    if (!options.participant) throw new Error("participat not be empty")
    if (!options.timestamp) throw new Error("timestamp not be empty")
    if (!options.emoji) throw new Error("emoji not be empty")
    let reac = await baileys.proto.ReactionMessage.create({
      key: {
        id: options.id,
        participant: options.participant,
        remoteJid: options.jid,
      },
      text: options.emoji,
      senderTimestampMs: options.timestamp
    });
    if (sock) return await sock.relayMessage(reac.key.remoteJid, { reactionMessage: reac }, { messageId: baileys.generateMessageID()});
    else return reac
}

function Akinator(region = "id") {
  return (async(region) => {
    let { Aki, regions } = (await import("aki-api")).default
    if (!regions.find(reg => reg == region)) throw new Error("region '" + region + "' not supported")
    let aki = new Aki({ region, childMode: false })
    await aki.start()
    return {
      get question() {
        return aki.question
      },
      get progress() {
        return aki.progress
      },
      get guessCount() {
        return aki.guessCount
      },
      step(no) {
        return aki.step(parseInt(no))
      },
      async win() {
        await aki.win()
        return aki.answers;
      },
      back() {
        return aki.back()
      }
    }
})(region)
}
