
import Panel from "./Panel.js";
import Grid from "./Grid.js";
import Network from "./Network.js";

export default class App {

    /**
     * 
     * @param {Element} panel the protocol number
     * @param {Element} grid the protocol number
     */
    constructor(panel, grid) {

        // login handler
        Network.addHandler(10003, this.dispatch.bind(this));
        // ui
        this.panel = new Panel(panel);
        this.panel.load();

        this.grid = new Grid(grid, 10);
        grid.addEventListener('click', this.move.bind(this));
    }

    // grid method
    move(event) {
        const x = event.offsetX
        const y = event.offsetY;
        const object = { id: this.role.roleId, x: this.grid.correct(x), y: this.grid.correct(y) };
        Network.sendMessage(20012, { x: object.x, y: object.y });
        this.grid.move(object);
    }

    attack(skillId, targetIdList) {
        Network.sendMessage(20014, { skillId: skillId, targetIdList: targetIdList });
    }

    // protocol dispatch
    dispatch(protocol, data) {
        switch (protocol) {
            case 10003: {
                // account login
                if (data.length === 0) {
                    // role
                    Network.sendMessage(10101, {});
                    Network.sendMessage(10102, {});
                    Network.sendMessage(10103, {});
                    // item
                    Network.sendMessage(11101, {});
                    Network.sendMessage(11102, {});
                    Network.sendMessage(11103, {});
                    // quest
                    Network.sendMessage(11201, {});
                    // shop
                    Network.sendMessage(11301, {});
                    // mail
                    Network.sendMessage(11401, {});
                    // friend
                    Network.sendMessage(11501, {});
                    // skill
                    Network.sendMessage(11701, {});
                    Network.sendMessage(11702, 1);
                    // buff
                    Network.sendMessage(11801, {});
                    // title
                    Network.sendMessage(11901, {});

                    // dungeon
                    Network.sendMessage(17001, {});

                    // map
                    Network.sendMessage(20001, {});

                    // grid
                    this.grid.load();

                    Network.addHandler(10101, this.dispatch.bind(this));
                    // map
                    Network.addHandler(20011, this.dispatch.bind(this));
                    Network.addHandler(20012, this.dispatch.bind(this));
                    Network.addHandler(20013, this.dispatch.bind(this));
                    Network.addHandler(20014, this.dispatch.bind(this));
                    Network.addHandler(20021, this.dispatch.bind(this));
                    Network.addHandler(20022, this.dispatch.bind(this));

                    // ok
                    console.log("login: ok");
                } else {
                    console.log("login failed with: " + JSON.stringify(data));
                }
            } break;
            case 10101: this.role = data; break;
            case 10102: this.asset = data; break;
            case 10103: this.vip = data; break;

            case 11101: this.item = data; break;
            case 11102: this.bag = data; break;
            case 11103: this.store = data; break;

            case 11201: this.quest = data; break;
            case 11301: this.shop = data; break;
            case 11401: this.mail = data; break;
            case 11501: this.friend = data; break;
            case 11701: this.skill = data; break;
            case 11801: this.buff = data; break;
            case 11901: this.title = data; break;

            case 17001: this.dungeon = data; break;


            // fighter
            case 20011: {
                this.grid.add(data.list);
            } break;
            case 20012: {
                this.grid.move(data);
            } break;
            case 20013: {
                this.grid.remove(data);
            } break;
            case 20014: {
                this.grid.add(data.list);
            } break;

            // drop
            case 20021: {
                this.grid.addDrop(data.list);
            } break;
            case 20022: {
                this.grid.removeDrop(data.drop_id);
            } break;
            default: break;
        }
    }
}
