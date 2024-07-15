
import Encoder from "../protocol/Encoder.js";
import Decoder from "../protocol/Decoder.js";

export default class Socket {
    static socket = undefined;
    /** @property {Encoder} encoder */
    static encoder = undefined;
    /** @property {Decoder} decoder */
    static decoder = undefined;

    static handler = {
        "10000": [
            Account.instance().onQuery
        ],
        "10001": [
            Account.instance().onCreate
        ],
    };

    constructor(socket) {
        Socket.socket = socket;
        Socket.encoder = new Encoder();
        Socket.decoder = new Decoder();
    }

    /**
     * Send message
     * 
     * @param {Number} protocol the protocol number
     * @param {Object} data the protocol data
     * @return {boolean}
     */
    static sendMessage(protocol, data) {
        if(!Socket.socket) {
            throw new Error('Socket not initialize');
        }

        try {
            const buffer = Socket.encoder.encode(protocol, data);
            if (Socket.socket.readyState === 1) {
                Socket.socket.send(buffer);
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
     * @param {ArrayBuffer} message the WebSocket message ArrayBuffer
     */
    static onMessage(message) {
        Socket.decoder.appendData(message);
        // decode packet loop
        while (true) {
            const packet = Socket.decoder.decode();
            if (!packet) break;
            try {
                // protocol handler
                const handlers = Socket.handler[packet.protocol] || [];
                for(const handler of handlers) {
                    const result = handler(packet.protocol, packet.content);
                    // stop
                    if(result) {
                        break;
                    }
                }
            } catch (error) {
                console.error(error)
            }
        }
    }

    /**
     * Add handler
     * 
     * @param {Number} protocol the protocol number
     * @param {Function} handler the protocol handler
     */
    static addHandler(protocol, handler) {
        Socket.handler[protocol].unshift(handler);
    }

    /**
     * Remove handler
     * 
     * @param {Number} protocol the protocol number
     * @param {Function} handler the protocol handler
     */
    static removeHandler(protocol, handler = undefined) {
        if(handler) {
            Socket.handler[protocol] = Socket.handler[protocol].filter(h => h !== handler);
        } else {
            Socket.handler[protocol] = Socket.handler[protocol] = [];
        }
    }
}
