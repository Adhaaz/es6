// import all module
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
import PN from "awesome-phonenumber"
import moment from "moment-timezone"
import EventEmitter from "events"
import cheerio from "cheerio"
import formData from "form-data"
import * as fileType from "file-type"
import emojiRegex from "emoji-regex"
import webpmux from "node-webpmux"
import gTTS from "gtts"
import P from "pino"
import qrCode from "qrcode-terminal"
import ytdl from "ytdl-core"
import yts from "yt-search"
import {
    JSDOM
} from "jsdom"
import {
    Sticker
} from "wa-sticker-formatter"
import Message, {
    color,
    audio,
    owner,
    anon,
    map,
    set,
    chatsFilter,
    random
} from "./functions.js"
import data, {
    dl,
    savefrom,
    aiovideodl,
    idML,
    idFF,
    idCOC,
    JSObfuscator,
    topup,
    identifymusic,
    top4top,
    deepai,
    gdrive
} from "./data.js"
let {
    version,
    isLatest
} = await baileys.fetchLatestBaileysVersion()

global.require = module.createRequire(import.meta.url)
global.setting = {
    owner: owner,
    prefix: "",
    antiSpam: false,
    antiNsfw: false,
    antiNsfwRmv: false,
    antiViewonce: true,
    auth: "auth.json"
}

app = require("express")()
app.get("/", (req, res) => res.send("Active!!"))
app.listen(process.env.PORT, () => {})

