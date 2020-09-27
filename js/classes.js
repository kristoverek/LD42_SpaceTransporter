/*global imageRegistry sin cos deg renderList logicList sqrt state random overlay atan2 player soundManager bossfight abs*/

class Sprite
{
    constructor(name, x, y, w, h, lifespan = -1)
    {
        this.alive = true;
        this.img = name;
        this.posX = x;
        this.posY = y;
        this.width = w;
        this.height = h;
        this.imgW = imageRegistry[this.img].naturalWidth;
        this.imgH = imageRegistry[this.img].naturalHeight;
        this.lifespan = lifespan;
    }
    
    getRenderData()
    {
        let o = 
        {
            img: this.img,
            sx: 0,
            sy: 0,
            sw: this.imgW,
            sh: this.imgH,
            dx: this.posX,
            dy: this.posY,
            dw: this.width,
            dh: this.height
        }
        if(this.lifespan < 0) return o;
        else if(this.lifespan > 0) this.lifespan -= 1;
        else this.alive = false;
        return o;
    }
}

class AnimatedSprite extends Sprite
{
    constructor(name, x, y, w, h, frames, animations, tpf)
    {
        super(name, x, y, w, h);
        
        this.frames = frames;
        this.animations = animations;
        this.currentAnimation = 0;
        this.currentFrame = 0;
        this.tpf = tpf;
        this.playing = true;
        this.currentTick = 0;
        this.frameWidth = this.imgW / frames;
    }
    
    getRenderData()
    {
        let o = 
        {
            img: this.img,
            sx: this.frameWidth * this.currentFrame,
            sy: 0,
            sw: this.frameWidth,
            sh: this.imgH,
            dx: this.posX,
            dy: this.posY,
            dw: this.width,
            dh: this.height
        }
        this.currentTick += 1;
        if(this.currentTick >= this.tpf)
        {
            this.currentTick = 0;
            this.nextFrame();
        }
        return o;
    }
    
    nextFrame()
    {
        if(this.currentFrame + 1 > this.animations[this.currentAnimation][1])
        {
            if(typeof this.animations[this.currentAnimation][2] == "function") this.animations[this.currentAnimation][2](this);
            this.currentFrame = this.animations[this.currentAnimation][0];
        }
        else this.currentFrame += 1;
    }
    
    previousFrame()
    {
        if(this.currentFrame == this.animations[this.currentAnimation][0]) this.currentFrame = this.animations[this.currentAnimation][1];
        else this.currentFrame -= 1;
    }
}

class ProgressBar extends Sprite
{
    constructor(name, x, y, w, h, max, val)
    {
        super(name, x, y, w, h);
        
        this.max = max;
        this.val = val;
    }
    
    getRenderData()
    {
        let o = 
        {
            img: this.img,
            sx: 0,
            sy: 0,
            sw: this.imgW * (this.val / this.max),
            sh: this.imgH,
            dx: this.posX,
            dy: this.posY,
            dw: this.width * (this.val / this.max),
            dh: this.height
        }
        return o;
    }
}

class Bullet
{
    constructor(x, y, angle, velocity, acceleration, angVelocity, angAcceleration, size, lifespan, spriteName, alignment, callback = null) //0 - player, 1 - multishot, 2 - basic cargo, 3 - bomb, 4 - speed up, 5 - better cargo, 6 - god cargo
    {
        this.alive = true;
        this.angle = angle;
        this.velocity = velocity;
        this.acceleration = acceleration;
        this.angVelocity = angVelocity;
        this.angAcceleration = angAcceleration;
        this.size = size;
        this.lifespan = lifespan;
        this.alignment = alignment;
        this.sprite = new Sprite(spriteName, x - (this.size / 2), y - (this.size / 2), this.size, this.size);
        this.callback = callback;
    }
    
    update()
    {
        this.lifespan -= 1;
        if(this.lifespan <= 0)
        {
            this.alive = false;
            if(this.callback != null) this.callback(this);
        }
        
        this.velocity += this.acceleration;
        this.angVelocity += this.angAcceleration;
        this.angle += this.angVelocity;
        let vec = {x: cos(this.angle) * this.velocity, y: sin(this.angle) * this.velocity};
        this.sprite.posX += vec.x;
        this.sprite.posY += vec.y;
    }
    
    getRenderData()
    {
        return this.sprite.getRenderData();
    }
    
    isColliding(tx, ty, ts)
    {
        let correction = (ts - this.size) / 2;
        return (sqrt(((this.sprite.posX - tx - correction) * (this.sprite.posX - tx - correction)) + ((this.sprite.posY - ty - correction) * (this.sprite.posY - ty - correction))) < (this.size + ts) / 3);
    }
}

