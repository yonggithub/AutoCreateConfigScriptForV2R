const http = require("http");
const https = require("https");

/* decode base64
  * note: because vmess support return for a encoded string, add a trim char check
  * @param s string 
  * @return string
  */
export function decode(s: any | string): string {
    // let newS = s.toString();
    //delete the \n\r 
    s = s.toString().replace(/\s+/g, "");
    if (s.length % 4 !== 0) {
        let p: any = "=";
        s = s + s.length % 4 * p;
        console.log(s);
    }
    var buf = Buffer.from(s, 'base64');
    let result = buf.toString('utf8');


    return result;
}
/* decode vmess, ss or ssr link
 * @param s string
 * @return string
 */
export function linkDecode(s: string): string | undefined {
    //judge if supported link
    if (s.startsWith("vmess://")) {
        return decode(s.substring(8));
    } else if (s.startsWith("ssr://")) {
        return decode(s.substring(6));
    } else if (s.startsWith("ss://")) {
        return decode(s.substring(5));
    } else {
        console.warn("a illegal link: " + `${s}`);
    }
}

/* parse string to obj
* @param s string
* @return object
*/
export function parse(s: any | string): any | undefined {
    if (typeof s !== "string") {
        console.warn(`parsing a not-string obj: ${s} aborted!`)
    } else {
        var ob = JSON.parse(s);
        return ob;
    }
}


// config: {"v":"2","ps":"华南 <-中继-> 香港04","add":"cn1.ymcb.net","port":981,"id":"5029c6e8-258b-49d9-947b-1c53edc6b34b","aid":"2","net":"tcp","type":"none","host":"","path":"","tls":""}
/**
 * transfer config to outbound config.
 * @param config 
 */
export function outboundTemplateFun(config: any) {

    let add: string = config.add;
    let port: string = config.port;
    let id: string = config.id;
    let aid: string = config.aid;
    let net: string = config.net;
    let type: string = config.type;
    let host: string = config.host;
    let path: string = config.path;
    let tls: string = config.tls
    let ps: string = config.ps

    return {
        "outbound": {
            "protocol": "vmess",
            "settings": {
                "vnext": [{
                    "address": add,
                    "port": port,
                    "users": [{
                        "id": id,
                        "alterId":parseInt(aid),
                        "security": "auto"
                    }]
                }]
            },
            "streamSettings": {
                "network": net,
                "security": "none",
                "tlsSettings": null,
                "tcpSettings": null,
                "kcpSettings": null,
                "wsSettings": null,
                "httpSettings": null
            },
            "mux": {
                "enabled": true
            }
        }
    }
}

/**============================订阅===================== */
/* handle subscribe link, get the response
 * @param url
 * @return Promise resove(string)
 */
export function getRes(url: string) {

    if (typeof url !== "string" || !(url.startsWith("http://") || url.startsWith("https://"))) {
        throw new Error("Only can handle link format!");
    }
    return new Promise((resolve) => {
        var strings: any = [];
        if (url.startsWith("http://")) {
            var req = http.get(url, (res: any) => {
                if (res.statusCode !== 200) {
                    throw new Error("Request failed please check your Internet connection!\n" + `statusCode: ${res.statusCode}`);
                }
                res.on("data", (chunk: any) => {
                    strings.push(chunk);
                });
            });
        } else if (url.startsWith("https://")) {

            var req = https.get(url, (res: any) => {
                if (res.statusCode !== 200) {
                    throw new Error("Request failed please check your Internet connection!\n" + `statusCode: ${res.statusCode}`);
                }
                res.setEncoding("utf8");
                res.on("data", (chunk: string) => {
                    if (chunk) {
                        strings.push(chunk);
                        resolve(strings.join(""));
                    }
                });
            });
        }
        // once the request done, join the chunks together, and resolve it
        // req.on('close',()=>{
        // 	resolve(strings.join(""));
        // });
    });
}

export function transferLinkListToConfigList(linkList: any) {
    let configList = []
    let filecount = 0;
    for (let link of linkList) {
        if (link) {//无视空串
            //decode the base64 link
            let decodeLink: any = linkDecode(link);
            //get json
            let config: any = parse(decodeLink)
            let ps:string = config.ps
            //get outbound
            let outboundTemplate: any = outboundTemplateFun(config)
            //get inbound and outbound
            let g2 = genV2Config(outboundTemplate)

            let fileName = "config" + filecount + ".json"
            let content = JSON.stringify(g2)
            // downloadFileHelper(fileName, content)
            // decodeLinkList.push(outboundTemplate)
            configList.push({
                fileName:fileName,
                content,
                ps
            })
            filecount++;
        }

    }
    return configList;
}

export function genV2Config(outbound: any): any {

    return {
        "inbounds": [
            {
                "port": 8000,
                "protocol": "shadowsocks",
                "settings": {
                    "method": "aes-128-gcm",
                    "ota": true,
                    "password": "12345678"
                }
            }
        ],
        "log": {
            "access": "/var/log/v2ray/access.log",
            "error": "/var/log/v2ray/error.log",
            "loglevel": "warning"
        },
        "outbound": outbound['outbound']
    }
}



export function downloadFileHelper(fileName: string, content: string | any) {
    let aTag: any = document.createElement('a');
    let blob: any = new Blob([content]);

    aTag.download = fileName;
    aTag.key = fileName;
    aTag.style = "display: none";
    aTag.href = URL.createObjectURL(blob);
    document.body.appendChild(aTag);
    aTag.click();

    // document.body.removeChild(aTag);
    // window.URL.revokeObjectURL(blob);

    setTimeout(function () {
        document.body.removeChild(aTag);
        window.URL.revokeObjectURL(blob);
    }, 100);


};