import axios from "axios";
import cheerio from "cheerio";
import vm from "node:vm";
import fs from "node:fs";
import JsO from "javascript-obfuscator";
import acrcloud from "acrcloud";

let token_coc_gw_kontol_create_sendiri_lah_asu_modal_mek = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiIsImtpZCI6IjI4YTMxOGY3LTAwMDAtYTFlYi03ZmExLTJjNzQzM2M2Y2NhNSJ9.eyJpc3MiOiJzdXBlcmNlbGwiLCJhdWQiOiJzdXBlcmNlbGw6Z2FtZWFwaSIsImp0aSI6IjVhNDk3NmQ3LWRhNmItNGZhZS04YTNmLTU3ZDEyMGY0ZjdjMiIsImlhdCI6MTY0OTEyNDMxNiwic3ViIjoiZGV2ZWxvcGVyL2YwMWE2NzY1LTA5MTItNDQxYy0wMjdjLTM2YmFkZmUzNTExOSIsInNjb3BlcyI6WyJjbGFzaCJdLCJsaW1pdHMiOlt7InRpZXIiOiJkZXZlbG9wZXIvc2lsdmVyIiwidHlwZSI6InRocm90dGxpbmcifSx7ImNpZHJzIjpbIjIwLjIyOC4yMzUuMTkwIl0sInR5cGUiOiJjbGllbnQifV19.csAe9-pqpNNo-B-pAvHSI-OqrdzZ0VLSXOFmu4gi2ixwyxdMsXYtZ-oElx6SNEAC7BMrXI-IiofXxpcCIOKaoA";
let acropts = {
  host: "identify-eu-west-1.acrcloud.com",
  access_key: "cc0155322ccff43d32eb56e9ffe873da",
  access_secret: "CWny9hlFzguEZZ1EeYwt9H411SGqiZ5fPeUB69BK"
};

const getCookie = async(...args) => (await axios(...args)).headers["set-cookie"];

async function savefrom() {
  let body = new URLSearchParams({
    "sf_url": encodeURI(arguments[0]),
    "sf_submit": "",
    "new": 2,
    "lang": "id",
    "app": "",
    "country": "id",
    "os": "Windows",
    "browser": "Chrome",
    "channel": " main",
    "sf-nomad": 1
  });
  let { data } = await axios({
    "url": "https://worker.sf-tools.com/savefrom.php",
    "method": "POST",
    "data": body,
    "headers": {
      "content-type": "application/x-www-form-urlencoded",
      "origin": "https://id.savefrom.net",
      "referer": "https://id.savefrom.net/",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.74 Safari/537.36"
    }
    });
    let exec = '[]["filter"]["constructor"](b).call(a);';
    data = data.replace(exec, `\ntry {\ni++;\nif (i === 2) scriptResult = ${exec.split(".call")[0]}.toString();\nelse (\n${exec.replace(/;/, "")}\n);\n} catch {}`);
    let context = {
      "scriptResult": "",
      "i": 0
    };
    vm.createContext(context);
    new vm.Script(data).runInContext(context);
    return JSON.parse(context.scriptResult.split("window.parent.sf.videoResult.show(")?.[1].split(");")?.[0])
}

async function aiovideodl(url) {
  let { data, headers } = await axios("https://aiovideodl.ml/");
  let $ = cheerio.load(data);
  let token = $("#token").attr("value");
  let cookie = headers["set-cookie"].join("; ");
  let body = new URLSearchParams({ url, token });
  let { data: res } = await axios({
    "url": "https://aiovideodl.ml/wp-json/aio-dl/video-data/",
    "method": "POST",
    "data": body,
    "headers": {
      "content-type": "application/x-www-form-urlencoded",
      "cookie": cookie,
      "origin": "https://aiovideodl.ml",
      "referer": "https://aiovideodl.ml/",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.74 Safari/537.36"
    }
  });
  return res;
}

async function dl() {
  let url = arguments[0];
  if (!url) throw new Error("url lu kosong kontol");
  let res;
  try {
    res = {
      "status": 200,
      "server": "aiovideodl",
      "result": await aiovideodl(url)
    };
  } catch(e) {
    res = {
      "status": 200,
      "server": "savefrom",
      "result": await savefrom(url)
    };
  } finally {
    if (res) return res;
  }
}

function ClashOfClans(token) {
  if (!token) throw new Error("no token");
  this.token = token;
  this.baseURL = "https://api.clashofclans.com";
  this.version = 1;
  this._request = {};
  this.fetchRequest();
}

ClashOfClans.prototype.fetchRequest = function() {
  this._request = axios.create({
    "baseURL": `${this.baseURL}/v${this.version}`,
    "headers": {
      "Authorization": "Bearer " + this.token
    }
  });
};

ClashOfClans.prototype.getPlayers = function() {
  let id = arguments[0];
  if (!id) throw new Error("no id");
  return new Promise(async(res, rej) => {
    this._request(`/players/${encodeURIComponent(id)}`).then(function(data) {
      res({
        "status": 200,
        "result": data.data
        });
    }).catch((err) => {
      rej(err.response.data);
    });
  });
};