class Star
{
    constructor(x, y, speed)
    {
        this.alive = true;
        this.posX = x;
        this.posY = y;
        this.speed = speed;
        this.lifespan = 1000 * speed;
    }
    
    getRenderData()
    {
        this.posY += this.speed;
        this.lifespan -= 1;
        if(this.posY > 700 || this.lifespan < 0) this.alive = false;
        return {x: this.posX, y: this.posY, t: this.speed};
    }
}

class RandomSpawner
{
    constructor()
    {
        this.alive = true;
    }
    
    update()
    {
        if(state > 1) return;   //not working when paused
        
        let seed = random();
        
        if(seed < 0.97) return;
        
        let o;
        
        if(state == 1) // only when playing
        {
            o = new Bullet(random() * 480, -24, ((random() * 45) + 72.5) * deg, 5, 0, 0, 0, 16, 1000, "crateA", 2);
            renderList.push(o);
            logicList.push(o);
        }
    }
}

class Pirate
{
    constructor()
    {
        this.alive = true;
        this.size = 48;
        this.sprite = new AnimatedSprite("pirate", random() * 432, -50, this.size, this.size, 12, [[0, 1], [2, 6, function(el){
            //bomb
            for(let i = 0; i < 16; i++)
            {
                let bullet = new Bullet(el.posX + (el.width / 2), el.posY + (el.height / 2), i * 22.5 * deg, 5, -0.025, 0, 0, 16, 200, "bomb", 3);
                renderList.push(bullet);
                logicList.push(bullet);
            }
            
            el.currentAnimation = 0;
            el.currentFrame = 0;
        }], [7, 11, function(el){
            //death
            el.alive = false;
        }]], 10);
        this.cooldown = 0;
        this.speed = 2;
        this.hp = 10;
        this.dying = false;
    }
    
    shoot()
    {
        this.cooldown = 80;
        let correction = (player.size - this.size) / 2;
        let dx = player.sprite.posX - this.sprite.posX - correction;
        let dy = player.sprite.posY - this.sprite.posY - correction;
        let angle = atan2(dy, dx);
        let bullet = new Bullet(this.sprite.posX + (this.sprite.width / 2), this.sprite.posY + (this.sprite.height / 2), angle, 5, 0, 0, 0, 16, 200, "bomb", 3);
        renderList.push(bullet);
        logicList.push(bullet);
    }
    
    bomb()
    {
        this.cooldown = 500;
        this.sprite.currentAnimation = 1;
        this.sprite.currentFrame = this.sprite.animations[1][0];
    }
    
    update()
    {
        if(!this.sprite.alive)
        {
            this.alive = false;
            return;
        }
        
        if(this.dying) return;
        
        let correction = (player.size - this.size) / 2;
        let dx = player.sprite.posX - this.sprite.posX - correction;
        let dy = player.sprite.posY - this.sprite.posY - correction;
        if(sqrt((dx * dx) + (dy * dy)) > 350)
        {
            let angle = atan2(dy, dx);
            this.sprite.posX += cos(angle) * this.speed;
            this.sprite.posY += sin(angle) * this.speed;
        }
        
        if(this.cooldown <= 0)
        {
            if(random() < 0.2) this.bomb();
            else this.shoot();
        }
        else this.cooldown -= 1;
        
        for(let i in logicList)
        {
            if(typeof logicList[i].alignment != "undefined")
            {
                if(logicList[i].isColliding(this.sprite.posX, this.sprite.posY, this.size) && logicList[i].alignment == 0)
                {
                    logicList[i].alive = false;
                    renderList.splice(3, 0, new Sprite("bulletExp", logicList[i].sprite.posX, logicList[i].sprite.posY, 16, 16, 8));
                    this.hp -= 1;
                    if(this.hp <= 0)
                    {
                        this.dying = true;
                        this.sprite.currentAnimation = 2;
                        this.sprite.currentFrame = this.sprite.animations[2][0];
                        soundManager.play("death", false);
                        
                        let which = (random() < 0.5);
                        let bonus = new Bullet(this.sprite.posX + (this.sprite.width / 2), this.sprite.posY + (this.sprite.height / 2), 65 * deg, 1, 0, 0, 0, 16, 1000, which ? "bonusA" : "bonusB", which ? 1 : 4);
                        let loot = new Bullet(this.sprite.posX + (this.sprite.width / 2), this.sprite.posY + (this.sprite.height / 2), 115 * deg, 1, 0, 0, 0, 16, 1000, "crateB", 5);
                        renderList.push(bonus);
                        renderList.push(loot);
                        logicList.push(bonus);
                        logicList.push(loot);
                    }
                }
            }
        }
    }
}

