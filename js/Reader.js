
"use strict";

class Reader{

    constructor(){
        this.data = [];
        this.protocol = 0;
        this.content = {};
    }

    append(binary) {
        // append
        this.data.reverse();
        this.data.push(... Array.from(new Uint8Array(binary)));
        this.data.reverse();
    }

    getProtocol() {
        return this.protocol;
    }

    getContent() {
        return this.content;
    }

    read() {
        if (this.data.length === 0) return false;
        // read header
        const length = this.data.pop() * 256 + this.data.pop();
        this.protocol = this.data.pop() * 256 + this.data.pop();
        // read content
        const packet = this.data.splice(0, length);
        const meta = getProtocolDefine("read", this.protocol);
        this.content = this.__read(meta, packet).content;
        return true;
    }

    __read(meta, data) {
        let content = {};
        for (let m = 0; m < meta.length; ++m) {
            switch (meta[m]["type"]) {
                case "u8": {
                    content[meta[m]["name"]] = data.pop();
                }break;
                case "u16": {
                    content[meta[m]["name"]] = data.pop() * 256 + data.pop();
                }break;
                case "u32": {
                    content[meta[m]["name"]] = data.pop() * 16777216 + data.pop() * 65536 + data.pop() * 256 + data.pop();
                }break;
                case "u64": {
                    content[meta[m]["name"]] = data.pop() * 72057594037927940 + data.pop() * 281474976710656 + data.pop() * 1099511627776 + data.pop() * 4294967296 + data.pop() * 16777216 + data.pop() * 65536 + data.pop() * 256 + data.pop();
                }break;
                case "bool": {
                    if (data.pop() === 1) {
                        content[meta[m]["name"]] = true;
                    } else {
                        content[meta[m]["name"]] = false;
                    }
                }break;
                case "bst":
                case "rst":
                case "str": {
                    let encoded = "";
                    const length = data.pop() * 256 + data.pop();
                    for (let i = 0; i < length; i++) {
                        encoded += '%' + data.pop().toString(16);
                    }
                    content[meta[m]["name"]] = decodeURIComponent(encoded);
                }break;
                case "list": {
                    let list = [];
                    const length = data.pop() * 256 + data.pop();
                    for (let i = 0; i < length; i++) {
                        let result = this.__read(meta[m]["explain"], data);
                        data = result.data;
                        list.push(result.content);
                    }
                    content[meta[m]["name"]] = list;
                }break;
                default:throw("unknown meta type: " + meta[m]["type"])
            }
        }
        return {content: content, data: data};
    }
}
