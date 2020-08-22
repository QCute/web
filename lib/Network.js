
import Encoder from "../js/Encoder.js";
import Decoder from "../js/Decoder.js";

// BigInt
BigInt.prototype.toJSON = function() { return this.toString(); }

if(typeof TextEncoder === 'undefined') {
    globalThis.TextEncoder = function () {};
    globalThis.TextEncoder.prototype.encode = function (string) {
        // 预估数组大小以避免多次 re-allocation
        let len = string.length;
        let out = new Uint8Array(len * 3); // 最坏情况：每个字符3个字节
        let p = 0;

        for (let i = 0; i < len; i++) {
            let c = string.charCodeAt(i);
            if (c < 0x80) { // 1个字节
                out[p++] = c;
            } else if (c < 0x800) { // 2个字节
                out[p++] = (c >> 6) | 0xC0;
                out[p++] = (c & 0x3F) | 0x80;
            } else { // 3个字节
                out[p++] = (c >> 12) | 0xE0;
                out[p++] = ((c >> 6) & 0x3F) | 0x80;
                out[p++] = (c & 0x3F) | 0x80;
            }
        }

        return out.subarray(0, p);
    };
}

if(typeof TextDecoder === 'undefined') {
    globalThis.TextDecoder = function () {};
    globalThis.TextDecoder.prototype.decode = function (bytes) {
        let out = [];
        let i = 0;
        let len = bytes.length;
        let c;
        let char2, char3;

        while (i < len) {
            c = bytes[i++];
            switch (c >> 4) {
                case 0:
                case 1:
                case 2:
                case 3:
                case 4:
                case 5:
                case 6:
                case 7:
                    // 0xxxxxxx
                    out.push(String.fromCharCode(c));
                    break;
                case 12:
                case 13:
                    // 110x xxxx   10xx xxxx
                    char2 = bytes[i++];
                    out.push(String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F)));
                    break;
                case 14:
                    // 1110 xxxx  10xx xxxx  10xx xxxx
                    char2 = bytes[i++];
                    char3 = bytes[i++];
                    out.push(String.fromCharCode(((c & 0x0F) << 12) |
                        ((char2 & 0x3F) << 6) |
                        ((char3 & 0x3F) << 0)));
                    break;
                default:
                    // 10xx xxxx 或 1111 xxxx
                    // 非法 UTF-8 序列，不处理或跳过
                    break;
            }
        }
        return out.join('');
    };
}

export default class Network {
    /** @type {WebSocket} socket */
    static socket = undefined;

    /** @type {Encoder} encoder */
    static encoder = new Encoder();

    /** @type {Decoder} decoder */
    static decoder = new Decoder();

    /** @type {{ [key: number]: Array<(protocol: number, data: boolean|number|string|object) => void> }} handler */
    static handler = {};

    /** @type {{ [key: number]: Array<(protocol: number, data: boolean|number|string|object) => void> }} onceHandler */
    static onceHandler = {};

    /** @type {{ channel_id: number; channel_name: string; server_id: number; server_name: string; server_protocol: string; server_host: string; server_port: number; }} timer */
    static server = undefined;

    /** @type {number} timer */
    static timer = 0;

    /** @type {(input: ArrayBuffer) => Promise<ArrayBuffer>} decompress */
    static decompress = async (input) => input;

    /** @type {() => void} close */
    static close = undefined;

    /** @type {boolean} debug */
    static debug = false;

    /**
     * load
     * 
     * @param {string} url the api url
     * @param {string} channel the channel
     * @return {Promise<{ channel_id: number; channel_name: string; server_id: number; server_name: string; server_protocol: string; server_host: string; server_port: number; }>}
     */
    static async load(url, channel) {
        const xhr = new XMLHttpRequest();
        xhr.timeout = 60 * 1000;

        const query = { channel };
        const param = Object.keys(query).map(key => `${key}=${query[key]}`).join('&');

        return new Promise((resolve, reject) => {
            xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve(JSON.parse(xhr.responseText)): reject(xhr);
            xhr.open("GET", `${url}?${param}`, true);
            xhr.send();
        });
    }

    /**
     * to url
     * 
     * @param {{ channel_id: number; channel_name: string; server_id: number; server_name: string; server_protocol: string; server_host: string; server_port: number; }} server the server data
     * @return {string}
     */
    static toUrl(server) {
        const protocol = server.server_protocol.replace("http", "ws");
        return `${protocol}://${server.server_host}:${server.server_port}`;
    }

