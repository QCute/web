
import Encoder from "../protocol/Encoder.js";
import Decoder from "../protocol/Decoder.js";

// BigInt
BigInt.prototype.toJSON = function() { return this.toString(); }

export default class Network {
    static socket = undefined;
    /** @property {Encoder} encoder */
    static encoder = new Encoder();
    /** @property {Decoder} decoder */
    static decoder = new Decoder();

    static handler = {

    };

    /**
     * to url
     * 
     * @param {Object} server the protocol data
     * @return {string}
     */
    static toUrl(server) {
        const protocol = location.protocol.replace("http", "ws");
        return `${protocol}//${server.server_host}:${server.server_port}`;
    }

    static initialize(socket) {
        Network.socket = socket;
    }

    /**
     * Send message
     * 
     * @param {Number} protocol the protocol number
     * @param {Object} data the protocol data
     * @return {boolean}
     */
    static sendMessage(protocol, data) {
        if(!Network.socket) {
            throw new Error('Socket not initialize');
        }

        try {
            const buffer = Network.encoder.encode(protocol, data);
            if (Network.socket.readyState === 1) {
                Network.socket.send(buffer);
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
        Network.decoder.appendData(message);
        // decode packet loop
        while (true) {
            const packet = Network.decoder.decode();
            if (!packet) break;
            console.log(`protocol: ${packet.protocol} data: ${JSON.stringify(packet.data)}`);
            try {
                // protocol handler
                const handlers = Network.handler[packet.protocol] || [];
                for(const handler of handlers) {
                    const result = handler(packet.protocol, packet.data);
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
        const handlers = Network.handler[protocol] || [];
        handlers.unshift(handler);
        Network.handler[protocol] = handlers;
    }

    /**
     * Remove handler
     * 
     * @param {Number} protocol the protocol number
     * @param {Function} handler the protocol handler
     */
    static removeHandler(protocol, handler = undefined) {
        if(handler) {
            Network.handler[protocol] = (Network.handler[protocol] || []).filter(h => h !== handler);
        } else {
            Network.handler[protocol] = Network.handler[protocol] = [];
        }
    }
}
