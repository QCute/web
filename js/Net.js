
"use strict";

class Net{

    constructor(account) {
        this.servers = [{"server_name": "本地服", "server_id": 1001, "server_ip": "fake.me", "server_port": 11001}];
        // server list
        $.ajax({url: "http://api.fake.me", async: false, success: (responseText) => this.servers = JSON.parse(responseText) });
        // role
        this.accountName = account;
        // protocol handler
        this.handler = {};
        // byte reader
        this.reader = new Reader();
        // web socket
        this.connect("本地服");
    }

    toUrl(ip, port) {
        return "ws://" + ip + ":" + port + "/";
    }

    getPort(name) {
        for (let i = 0; i < this.servers.length; ++i) {
            if (this.servers[i].server_name == name)
                return this.servers[i].server_port;
        }
    }

    getServer(name) {
        for (let i = 0; i < this.servers.length; ++i) {
            if (this.servers[i].server_name == name)
                return this.servers[i];
        }
    }

    connect(name) {
        let server = this.getServer(name);
        this.serverId = server.server_id;
        this.socket = new WebSocket(this.toUrl(server.server_ip, server.server_port));
        this.socket.binaryType = "arraybuffer";
        // connect query account
        this.socket.onopen = (event) => { console.log(event);  this.send(10001, [this.serverId, this.accountName]); };
        this.socket.onclose = (event) => { console.log(event); };
        this.socket.onmessage =  (event) => { this.__handle(event) }
    }

    close() {
        this.socket.close();
    }

    getState() {
        return this.socket.readyState;
    }

    // send protocol
    send(protocol, content) {
        return this.__send(new Writer().write(protocol, content));
    }

    // send binary safety
    __send(binary) {
        if (this.socket.readyState === 1) {
            this.socket.send(binary);
            return true;
        } else {
            return false;
        }
    }

    // ping
    __ping() {
        setTimeout(()=> {if (this.send(10000, [])) this.__ping();}, 30000);
    }

    // protocol handler
    addHandler(protocol, callback) {
        this.handler[protocol] = callback;
    }

    // handle socket message event
    __handle(event) {
        // append incoming data
        this.reader.append(event.data);
        // read packet loop
        while(this.reader.read()) {
            try {
                // protocol dispatch 
                const protocol = this.reader.getProtocol();
                const content = this.reader.getContent();
                const handler = this.handler[protocol];
                if (handler === undefined) {
                    this.__dispatch(protocol, content);
                } else {
                    handler(this, content)
                }
            } catch(error) {
                console.log(error)
            }
        }
    }

    // protocol dispatch
    __dispatch(protocol, content) {
        console.log("protocol: " + protocol + " " + "content: " + JSON.stringify(content));
        switch (protocol) {
            case 10001: {
                // account query
                if (content.list.length == 0) {
                    // create
                    // RoleName, AccountName, ServerId, Sex, Classes, Channel, DeviceId, Mac, DeviceType
                    this.send(10002, [Array.from({length: 6}, () => Math.trunc(Math.random() * 7)).join(""), this.serverId, this.accountName, Math.trunc(Math.random() * 2) + 1, Math.trunc(Math.random() * 6) + 1, "test", "", "", "web."]);
                } else {
                    this.roleId = content.list[0].roleId;
                    this.roleName = content.list[0].roleName;
                    // login
                    this.send(10003, [this.roleId, this.roleName, this.serverId, this.accountName]);
                }
            }break;
            case 10002: {
                // account create
                if (content.result.length === 0) {
                    // login
                    this.roleId = content.roleId;
                    this.roleName = content.roleName;
                    this.send(10003, [this.roleId, this.roleName, this.serverId, this.accountName]);
                } else {
                    console.log("create account failed with: " + content.result);
                }
            }break;
            case 10003: {
                // account login
                if (content.result.length === 0) {
                    this.__ping();
                    // role
                    this.send(10101, []);
                    this.send(10102, []);
                    this.send(10103, []);
                    // item
                    this.send(11101, []);
                    this.send(11102, []);
                    this.send(11103, []);
                    // quest
                    this.send(11201, []);
                    // shop
                    this.send(11301, []);
                    // mail
                    this.send(11401, []);
                    // friend
                    this.send(11501, []);
                    // skill
                    this.send(11701, []);
                    // buff
                    this.send(11801, []);
                    // title
                    this.send(11901, []);

                    // dungeon
                    this.send(17001, []);

                    // map
                    this.send(20001, []);
                    // ok
                    console.log("login ok");
                } else {
                    console.log("login failed with: " + content.result);
                }
            }break;
            case 10101: this.role = content; break;
            case 10102: this.asset = content; break;
            case 10103: this.vip = content; break;

            case 11101: this.item = content; break;
            case 11102: this.bag = content; break;
            case 11103: this.store = content; break;

            case 11201: this.quest = content; break;
            case 11301: this.shop = content; break;
            case 11401: this.mail = content; break;
            case 11501: this.friend = content; break;
            case 11701: this.skill = content; break;
            case 11801: this.buff = content; break;
            case 11901: this.title = content; break;

            case 17001: this.dungeon = content; break;


            case 20003: {
                grid.add(content.list);
            }break;
            case 20004: {
                grid.move(content.list);
            }break;
            case 20005: {
                grid.remove(content.list);
            }break;
            default:break;
        }
    }
}
