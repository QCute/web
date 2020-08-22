
import Network from "./Network.js";

export default class Panel {

    /**
     * 
     * @param {Element} panel the protocol number
     */
    constructor(panel) {
        this.panel = panel;
        this.server = {};
        this.servers = [];
        // event
        this.panel.querySelector('#request').addEventListener('click', this.load.bind(this));
        this.panel.querySelector('#login').addEventListener('click', this.login.bind(this));
        this.panel.querySelector('#send').addEventListener('click', send);
    }

    async load() {
        const address = this.panel.querySelector("#address").value;
        const { data } = await axios({ 'url': address });
        // setup server list
        this.servers = data;
        const text = this.servers.map(s => `<option value="${s.server_name}">${s.server_name}</option>`);
        this.panel.querySelector("#server").innerHTML = text;
    }

    // connect
    async connect() {
        if (this.servers.length == 0) {
            return alert('empty server');
        }

        this.accountName = this.panel.querySelector("#account").value;
        const name = this.panel.querySelector("#server").value;
        this.server = this.servers.find(server => server.server_name == name || server.name == name);

        // network
        const url = Network.toUrl(this.server);
        const socket = new WebSocket(url);
        socket.binaryType = 'arraybuffer';
        Network.initialize(socket);
        
        // wait for open
        socket.onmessage = ({ data }) => Network.onMessage(data);
        return new Promise(resolve => { socket.onopen = resolve; });
    }

    // ping
    heartbeat() {
        setTimeout(() => { 
            if (Network.sendMessage(10000, {})) {
                this.heartbeat();
            }
        }, 30 * 1000);
    }

    async login() {
        await this.connect();
        this.heartbeat();

        const serverId = this.server.server_id;
        const accountName = this.panel.querySelector("#account").value;

        // login
        Network.addHandler(10001, this.onAccountQuery.bind(this));
        Network.sendMessage(10001, {serverId, accountName});
    }

    onAccountQuery(protocol, data) {
        // account query
        if (data.result.length == 0 && data.list.length == 0) {
            // create
            // RoleName, AccountName, ServerId, Sex, Classes, Channel, DeviceId, Mac, DeviceType
            const roleName = Array.from({ length: 6 }, () => Math.trunc(Math.random() * 7)).join("");
            const sex = Math.trunc(Math.random() * 2) + 1;
            const classes = Math.trunc(Math.random() * 6) + 1;
            // handle create
            Network.addHandler(10002, this.onAccountCreate.bind(this));
            Network.sendMessage(10002, { 
                roleName: roleName, 
                serverId: this.server.server_id, 
                accountName: this.accountName, 
                sex: sex, 
                classes: classes, 
                channel: "test", 
                deviceId: "", 
                mac: "", 
                deviceType: "web." 
            });
        } else if (data.result.length == 0) {
            this.roleId = data.list[0].roleId;
            this.roleName = data.list[0].roleName;
            // login, handle in app
            Network.sendMessage(10003, { roleId: this.roleId, roleName: this.roleName, serverId: this.server.server_id, accountName: this.accountName });
        } else {
            console.log(data.result);
        }
    }

    onAccountCreate(protocol, data) {
          // account create
          if (data.result.length === 0) {
            // login, handle in app
            this.roleId = data.roleId;
            this.roleName = data.roleName;
            Network.sendMessage(10003, { roleId: this.roleId, roleName: this.roleName, serverId: this.server.server_id, accountName: this.accountName });
        } else {
            console.log("create account failed with: " + data.result);
        }
    }

    send() {
        const protocol = this.panel.querySelector("#protocol").value;
        const data = JSON.parse(this.panel.querySelector("#data").value);
        const handler = () => {
            document.getElementById("result").value += JSON.stringify(data) + '\n';
            Network.removeHandler(protocol, handler);
            return true;
        };
        Network.addHandler(protocol, handler);
        Network.sendMessage(protocol, data);
    }
}