ClashOfClans.prototype.languages = function() {
  return new Promise(async(res, rej) => {
    this._request("/languages").then(function(data) {
      res({
        "status": 200,
        "result": data.data
        });
    }).catch((err) => {
      rej(err.response.data);
    });
  });
};

function idML(userId, zoneId) {
  if (!userId) return new Error("no userId")
  if (!zoneId) return new Error("no zoneId")
  return new Promise((resolve, reject) => {
    let body = {
      "voucherPricePoint.id": 4150,
      "voucherPricePoint.price": "1565.0",
      "voucherPricePoint.variablePrice": 0,
      "n": "",
      "email": "",
      "userVariablePrice": 0,
      "order.data.profile": "",
      "user.userId": userId,
      "user.zoneId": zoneId,
      "msisdn": "",
      "voucherTypeName": "MOBILE_LEGENDS",
      "shopLang": "id_ID",
      "impactClickId": "",
      "affiliateTrackingId": "",
      "checkoutId": "",
      "tmwAccessToken": "",
      "anonymousId": ""
    };
    axios({
      "url": "https://order-sg.codashop.com/initPayment.action",
      "method": "POST",
      "data": body,
      "headers": {
        "Content-Type": "application/json; charset/utf-8",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36"
      }
    }).then(({ data }) => {
      resolve({
        "username": data.confirmationFields.username,
        "country": data.confirmationFields.country,
        "userId": userId,
        "zoneId": zoneId
      });
    }).catch(reject);
  });
}

function idFF(userId) {
  if (!userId) return new Error("no userId");
  return new Promise((resolve, reject) => {
    let body = {
      "voucherPricePoint.id": 8050,
      "voucherPricePoint.price": "",
      "voucherPricePoint.variablePrice": "",
      "n": "",
      "email": "",
      "userVariablePrice": "",
      "order.data.profile": "",
      "user.userId": userId,
      "voucherTypeName": "FREEFIRE",
      "affiliateTrackingId": "",
      "impactClickId": "",
      "checkoutId": "",
      "tmwAccessToken": "",
      "shopLang": "in_ID"
    };
    axios({
      "url": "https://order.codashop.com/id/initPayment.action",
      "method": "POST",
      "data": body,
      "headers": {
        "Content-Type": "application/json; charset/utf-8",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36"
      }
    }).then(({ data }) => {
      resolve({
        "username": data.confirmationFields.roles[0].role,
        "userId": userId,
        "country": data.confirmationFields.country
      });
    }).catch(reject);
  });
}

function idCOC(userId) {
  if (!userId) return new Error("no userId");
  return new Promise((resolve, reject) => {
    let coc = new ClashOfClans(token_coc_gw_kontol_create_sendiri_lah_asu_modal_mek);
    coc.getPlayers(userId).then((usr) => {
      resolve({
        "username": usr.result.name,
        "userId": userId
      });
    }).catch(reject);
  });
}


var baseURL = "https://duniagames.co.id";
const topup = async(userId, zoneId, diamond, phone, game) => {
  if (!userId || !diamond || !phone || !game) return new Error();
  let cookie = await getCookie(baseURL);
  if (!cookie) return new Error("empty cookies");
  let res = await axios.post(`https://api.duniagames.co.id/api/transaction/v1/top-up/inquiry/store?${getVal(diamond, game.toUpperCase())}&gameId=${userId}&product_ref=REG&product_ref_denom=AE`, null, {
    "headers": { 
      "cookie": cookie.join(" "),
      "origin": baseURL,
      "referer": baseURL
    }
  });
  if (res.status != 200) throw new Error(res.statusText);
  let res2 = await axios.post(`https://api.duniagames.co.id/api/transaction/v1/top-up/transaction/store?inquiryId=${res.data.data.inquiryId}&phoneNumber=${phone}&transactionId=${res.data.data.transactionId}`, null, {
    "headers": { 
      "cookie": cookie.join(" "),
      "origin": baseURL,
      "referer": baseURL
    }
  });
  if (res2.status != 200) throw new Error(res2.statusText);
  return res2.data;
};

function getVal(dm, game) {
  let list = JSON.parse(fs.readFileSync("./duniagames.json"));
  if (!list[game]) return new Error("no game for '" + game + "'");
  return new URLSearchParams(list[game][dm]).toString();
}

function JSObfuscator(code) {
  if (!code) return code;
  let o = JsO.obfuscate(code);
  return o.getObfuscatedCode();
}

async function identifymusic(media, opts) {
  if (!media) return new Error("No media");
  if (opts && !opts.access_key && !opts.access_secret) return new Error("missing options");
  let acr = new acrcloud(opts || acropts);
  let res = await acr.identify(media)
  if (!("metadata" in res)) return new Error(res.status.msg)
  return res.metadata.music[0];
}

export default () =>  "halo om";
export { dl, savefrom, aiovideodl, ClashOfClans, idML, idFF, idCOC, JSObfuscator, topup, identifymusic };
