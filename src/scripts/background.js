function vh(v) {
    var h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
    return (v * h) / 100;
}

const canvas = document.getElementById("background");
const ctx = canvas.getContext("2d");
canvas.width = width = window.innerWidth;
canvas.height = height = window.innerHeight;

const limitingSpeed = 10;
const avoidRange = 50; 
const aversionFactor = 50;
const alignmentFactor = 100;
const cohesionFactor = 10;
const useViewRange = true;
const viewRange = 100;
const boidLength = 10;
const boidWidth = 5;
const boidPopulation = 50;

class Boid {
    vx = 0;
    vy = 0;

    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    update(boids) {
        if (boids.length > 0) {
            const [vx1, vy1] = this.cohesion(boids)
            const [vx2, vy2] = this.separation(boids)
            const [vx3, vy3] = this.alignment(boids)
            const [vx4, vy4] = this.constrainScreen()

            this.vx += vx1 + vx2 + vx3 + vx4;
            this.vy += vy1 + vy2 + vy3 + vy4;
            if (this.vx !== this.vx){debugger;}
            
            const mag = Math.sqrt(this.vx**2 + this.vy**2)
            if (mag > limitingSpeed) {
                this.vx = (this.vx / mag) * limitingSpeed
                this.vy = (this.vy / mag) * limitingSpeed
            }

            this.x += this.vx;
            this.y += this.vy;
        }
    }

    separation(boids) {
        let vec = [0,0]
        for (const b of boids) {
            const dx = b.x - this.x
            const dy = b.y - this.y
            if    (Math.abs(dx) < avoidRange
                && Math.abs(dy) < avoidRange) {
                vec[0] -= dx
                vec[1] -= dy
            }
        }
        
        vec[0] /= aversionFactor;
        vec[1] /= aversionFactor;

        return vec
    }

    alignment(boids) {
        //calculate average boid position-- the "center of mass"
        let avgPos = [0,0];
        for (const b of boids) {
            avgPos[0] += b.x;
            avgPos[1] += b.y;
        }
        
        avgPos[0] /= boids.length
        avgPos[1] /= boids.length
        
        let vec = [avgPos[0] - this.x, avgPos[1] - this.y];
        vec[0] /= alignmentFactor;
        vec[1] /= alignmentFactor;

        return vec;
    }

    cohesion(boids) {
        let vec = [0,0];
        for (const b of boids) {
            vec[0] += b.vx;
            vec[1] += b.vy;
        }
        
        vec[0] /= boids.length;
        vec[1] /= boids.length;

        vec[0] /= cohesionFactor
        vec[1] /= cohesionFactor
        
        return vec
    }

    constrainScreen() {
        let vec = [0,0];
        if (this.x < 0) {
            vec[0] = limitingSpeed;
        } 
        else if (this.x > width) {
            vec[0] = -limitingSpeed
        }
        if (this.y < 80) {
            vec[1] = limitingSpeed;
        } 
        else if (this.y > height) {
            vec[1] = -limitingSpeed
        }
        return vec;
    }

    get direction() {
        return Math.atan2(this.vy, this.vx) * 180 / Math.PI;
    }
}

let globalBoids = []
for (let i = 0; i < boidPopulation; i++) {
    globalBoids.push(
        new Boid(
            Math.floor(Math.random() * width),
            Math.floor(Math.random() * height)
        )
    )
}
console.log(globalBoids)

let prevTimestamp = -1;
function render(timestamp) {
    if (timestamp == undefined) {
        requestAnimationFrame(render)
        return;
    }
    if (prevTimestamp === -1) { prevTimestamp = timestamp } 
    let dt = (timestamp - prevTimestamp) / 100

    canvas.style.width = window.innerWidth;
    canvas.style.height = window.innerHeight;

    ctx.fillStyle = "#09090a"
    ctx.fillRect(0,0,width,height)
    for (let b of globalBoids) {
        b.update(
            useViewRange ?
            globalBoids.filter(boid => {
            return Math.abs(boid.x - b.x) < viewRange
                && Math.abs(boid.y - b.y) < viewRange
                && boid != b
            }) : globalBoids.filter(boid => boid != b))

        //draw
        ctx.beginPath();
        const frontVertex = advancePos(b.x, b.y, b.direction, boidLength);
        ctx.moveTo(frontVertex[0], frontVertex[1]);
        const backLeft = advancePos(b.x, b.y, b.direction + 90, boidWidth);
        ctx.lineTo(backLeft[0], backLeft[1]);
        const backRight = advancePos(b.x, b.y, b.direction - 90, boidWidth)
        ctx.lineTo(backRight[0], backRight[1]);
        ctx.closePath();

        ctx.strokeStyle = "#df3896"
        ctx.lineWidth = 2;
        ctx.stroke()
    }

    prevTimestamp = timestamp
    requestAnimationFrame(render)
}

render()

function advancePos(x, y, direction, mag) {
    return [
        x + Math.cos(direction * Math.PI / 180) * mag, 
        y + Math.sin(direction * Math.PI / 180) * mag
    ]
}