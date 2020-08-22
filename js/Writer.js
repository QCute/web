
"use strict";

class Writer {

    write(protocol, data) {
        // write binary
        const meta = getProtocolDefine("write", protocol);
        let bytes = this.__write(meta, data);
        // packet buffer
        let buffer = [];
        // packet length
        buffer.push(bytes.length / 256);
        buffer.push(bytes.length);
        // protocol
        buffer.push(protocol / 256);
        buffer.push(protocol);
        // content
        buffer.push(...bytes);
        // unsigned integer array
        return new Uint8Array(buffer);
    }

    __write(meta, data) {
        let bytes = [];
        if (! (data instanceof Array)) throw("unknown array data: " + JSON.stringify(data));
        data.reverse();
        for (let x = 0; x < meta.length; ++x) {
            switch (meta[x]["type"]) {
                case "u8": {
                    const number = data.pop();
                    if (number === undefined) throw("empty field: " + meta[x]["name"]);
                    bytes.push(number);
                }break;
                case "u16": {
                    const number = data.pop();
                    if (number === undefined) throw("empty field: " + meta[x]["name"]);
                    bytes.push(number / 256);
                    bytes.push(number);
                }break;
                case "u32": {
                    const number = data.pop();
                    if (number === undefined) throw("empty field: " + meta[x]["name"]);
                    bytes.push(number / 16777216);
                    bytes.push(number / 65536);
                    bytes.push(number / 256);
                    bytes.push(number);
                }break;
                case "u64": {
                    const number = data.pop();
                    if (number === undefined) throw("empty field: " + meta[x]["name"]);
                    bytes.push(number / 72057594037927940);
                    bytes.push(number / 281474976710656);
                    bytes.push(number / 1099511627776);
                    bytes.push(number / 4294967296);
                    bytes.push(number / 16777216);
                    bytes.push(number / 65536);
                    bytes.push(number / 256);
                    bytes.push(number);
                }break;
                case "bool": {
                    if (data.pop()) {
                        bytes.push(1);
                    } else {
                        bytes.push(0);
                    }
                };break;
                case "bst":
                case "str": {
                    let string = data.pop();
                    if (string === undefined) throw("empty field: " + meta[x]["name"]);
                    string = encodeURIComponent(string);
                    let buffer = [];
                    for (let i = 0; i < string.length; i++) {
                        const char = string.charAt(i);
                        if (char === '%') {
                            let number = parseInt(string.charAt(++i) + string.charAt(++i), 16);
                            if (number < 256) {
                                buffer.push(number);
                            } else {
                                buffer.push(number / 256);
                                buffer.push(number);
                            }
                        } else {
                            buffer.push(char.charCodeAt(0));
                        }
                    }
                    // string length
                    bytes.push(buffer.length / 256);
                    bytes.push(buffer.length);
                    // string utf encode
                    bytes.push(...buffer);
                }break;
                case "list": {
                    const list = data.pop();
                    if (list === undefined) throw("empty field: " + meta[x]["name"]);
                    // list length
                    bytes.push(list.length / 256);
                    bytes.push(list.length);
                    const explain = meta[x]["explain"];
                    // pack list 
                    for (let i = 0; i < list.length; ++i) {
                        bytes.push(...this.__write(explain, list[i]));
                    }
                }break;
                default:throw("unknown type: " + meta[x]["type"]);
            }
        }
        return bytes;
    }

}

