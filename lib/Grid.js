
// canvas grid

export default class Grid {
    // view
    size = 10;
    canvas = {};
    context = {};
    cacheCanvas = {};

    // data
    fighter = {};
    drop = {};
    path = [];

    constructor(canvas, size) {
        if (size <= 1) throw ("invalid size");
        this.size = size;
        // canvas
        this.canvas = canvas;
        this.context = this.canvas.getContext("2d");
        this.canvas.width = document.body.clientWidth;
        this.canvas.height = document.body.clientHeight;
        // cache canvas
        this.cacheCanvas = document.createElement("canvas");
        this.cacheCanvas.width = document.body.clientWidth;
        this.cacheCanvas.height = document.body.clientHeight;
        // resize
        new ResizeObserver(() => this.load()).observe(canvas);
    }

    load() {
        // canvas
        this.canvas.width = document.body.clientWidth;
        this.canvas.height = document.body.clientHeight;
        // cache
        this.cacheCanvas.width = document.body.clientWidth;
        this.cacheCanvas.height = document.body.clientHeight;
        // draw grid on cache canvas
        this.drawGrid();
        // clear canvas and draw cache canvas on canvas
        this.refresh();
    }

    // grid format
    format(i) {
        return (i - 1) * this.size + 1;
    }

    // grid correct
    correct(i) {
        return Math.floor((i + this.size) / this.size);
    }

    // add object
    add(object) {
        if (object instanceof Array) {
            object.forEach(fighter => this.fighter[fighter.id] = fighter);
        } else {
            this.fighter[object.id] = object;
        }
        this.show();
    }

    // move object
    move(object) {
        if (object instanceof Array) {
            object.forEach(fighter => {
                this.fighter[fighter.id]["x"] = fighter.x;
                this.fighter[fighter.id]["y"] = fighter.y;
            });
        } else {
            this.fighter[object.id]["x"] = object.x;
            this.fighter[object.id]["y"] = object.y;
        }
        this.show();
    }

    // remove object
    remove(object) {
        if (object instanceof Array) {
            object.forEach(fighter => {
                delete this.fighter[fighter.id];
            });
        } else {
            delete this.fighter[object.id];
        }
        this.show();
    }

    addPath(x, y) {
        this.path.push({ x: this.format(x), y: this.format(y) });
    }

    addDrop(object) {
        if (object instanceof Array) {
            object.forEach(drop => this.drop[drop.dropId] = drop);
        } else {
            this.drop[object.id] = object;
        }
        this.show();
    }

    removeDrop(object) {
        if (object instanceof Array) {
            object.forEach(drop => {
                delete this.drop[drop.dropId];
            });
        } else {
            delete this.drop[object.dropId];
        }
        this.show();
    }

    // show path/point
    show() {
        this.drawGrid();
        // fighter
        for (let key in this.fighter) {
            const hp = this.fighter[key].hp;
            const health = this.fighter[key].health;
            switch (this.fighter[key].type) {
                case 1:
                    this.drawPoint(this.fighter[key].id, this.fighter[key].x, this.fighter[key].y, health == 0 ? 0 : hp / health, "#00FF00");
                    break;
                case 2:
                    this.drawPoint(this.fighter[key].id, this.fighter[key].x, this.fighter[key].y, health == 0 ? 0 : hp / health, "#FF0000");
                    break;
                case 3:
                    this.drawPoint(this.fighter[key].id, this.fighter[key].x, this.fighter[key].y, health == 0 ? 0 : hp / health, "#0000FF");
                    break;
                case 4:
                    this.drawPoint(this.fighter[key].id, this.fighter[key].x, this.fighter[key].y, health == 0 ? 0 : hp / health, "#FF00FF");
                    break;
                default:
                    this.drawPoint(this.fighter[key].id, this.fighter[key].x, this.fighter[key].y, health == 0 ? 0 : hp / health, "#000000");
            }
        }
        // drop
        for (let key in this.drop) {
            switch (this.drop[key].type) {
                case 1:
                    this.drawArc(this.drop[key].id, this.drop[key].x, this.drop[key].y, "#00FF00");
                    break;
                case 2:
                    this.drawArc(this.drop[key].id, this.drop[key].x, this.drop[key].y, "#FF0000");
                    break;
                case 3:
                    this.drawArc(this.drop[key].id, this.drop[key].x, this.drop[key].y, "#0000FF");
                    break;
                case 4:
                    this.drawArc(this.drop[key].id, this.drop[key].x, this.drop[key].y, "#FF00FF");
                    break;
                default:
                    this.drawArc(this.drop[key].id, this.drop[key].x, this.drop[key].y, "#000000");
            }
        }
        this.refresh();
    }