const main = async(auth, memStr, multi, md) => {
    let store = memStr ? baileys.makeInMemoryStore({
        stream: "store"
    }) : undefined
    store?.readFromFile("store.json")
    var fileAuth = baileys.useSingleFileAuthState(auth)
    var sock = baileys.default({
        auth: fileAuth.state,
        printQRInTerminal: true,
        version: version,
        logger: P({
            level: "silent"
        }),
        getMessage: async key => {
            return {
                conversation: "p"
            }
        }
    })
    store?.bind(sock.ev)
    setInterval(() => {
        store?.writeToFile("store.json")
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
        async (message) => {
            try {
                if (!message.messages[0]) return;
                let timestamp = new Date()
                let msg = message.messages[0]
                if (!msg.message) return;
                let m = new Message(msg, sock, store)
                let type = Object.keys(msg.message)[0]
                let from = msg.key.remoteJid;
                let isGroup = from.endsWith("@g.us")
                let sender = isGroup ? msg.key.participant : m.sender;
                let metadata = isGroup ? await sock.groupMetadata(from) : ""
                let me = sock.type == "md" ? sock.user.id.split(":")[0] + baileys.S_WHATSAPP_NET : sock.state.legacy.user.id
                let isMeAdmin = isGroup ? metadata.participants.find(v => v.id == me).admin : ""
                let isAdmin = isGroup ? metadata.participants.find(u => u.id == sender)?.admin : ""
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
                if (command) {
                    console.log(`[ MESSAGE ] from ${pushname} text: ${body}`)
        }
                switch (command) {
                    case prefix + "anonymous":
                        var teks = "*MENI ANONYMOUS CHAT*\n\n"
                        teks += prefix + "start [untuk memulai chat]\n"
                        teks += prefix + "next [untuk memulai chat baru]\n"
                        teks += prefix + "leave [untuk keluar dari chat]\n"
                        teks += prefix + "sendprofile [untuk mengirim kontak mu]\n"
                        reply(teks)
                        break
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
                            sock.profilePictureUrl(data[0].jid, "image").then(async (pp) => {
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
                    case prefix + "upload":
                        try {
                            let top = await top4top(await m.quoted.download())
                            reply(util.format(top))
                        } catch (e) {
                            reply(e)
                        }
                        break;
                    case prefix + "deepai":
                        let dep = await deepai(q, {
                            image: m.quoted ? await m.quoted.download() : await m.download()
                        })
                        sock.sendMessage(from, {
                            image: {
                                url: dep.output_url
                            }
                        }, {
                            quoted: msg
                        })
                        break
                    case prefix + "gdrive":
                        let gdr = await gdrive(q)
                        sock.sendMessage(from, {
                            document: {
                                url: gdr.downloadUrl
                            },
                            fileName: gdr.fileName,
                            mimetype: gdr.mimetype
                        }, {
                            quoted: msg
                        })
                        break
                        reply("https://chat.whatsapp.com/" + code)
                    case prefix + "join":
                        if (!isOwner) return reply("Only owner")
                        var link = q
                        if (!q) link = m.quoted ? m.quoted.text : m.text
                        if (!/https?:\/\/(chat\.whatsapp\.com)\/[A-Za-z]/.test(link)) return ("Link tidak valid")
                        try {
                            var code = link.split("/")[3]
                            await sock.groupAcceptInvite(code)
                            reply("Suscess join")
                        } catch (e) {
                            reply(String(e))
                        }
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
                            sock.sendMessage(from, {
                                video: {
                                    url: data.url[0] ?? data.url[1] ?? data.url[2]
                                }
                            }, {
                                quoted: msg
                            })
                        } catch (e) {
                            reply(String(e))
                        }
                        break;
                       
                            case "bugfc":
                             let bugfc = {
		key: {
			fromMe: true,
			participant: `0@s.whatsapp.net`, 
            ...({ remoteJid: ""})
		},
		message: {
			conversation: 'p'
        }
	}
sock.sendMessage(from, {text: 'p'}, {quoted:bugfc})
                            break
                    case prefix + "ttmp3":
                    case prefix + "tiktodmp3":
                    case prefix + "tiktokmp3":
                        if (!q) return reply("masukan url")
                        try {
                            var {
                                url
                            } = await tiktod(q)
                            var filename = getRandom("mp4")
                            var out = getRandom("mp3")
                            var buff = await (await fetch(url[0] ?? url[1] ?? url[2])).buffer()
                            await fs.writeFileSync(filename, buff)
                            var outname = await ffmpegDefault(filename, out)
                            sock.sendMessage(from, {
                                audio: fs.readFileSync(outname),
                                mimetype: "audio/mpeg"
                            }, {
                                quoted: msg
                            })
                            await baileys.delay(2000)
                            fs.unlinkSync(outname)
                            fs.unlinkSync(filename)
                        } catch (e) {
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
                    case prefix + "react":
                    case prefix + "r":

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
                        }, {
                            messageId: baileys.generateMessageID()
                        });

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
                        if (other != "") sock.sendMessage(other, {
                            text: "Partner meninggalkan room chat"
                        })
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
                            sock.sendMessage(from, {
                                text: "Menemukan partner"
                            })
                            sock.sendMessage(join.other(sender), {
                                text: "Menemukan partner"
                            })
                        }
                        break;
                    case prefix + "sendprofile":
                        if (isGroup) return reply("Only private chat")
                        var wait = Object.values(anon.anonymous).find(p => p.state == "WAITING" && p.check(sender))
                        if (wait) return reply("kamu mau kirim profile ke siapa??")
                        var chat = Object.values(anon.anonymous).find(p => p.state == "CHATTING" && p.check(sender))
                        if (!chat) return reply("Anda tidak berada didalam room")
                        var other = chat.other(sender)
                        var msgs = await sendContact(other, sender.split("@")[0], await getName(sender))
                        reply("Send profile success")
                        sock.sendMessage(other, {
                            text: "Teman chat kamu mengirimkan profilnya!"
                        }, {
                            quoted: msgs
                        })
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
                        } catch (e) {
                            sock.sendMessage(from, {
                                text: util.format(e)
                            }, {
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
                        } catch (e) {
                            sock.sendMessage(from, {
                                text: util.format(e)
                            }, {
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
                                    text: util.format(st.toString().replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, ''))
                                }, {
                                    quoted: msg
                                })
                            })
                        } catch (e) {
                            console.warn(e)
                        }
                        break;
                    default:
                        if (!isGroup && !isCmd && !m.key.fromMe) {
                            let room = Object.values(anon.anonymous).find(p => p.state == "CHATTING" && p.check(sender))
                            //console.log(room);
                            if (room) {
                                let other = room.other(sender)
                                sock.relayMessage(other, baileys.generateForwardMessageContent(m.fakeObj, 1), {
                                    messageId: baileys.generateMessageID()
                                })
                            }
                        }
                        if (setting.antiSpam && isGroup && !m.key.fromMe) {
                            chatsFilter.add(body)
                            let h = chatsFilter.has(body)
                            console.log(h);
                            if (h) {
                                reply("Jangan spam!")
                            }
                        }
                        if (setting.antiNsfw && !msg.key.fromMe && m.type == "imageMessage") {
                            let data = await m.download()
                            let res = await deepai("nsfw-detector", {
                                image: data
                            })
                            if (res.output.nsfw_score > 0.75) {
                                reply(`*NSFW DETECTED*\n\nID: ${sender}\nWAKTU: ${time}`)
                                console.log("[ NSFW DETECTED ]\n\n" + res.output)
                                if (setting.antiNsfwRmv && setting.antiNsfwRmv != undefined) return sock.groupParticipantsUpdate(from, [sender], "remove")
                            }
                        }

                        if (setting.antiViewonce && type == "viewOnceMessage" && !msg.key.fromMe) {
                            var anu = msg.message.viewOnceMessage.message
                            var tipe = Object.keys(anu)[0]
                            delete anu[tipe].viewOnce
                            var ah = {}
                            if (anu[tipe].caption) ah.caption = anu[tipe].caption
                            if (anu[tipe]?.contextInfo?.mentionedJid) {
                                ah.contextInfo = {}
                                ah.contextInfo.mentionedJid = anu[tipe]?.contextInfo?.mentionedJid || []
                            }
                            reply(`ANTI VIEWONCE MESSAGE\n\nId: ${sender}\nWaktu: ${moment.tz("Asia/Jakarta").format("DD/MM/yy HH.mm.ss")}`)
                            var data = await baileys.downloadContentFromMessage(anu[tipe], tipe.split("M")[0])
                            sock.sendMessage(from, {
                                [tipe.split("M")[0]]: await streamToBuff(data),
                                ...ah
                            })
                        }
                }
            } catch (e) {
                console.error(e)
                return;
            }
        })
}