    /**
     * connect to server
     * 
     * @param {{ channel_id: number; channel_name: string; server_id: number; server_name: string; server_protocol: string; server_host: string; server_port: number; }} server the server data
     * @param {(event: Event) => void} close the close handler
     * @return {Promise<Event>}
     */
    static async connect(server, close = undefined) {
        Network.server = server;
        Network.close = close;
        const socket = new WebSocket(Network.toUrl(server));
        socket.binaryType = 'arraybuffer';
        return new Promise((resolve, reject) => {
            socket.onopen = (openEvent) => {
                Network.initialize(socket);
                Network.heartbeat();
                socket.onmessage = Network.onMessage;
                socket.onclose = (closeEvent) => { 
                    Network.onClose(closeEvent);
                    close(closeEvent);
                }
                resolve(openEvent);
            };
            socket.onerror = reject;
        });
    }

    /**
     * initialize
     * 
     * @param {WebSocket} socket the web socket
     */
    static initialize(socket) {
        Network.socket = socket;
    }

    // ping - pong
    static heartbeat() {
        clearTimeout(Network.timer);
        Network.timer = setTimeout(() => { 
            if(!Network.timer) return;

            if (Network.sendMessage(10000, {})) {
                Network.heartbeat();
            }
        }, 35 * 1000);
    }

    /**
     * on socket close
     * 
     * @param {Event} event the close handler
     */
    static onClose(event) {
        clearTimeout(Network.timer);
        Network.timer = 0;
        Network.socket = undefined;
    }

    /**
     * Send message
     * 
     * @param {number} protocol the protocol number
     * @param {boolean|number|string|object|Array<boolean|number|string|object>} data the protocol data
     * @param {(protocol: number, data: boolean|number|string|object|Array<boolean|number|string|object>) => void} handler the handler
     * @return {boolean}
     */
    static sendMessage(protocol, data, handler = undefined) {
        if(!Network.socket) {
            throw new Error('Socket not initialize');
        }

        if (Network.socket.readyState !== 1) {
            throw new Error('Socket not connected');
        }

        try {
            const buffer = Network.encoder.encode(protocol, data);

            Network.socket.send(buffer);

            Network.once(protocol, handler);

            if(Network.debug && protocol !== 10000) {
                console.log(`send protocol: `, protocol, ` data: `, data);
            }
            
            return true;
        } catch (error) {
            console.error(error);
            return false;
        }
    }

    /**
     * On message
     * 
     * @param {MessageEvent} event the WebSocket message event
     */
    static async onMessage(event) {
        Network.decoder.appendData(await Network.decompress(event.data));
        // decode packet loop
        while (true) {
            const packet = Network.decoder.decode();
            if (!packet) break;

            if(Network.debug && packet.protocol !== 10000) {
                console.log(`receive protocol: `, packet.protocol, ` data: `, packet.data);
            }

            try {

                // protocol handler
                const handlers = Network.handler[packet.protocol] || [];

                for(const handler of handlers) {
                    handler(packet.protocol, packet.data);
                }

                const onceHandlers = Network.onceHandler[packet.protocol] || [];
                Network.onceHandler[packet.protocol] = [];
                for(const handler of onceHandlers) {
                    handler(packet.protocol, packet.data);
                }

            } catch (error) {
                console.error(error)
            }
        }
    }

    /**
     * Add handler
     * 
     * @param {number} protocol the protocol number
     * @param {(protocol: number, data: unknown) => void} handler the protocol handler
     */
    static once(protocol, handler) {
        if (!handler) return;
        let handlers = Network.onceHandler[protocol] || [];
        handlers.unshift(handler);
        handlers = handlers.filter((value, index, array) => array.indexOf(value, 0) === index);
        Network.onceHandler[protocol] = handlers;
    }

    /**
     * Add handler
     * 
     * @param {number} protocol the protocol number
     * @param {(protocol: number, data: unknown) => void} handler the protocol handler
     * @returns {(protocol: number, data: unknown) => void} handler the protocol handler
     */
    static on(protocol, handler) {
        if (!handler) return;
        let handlers = Network.handler[protocol] || [];
        handlers.unshift(handler);
        handlers = handlers.filter((value, index, array) => array.indexOf(value, 0) === index);
        Network.handler[protocol] = handlers;
        return handler;
    }

    /**
     * Remove handler
     * 
     * @param {number} protocol the protocol number
     * @param {(protocol: number, data: boolean|number|object|string|Array<boolean|number|string|object>) => void} handler the protocol handler
     */
    static off(protocol = 0, handler = undefined) {
        if(!protocol) {
            Network.handler = {};
            Network.onceHandler = {};
        }
        if(!handler) {
            Network.handler[protocol] = [];
            Network.onceHandler[protocol] = [];
        }
        {
            const handlers = Network.handler[protocol] || [];
            Network.handler[protocol] = handlers.filter(h => h !== handler);
        }
        {
            const handlers = Network.onceHandler[protocol] || [];
            Network.onceHandler[protocol] = handlers.filter(h => h !== handler);
        }
    }
}