    // point
    drawPoint(id, x, y, hp, color) {
        let cacheContext = this.cacheCanvas.getContext("2d");
        if (hp > 0) {
            cacheContext.fillStyle = color;
            const delta = Math.floor(this.size * (1 - hp));
            cacheContext.fillRect(this.format(x), this.format(y) + delta, this.size - 1, this.size - 1 - delta);
        } else {
            cacheContext.fillStyle = "#000000";
            cacheContext.beginPath();
            cacheContext.moveTo(this.format(x), this.format(y));
            cacheContext.lineTo(this.format(x) + this.size, this.format(y) + this.size);
            cacheContext.stroke();
            cacheContext.beginPath();
            cacheContext.moveTo(this.format(x), this.format(y) + this.size);
            cacheContext.lineTo(this.format(x) + this.size, this.format(y));
            cacheContext.stroke();
        }
        cacheContext.fillText(id, this.format(x), this.format(y));
        cacheContext.restore();
    }

    drawArc(id, x, y, color) {
        let cacheContext = this.cacheCanvas.getContext("2d");
        cacheContext.fillStyle = color;
        cacheContext.arc(x, y, this.size, 0, 2 * Math.PI);
        cacheContext.fillText(id, this.format(x), this.format(y));
        cacheContext.restore();
    }

    // path 
    drawPath() {
        let cacheContext = this.cacheCanvas.getContext("2d");
        cacheContext.fillStyle = "#FF0000";
        for (let i = 0; i < this.path.length; i++) {
            this.drawPoint(this.path[i].x, this.path[i].y);
        }
    }

    // grid base
    drawGrid() {
        let cacheContext = this.cacheCanvas.getContext("2d");
        cacheContext.save();
        cacheContext.translate(0.5, 0.5);
        cacheContext.strokeStyle = "#B6B6B6";
        cacheContext.clearRect(0, 0, this.cacheCanvas.width, this.cacheCanvas.height);
        // vertical line
        let columnSize = this.cacheCanvas.width / this.size;
        for (let column = 0; column <= columnSize; column++) {
            let x = column * this.size;
            cacheContext.beginPath();
            if (column % 10 == 0) {
                cacheContext.strokeStyle = "#000000";
            } else {
                cacheContext.strokeStyle = "#B6B6B6";
            }
            cacheContext.moveTo(x, 0);
            cacheContext.lineTo(x, this.cacheCanvas.height);
            cacheContext.stroke();
        }
        // horizontal line 
        let rowSize = this.cacheCanvas.height / this.size;
        for (let row = 0; row <= rowSize; row++) {
            let y = row * this.size;
            cacheContext.beginPath();
            if (row % 10 == 0) {
                cacheContext.strokeStyle = "#000000";
            } else {
                cacheContext.strokeStyle = "#B6B6B6";
            }
            cacheContext.moveTo(0, y);
            cacheContext.lineTo(this.cacheCanvas.width, y);
            cacheContext.stroke();
        }
        // complete
        cacheContext.restore();
    }

    refresh() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.drawImage(this.cacheCanvas, 0, 0, this.cacheCanvas.width, this.cacheCanvas.height);
    }
}