main(setting.auth, false, false, true)
process.on("exit", async code => {
    console.log("[ PROCESS ] Exit with code: " + code)
    main(setting.auth, true, false, true)
})
process.on("UnhandledPromiseRejection", async qm => {
    console.log("[  INFO  ] " + qm)
})

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
    var {
        data,
        headers
    } = await axios.get("https://musicaldown.com/")
    var $ = cheerio.load(data)
    var asu = []
    $('form > div > div > input').each(function() {
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
    var {
        document
    } = (new JSDOM(html.data)).window
    var doc = document.querySelectorAll("a[target=_blank]")
    return {
        thumb: document.querySelector(".responsive-img")?.src,
        url: [doc[0]?.href,
            doc[1]?.href,
            doc[2]?.href
        ]
    }
}

async function mix(emoji1, emoji2) {
    if (!emoji1 || !emoji2) throw CustomError("Emojis needed", "EmojiError")
    let data = await (await fetch(`https://tenor.googleapis.com/v2/featured?key=AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ&contentfilter=high&media_filter=png_transparent&component=proactive&collection=emoji_kitchen_v5&q=${encodeURIComponent(emoji1)}_${encodeURIComponent(emoji2)}`)).json()
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
    for (let emo of match) {
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
    if (sock) return await sock.relayMessage(reac.key.remoteJid, {
        reactionMessage: reac
    }, {
        messageId: baileys.generateMessageID()
    });
    else return reac
}

// Ivanzz - © 2021