class Boss
{
    constructor()
    {
        this.alive = true;
        this.size = 96;
        this.sprite = new AnimatedSprite("boss", random() * 432, -50, this.size, this.size, 26, [[0, 2], [3, 7, function(el){
            //LASER
            renderList.splice(3, 0, new Sprite("laser", el.posX + (el.width / 2) - 16, el.posY + el.height, 32, 640 - el.height - el.posY, 20));
            soundManager.play("laser", false);
            if(abs((el.posX + (el.width / 2)) - (player.sprite.posX + (player.size / 2))) < 24) player.die();
            el.currentAnimation = 0;
            el.currentFrame = 0;
        }], [8, 12, function(el){
            //BOMB
            for(let i = 0; i < 64; i++)
            {
                let mod = (i % 3) - 1;
                let bullet = new Bullet(el.posX + (el.width / 2), el.posY + (el.height / 2), i * 5 * deg, 4, 0.02 * mod, 0.01 * mod, 0, 16, 200, "bomb", 3);
                renderList.push(bullet);
                logicList.push(bullet);
            }
            el.currentAnimation = 0;
            el.currentFrame = 0;
        }], [13, 17, function(el){
            //MEGATON
            for(let i = 0; i < 8; i++)
            {
                let bullet = new Bullet(el.posX + (el.width / 2), el.posY + (el.height / 2), i * 40 * deg, 3, -0.025, 0, 0, 16, 80, "bomb", 3, function(el){
                    for(let j = 0; j < 5; j++)
                    {
                        let bullet = new Bullet(el.sprite.posX + (el.sprite.width / 2), el.sprite.posY + (el.sprite.height / 2), j * 64 * deg, 3, 0, 0, 0, 16, 200, "bomb", 3);
                        renderList.push(bullet);
                        logicList.push(bullet);
                    }
                });
                renderList.push(bullet);
                logicList.push(bullet);
            }
            el.currentAnimation = 0;
            el.currentFrame = 0;
        }], [18, 25, function(el){
            //DEATH
            this.alive = false;
        }]], 10);
        this.cooldown = 0;
        this.speed = 2;
        this.hp = 100;
        this.dying = false;
        this.movementAngle = 0;
        bossfight = true;
    }
    
    update()
    {
        if(!this.sprite.alive)
        {
            this.alive = false;
            return;
        }
        
        if(this.dying) return;
        
        let correction = this.size / 2;
        let dx = 240 - this.sprite.posX - correction;
        let dy = 120 - this.sprite.posY - correction;
        if(sqrt((dx * dx) + (dy * dy)) > 50)
        {
            this.movementAngle = atan2(dy, dx)
            this.sprite.posX += cos(this.movementAngle) * this.speed;
            this.sprite.posY += sin(this.movementAngle) * this.speed;
        }
        else
        {
            this.movementAngle += random() * deg;
            this.sprite.posX += cos(this.movementAngle) * this.speed;
            this.sprite.posY += sin(this.movementAngle) * this.speed;
        }
        
        if(this.cooldown <= 0)
        {
            this.cooldown = 300;
            if(this.hp > 60)
            {
                this.sprite.currentAnimation = 2;
                this.sprite.currentFrame = this.sprite.animations[2][0];
            }
            else if(this.hp > 40)
            {
                this.sprite.currentAnimation = 1;
                this.sprite.currentFrame = this.sprite.animations[1][0];
            }
            else
            {
                this.sprite.currentAnimation = 3;
                this.sprite.currentFrame = this.sprite.animations[3][0];
            }
        }
        else this.cooldown -= 1;
        
        for(let i in logicList)
        {
            if(typeof logicList[i].alignment != "undefined")
            {
                if(logicList[i].isColliding(this.sprite.posX, this.sprite.posY, this.size) && logicList[i].alignment == 0)
                {
                    logicList[i].alive = false;
                    renderList.splice(3, 0, new Sprite("bulletExp", logicList[i].sprite.posX, logicList[i].sprite.posY, 16, 16, 8));
                    this.hp -= 1;
                    if(this.hp <= 0)
                    {
                        this.dying = true;
                        this.sprite.currentAnimation = 4;
                        this.sprite.currentFrame = this.sprite.animations[4][0];
                        soundManager.play("death", false);
                        bossfight = false;
                        
                        for(let n = 0; n < 4; n++)
                        {
                            let loot = new Bullet(this.sprite.posX + (this.sprite.width / 2), this.sprite.posY + (this.sprite.height / 2), ((n * 16.6) + 65) * deg, 1, 0, 0, 0, 16, 1000, "crateC", 6);
                            logicList.push(loot);
                            renderList.push(loot);
                            
                        }
                    }
                }
            }
        }
    }
}

