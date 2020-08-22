// canvas grid
class Grid{
    // view
    size = 10;
    canvas = {};
    context = {};
    cacheCanvas = {};

    // data
    object = {};
    path = [];

    constructor(canvasId, size) {
        if (size <= 1 ) throw("invalid size");
        this.size = size;
        // canvas
        this.canvas = document.getElementById(canvasId);
        this.context = this.canvas.getContext("2d");
        this.canvas.width = document.body.clientWidth;
        this.canvas.height = document.body.clientHeight;                
        // cache canvas
        this.cacheCanvas = document.createElement("canvas");
        this.cacheCanvas.width = document.body.clientWidth;
        this.cacheCanvas.height = document.body.clientHeight;
        // draw grid on cache canvas
        this.drawGrid();
        // clear canvas and draw cache canvas on canvas
        //this.refresh();
    }

    // grid format
    format(i) {
        return i * this.size + 1;
    }

    // grid correct
    correct(i) {
        return Math.floor(i / this.size);
    }

    // add object
    add(object) {
        if (object instanceof Array) {
            object.forEach((fighter) => this.object[fighter.id] = fighter);
        } else {
            this.object[object.id] = object;
        }
        grid.show();
    }

    // move object
    move(object) {
        if (object instanceof Array) {
            object.forEach((fighter) => {
                this.object[fighter.id]["x"] = fighter.x;
                this.object[fighter.id]["y"] = fighter.y;
            });
        } else {
            this.object[object.id]["x"] = object.x;
            this.object[object.id]["y"] = object.y;
        }
        this.show();
    }

    // remove object
    remove(object) {
        if (object instanceof Array) {
            object.forEach((fighter) => {
                delete this.object[fighter.id];
            });
        } else {
            delete this.object[object.id];
        }
        this.show();
    }

    // draw grid
    show() {
        this.refresh();
        for (let key in this.object) {
            if (this.object[key].hp === 0) continue;
            switch (this.object[key].type) {
                case 1:
                    this.drawPoint(this.object[key].x, this.object[key].y, "#00FF00");
                    break;
                case 2:
                    this.drawPoint(this.object[key].x, this.object[key].y, "#FF0000");
                    break;
                case 3:
                    this.drawPoint(this.object[key].x, this.object[key].y, "#0000FF");
                    break;
                case 4:
                    this.drawPoint(this.object[key].x, this.object[key].y, "#FF00FF");
                    break;
                default:
                    this.drawPoint(this.object[key].x, this.object[key].y, "#000000");
            }
        }
    }

    move_it(id, x, y) {
        this.object[id] = {x: x, y: y};
        this.refresh();
        this.drawPath();
        this.context.fillStyle = "#00FF00";
        for (let key in this.object) {
            this.drawPoint(this.object[key].x, this.object[key].y)
        }

        // this.object.forEach((e) => this.drawPoint(e.x, e.y));
        //
        // this.drawPoint(x, y);
        // let old = this.object.find((e) => e.id === id);
        // if (old === undefined) {
        //     this.object.push({id: id, x: x, y: y});
        // } else {
        //     this.object.map(function (e) {
        //         if (e.id === id) {
        //             e["x"] = x;
        //             e["y"] = y;
        //         }
        //         return e;
        //     });
        // }
    }

    addPath(x, y) {
        this.path.push({x: this.format(x), y: this.format(y)});
    }

    refresh() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.drawImage(this.cacheCanvas, 0, 0, this.cacheCanvas.width, this.cacheCanvas.height);
    }

    drawPoint(x, y, color) {
        this.context.fillStyle = color;
        this.context.fillRect(this.format(x), this.format(y), this.size - 1, this.size - 1);
    }

    drawPath() {
        this.context.fillStyle = "#FF0000";
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
        // vertical line
        let columnSize = this.cacheCanvas.width / this.size;
        for(let column = 0; column <= columnSize; column++)
        {
            let x = column * this.size;
            cacheContext.moveTo(x, 0);
            cacheContext.lineTo(x, this.cacheCanvas.height);
        }
        // horizontal line 
        let rowSize = this.cacheCanvas.height / this.size;
        for(let row = 0; row <= rowSize; row++)
        {
            let y = row * this.size;
            cacheContext.moveTo(0, y);
            cacheContext.lineTo(this.cacheCanvas.width, y);
        }
        // complete
        cacheContext.stroke();
        cacheContext.restore();
    }
}