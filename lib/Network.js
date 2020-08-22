
import Encoder from "../js/Encoder.js";
import Decoder from "../js/Decoder.js";

// BigInt
BigInt.prototype.toJSON = function() { return this.toString(); }

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
     * @return {Promise<WebSocket>}
     */
    static async connect(server) {
        const socket = new WebSocket(Network.toUrl(server));
        socket.binaryType = 'arraybuffer';
        Network.initialize(socket);
        Network.heartbeat();
        socket.onmessage = Network.onMessage;
        return new Promise((resolve, reject) => {
            socket.onopen = resolve;
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

    // ping
    static heartbeat() {
        setTimeout(() => { 
            if (Network.sendMessage(10000, {})) {
                Network.heartbeat();
            }
        }, 30 * 1000);
    }

    /**
     * Send message
     * 
     * @param {number} protocol the protocol number
     * @param {boolean|number|string|object} data the protocol data
     * @param {(number, object) => void} handler the handler
     * @return {boolean}
     */
    static sendMessage(protocol, data, handler = undefined) {
        if(!Network.socket) {
            throw new Error('Socket not initialize');
        }

        try {
            const buffer = Network.encoder.encode(protocol, data);
            if (Network.socket.readyState === 1) {

                Network.socket.send(buffer);

                if(Network.debug && protocol !== 10000) {
                    console.log(`send protocol: `, protocol, ` data: `, data);
                }

                Network.once(protocol, handler);
                return true;
            } else {
                return false;
            }
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
    static onMessage(event) {
        Network.decoder.appendData(event.data);
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
     * @param {(protocol: number, data: boolean|number|string|object) => void} handler the protocol handler
     */
    static once(protocol, handler) {
        if (!handler) return;
        const handlers = Network.onceHandler[protocol] || [];
        handlers.unshift(handler);
        Network.onceHandler[protocol] = handlers;
    }

    /**
     * Add handler
     * 
     * @param {number} protocol the protocol number
     * @param {(protocol: number, data: boolean|number|string|object) => void} handler the protocol handler
     */
    static on(protocol, handler) {
        if (!handler) return;
        const handlers = Network.handler[protocol] || [];
        handlers.unshift(handler);
        Network.handler[protocol] = handlers;
    }

    /**
     * Remove handler
     * 
     * @param {number} protocol the protocol number
     * @param {(protocol: number, data: boolean|number|string|object) => void} handler the protocol handler
     */
    static off(protocol, handler = undefined) {
        if(!handler) return;
        Network.handler[protocol] = (Network.handler[protocol] || []).filter(h => h !== handler);
    }
}