class Player
{
    constructor()
    {
        //tech
        this.alive = true;
        this.size = 48;
        this.sprite = new AnimatedSprite("player", 240 - (this.size / 2), 400 - (this.size / 2), this.size, this.size, 16, [[0, 5], [6, 15, function(el){
            state = 0;
            overlay.show("gameover");
            soundManager.stop("game");
            soundManager.play("gameover", false);
        }]], 10);
        
        //controls
        this.movingUp = false;
        this.movingDown = false;
        this.movingLeft = false;
        this.movingRight = false;
        this.shooting = false;
        this.cooldown = 0;
        this.dying = false;
        
        //bonuses
        this.speed = 2;
        this.power = 5;
        this.multishot = 1;
        
        //mech
        this.maxCargo = 1000;
        this.cargo = 0;
        this.cargoValue = 0;
    }
    
    shoot()
    {
        if(this.cooldown > 0) return;
        let angleA = 180 / this.multishot;
        let angleB = (angleA / 2) - 90;
        for(let i = 0; i < this.multishot; i++)
        {
            let bullet = new Bullet(this.sprite.posX + (this.size / 2), this.sprite.posY + (this.size / 2),
            ((i * angleA) + angleB - 90) * deg, this.power, 0, 0, 0, 16, 160, "bullet", 0);
            renderList.push(bullet);
            logicList.push(bullet);
        }
        this.cooldown = 20;
        soundManager.stop("shoot");
        soundManager.play("shoot", false);
    }
    
    die()
    {
        this.sprite.currentAnimation = 1;
        this.sprite.currentFrame = 0;
        this.cooldown = 10000;
        this.dying = true;
        soundManager.play("death", false);
    }
    
    getRenderData()
    {
        return this.sprite.getRenderData();
    }
    
    update()
    {
        if(this.dying) return;
        
        //movement process
        let vec = {x: 0, y: 0};
        if(this.movingLeft) vec.x -= this.speed;
        if(this.movingRight) vec.x += this.speed;
        if(this.movingUp) vec.y -= this.speed;
        if(this.movingDown) vec.y += this.speed;
        if(this.sprite.posX + vec.x > -1 && this.sprite.posX + vec.x < 481 - this.size) this.sprite.posX += vec.x;
        if(this.sprite.posY + vec.y > -1 && this.sprite.posY + vec.y < 641 - this.size) this.sprite.posY += vec.y;
        
        //
        if(this.shooting) this.shoot();
        this.cooldown -= 1;
        
        for(let i in logicList)
        {
            if(typeof logicList[i].alignment != "undefined")
            {
                if(logicList[i].isColliding(this.sprite.posX, this.sprite.posY, this.size))
                {
                    switch(logicList[i].alignment)
                    {
                        case 1:
                            this.multishot += 1;
                            this.cargo += 75;
                            logicList[i].alive = false;
                            break;
                        case 6:
                            this.cargoValue += 500;
                            this.cargo += 10;
                        case 5:
                            this.cargoValue += 150;
                            this.cargo += 10;
                        case 2:
                            this.cargoValue += 100;
                            
                            logicList[i].alive = false;
                            this.cargo += 50;
                            break;
                        case 3:
                        case 7:
                            logicList[i].alive = false;
                            this.die();
                            break;
                        case 4:
                            this.speed += 1;
                            this.cargo += 75;
                            logicList[i].alive = false;
                            break;
                    }
                    if(logicList[i].alignment != 0)
                    {
                        soundManager.play("bonus");
                        renderList[1].val = this.cargo; //cargo bar
                        if(this.cargo > this.maxCargo) this.die();
                    }
                }
            }
        }
    }
    
    processInput(keyCode, down)
    {
        switch(keyCode)
        {
            case 32:    //space
                this.shooting = down;
                break;
            case 37:    //left
                this.movingLeft = down;
                break;
            case 39:    //right
                this.movingRight = down;
                break;
            case 38:    //up
                this.movingUp = down;
                break;
            case 40:    //down
                this.movingDown = down;
                break;
            default:
                break;
        }
    }
}