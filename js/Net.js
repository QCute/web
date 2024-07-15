
import Encoder from "../protocol/Encoder.js";
import Decoder from "../protocol/Decoder.js";
// import Encoder from "../../server/script/make/protocol/js/Encoder.js";
// import Decoder from "../../server/script/make/protocol/js/Decoder.js";

import Grid from "./Grid.js";

export default class Net {

    constructor(account, servers, gridId, gridSize) {
        // BigInt
        BigInt.prototype.toJSON = function() { return this.toString(); }
        // server list
        this.servers = servers;
        // role
        this.accountName = account;
        // protocol handler
        this.handler = {};
        // byte encoder
        this.encoder = new Encoder();
        // byte decoder
        this.decoder = new Decoder();
        // grid
        this.gridId = gridId || "map";
        this.gridSize = gridSize || 10;
    }

    toUrl(host, port) {
        return host.replace("http", "ws") + ":" + port + "/";
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
        this.socket = new WebSocket(this.toUrl(server.server_host, server.server_port));
        this.socket.binaryType = "arraybuffer";
        // connect query account
        this.socket.onopen = (event) => {
            console.log(event);
            this.__open(event);
        };
        this.socket.onclose = (event) => {
            console.log(event);
            if (this.closeHandler) 
                this.closeHandler(event);
        };
        this.socket.onmessage = (event) => {
            this.__handle(event);
        }
    }

    close() {
        this.socket.close();
    }

    getState() {
        return this.socket.readyState;
    }

    __test_fast() {
        for (let i = 0; i < 1000000; i++) {
            if (!this.send(10001, {serverId: this.serverId, accountName: this.accountName})) break;
        }
    }

    __test_slow(array) {
        setTimeout(() => { if (this.__send(new Uint8Array([array.shift()]))) if (array.length > 0) this.__test_slow(array); }, 1000);
    }

    // send protocol
    send(protocol, data) {
        try {
            const buffer = new Encoder().encode(protocol, data);
            return this.__send(buffer);
        } catch (e) {
            console.error(e);
            return false;
        }
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
        setTimeout(() => { 
            if (this.send(10000, {})) 
                this.__ping();
        }, 30000);
    }

    // protocol handler
    addHandler(protocol, callback) {
        this.handler[protocol] = callback;
    }

    removeHandler(protocol) {
        delete this.handler[protocol];
    }

    __open(event) {
        this.send(10001, {serverId: this.serverId, accountName: this.accountName});
    }

    // handle socket message event
    __handle(event) {
        this.decoder.appendData(event.data);
        // decode packet loop
        while (true) {
            const packet = this.decoder.decode();
            if (!packet) break;
            try {
                // protocol dispatch 
                const handler = this.handler[packet.protocol];
                this.__dispatch(packet.protocol, packet.content);
                if (handler !== undefined) {
                    handler(packet.protocol, packet.content)
                }
            } catch (error) {
                console.error(error)
            }
        }
    }

    // protocol dispatch
    __dispatch(protocol, content) {
        console.log("protocol: " + protocol + " " + "content: " + JSON.stringify(content));
        switch (protocol) {
            case 10001: {
                // account query
                if (content.result.length == 0 && content.list.length == 0) {
                    // create
                    // RoleName, AccountName, ServerId, Sex, Classes, Channel, DeviceId, Mac, DeviceType
                    const roleName = Array.from({ length: 6 }, () => Math.trunc(Math.random() * 7)).join("");
                    const sex = Math.trunc(Math.random() * 2) + 1;
                    const classes = Math.trunc(Math.random() * 6) + 1;
                    this.send(10002, { roleName: roleName, serverId: this.serverId, accountName: this.accountName, sex: sex, classes: classes, channel: "test", deviceId: "", mac: "", deviceType: "web." });
                } else if (content.result.length == 0) {
                    this.roleId = content.list[0].roleId;
                    this.roleName = content.list[0].roleName;
                    // login
                    this.send(10003, { roleId: this.roleId, roleName: this.roleName, serverId: this.serverId, accountName: this.accountName });
                } else {
                    console.log(content.result);
                }
            } break;
            case 10002: {
                // account create
                if (content.result.length === 0) {
                    // login
                    this.roleId = content.roleId;
                    this.roleName = content.roleName;
                    this.send(10003, { roleId: this.roleId, roleName: this.roleName, serverId: this.serverId, accountName: this.accountName });
                } else {
                    console.log("create account failed with: " + content.result);
                }
            } break;
            case 10003: {
                // account login
                if (content.result.length === 0) {
                    this.__ping();
                    // role
                    this.send(10101, {});
                    this.send(10102, {});
                    this.send(10103, {});
                    // item
                    this.send(11101, {});
                    this.send(11102, {});
                    this.send(11103, {});
                    // quest
                    this.send(11201, {});
                    // shop
                    this.send(11301, {});
                    // mail
                    this.send(11401, {});
                    // friend
                    this.send(11501, {});
                    // skill
                    this.send(11701, {});
                    this.send(11702, { skillId: 1 });
                    // buff
                    this.send(11801, {});
                    // title
                    this.send(11901, {});

                    // dungeon
                    this.send(17001, {});

                    // map
                    this.send(20011, {});
                    // view
                    this.grid = new Grid(this.gridId, this.gridSize);

                    // ok
                    console.log("login ok");
                } else {
                    alert(content.result);
                    console.log("login failed with: " + content.result);
                }
            } break;
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


            // fighter
            case 20011: {
                this.grid.add(content.list);
            } break;
            case 20012: {
                this.grid.move(content);
            } break;
            case 20013: {
                this.grid.remove(content);
            } break;
            case 20014: {
                this.grid.add(content.list);
            } break;

            // drop
            case 20021: {
                this.grid.addDrop(content.list);
            } break;
            case 20022: {
                this.grid.removeDrop(content.drop_id);
            } break;
            default: break;
        }
    }

    // grid method
    move(x, y) {
        const object = { id: this.role.roleId, x: this.grid.correct(x), y: this.grid.correct(y) };
        this.send(20012, { x: object.x, y: object.y });
        this.grid.move(object);
    }

    attack(skillId, targetIdList) {
        this.send(20014, { skillId: skillId, targetIdList: targetIdList });
    }
}
