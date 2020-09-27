/*global Player Sprite AnimatedSprite Image RandomSpawner ProgressBar Star Pirate Boss*/

var canvas, ctx, renderList = [], logicList = [], state = -1, player, imageRegistry, gameTicks = 0, starList = [], station, soundManager, bossfight = false;
var ip, lm, tm; //inner point, top margin, left margin
var sin = Math.sin, cos = Math.cos, deg = Math.PI / 180, sqrt = Math.sqrt, atan2 = Math.atan2, abs = Math.abs;
var random = Math.random;
var lastCalledTime, fps, delta, fpsDom; //fps counter bb
var overlay;

//states: -1 - menu, 0 - gameover, 1 - game, 2 - paused

function init()
{
    //tech init
    canvas = document.getElementById("canvas");
    ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    document.addEventListener("keydown", processKeyDown, false);
    document.addEventListener("keyup", processKeyUp, false);
    rescale();
    soundManager = 
    {
        dom: { },
        play: function(which, loop)
        {
            this.dom[which].loop = loop;
            this.dom[which].play();
        },
        stop: function(which)
        {
            this.dom[which].pause();
            this.dom[which].currentTime = 0;
        }
    };
    overlay = 
    {
        show: function(which)
        {
            document.getElementById(which).style.display = "block";
        },
        hide: function()
        {
            let all = document.getElementsByClassName("overlay");
            for(let i = 0; i < all.length; i++) all[i].style.display = "none";
        }
    };
    
    //env init
    initRegistry();
    
    fpsDom = document.getElementById("fps");
    lastCalledTime = Date.now();
    fps = 0;
    requestAnimationFrame(gameTick);
    
    //reg init
    setTimeout(function(){ soundManager.play("menu", true); }, 100);
}

function rescale()
{
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ip = window.innerHeight / 640;
    if(ip * 480 > window.innerWidth) ip = window.innerWidth / 480;
    lm = (window.innerWidth - (ip * 480)) / 2;
    tm = (window.innerHeight - (ip * 640)) / 2;
    ctx.rect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#000";
    ctx.fill();
    ctx.globalCompositeOperation = "destination-over";
}

function initRegistry()
{
    imageRegistry = {};
    let names = ["blank", "player", "bullet", "crateA", "crateB", "crateC", "bomb", "bonusA", "bonusB", "cargoBarBg", "cargoBarPb", "distanceBarBg", "distanceBarPb", "pirate", "station", "bulletExp", "boss", "laser"];
    for(let i = 0; i < names.length; i++)
    {
        imageRegistry[names[i]] = new Image();
        imageRegistry[names[i]].src = "gfx/" + names[i] + ".png";
    }
    
    let anames = ["menu", "game", "gameover", "bonus", "shoot", "death", "endgame", "laser"];
    for(let i = 0; i < anames.length; i++)
    {
        soundManager.dom[anames[i]] = document.createElement("audio");
        soundManager.dom[anames[i]].src = "sfx/" + anames[i] + ".wav";
    }
}

function newGame()
{
    renderList = [];
    logicList = [];
    gameTicks = 0;
    bossfight = false;
    
    player = new Player();
    
    renderList.push(new ProgressBar("distanceBarPb", 19, 16, 458, 16, 1000, 0));
    renderList.push(new ProgressBar("cargoBarPb", 19, 0, 458, 16, 1000, 0));
    renderList.push(new Sprite("distanceBarBg", 0, 16, 480, 16));
    renderList.push(new Sprite("cargoBarBg", 0, 0, 480, 16));
    renderList.push(player.sprite);
    
    logicList.push(player);
    logicList.push(new RandomSpawner());
    
    state = 1;
}

function endGame()
{
    player.dying = true;
    station = new Sprite("station", 240, -100, 128, 128);
    renderList.push(station);
    logicList.push({
        update: function()
        {
            if(station.posY + station.height < player.sprite.posY) station.posY += 1;
            else
            {
                state = -3;
                document.getElementById("highscore").innerHTML = player.cargoValue;
                overlay.hide();
                overlay.show("endgame");
            }
        },
        alive: true
    });
    soundManager.stop("game");
    soundManager.play("endgame");
}

function clearCanvas()
{
    ctx.clearRect(lm, tm, ip * 480, ip * 640);
}

function render()
{
    clearCanvas();
    
    //renderList
    if(state == 1)
    {
        let o;
        for(let i in renderList)
        {
            if(!renderList[i].alive) renderList.splice(i, 1);
            else
            {
                o = renderList[i].getRenderData();
                //This try catch here is aa necessery fix for firecucks
                try
                {
                    ctx.drawImage(imageRegistry[o.img], o.sx, o.sy, o.sw, o.sh, (o.dx * ip) + lm, (o.dy * ip) + tm, o.dw * ip, o. dh * ip);
                }
                catch(err) { }
            }
        }
    }
    
    //background
    if(random() < 0.2) starList.push(new Star(random() * 480, -50, random()));
    let star;
    for(let i in starList)
    {
        if(!starList[i].alive) starList.splice(i, 1);
        else
        {
            star = starList[i].getRenderData();
            ctx.fillStyle = "rgba(255, 255, 255, " + star.t + ")";
            ctx.fillRect((star.x * ip) + lm, (star.y * ip) + tm, ip, ip);
        }
    }
    ctx.fillStyle = "#041838";
    ctx.fillRect(lm, tm, 480 * ip, 640 * ip);
}

function logicTick()
{
    //countdown to home
    if(gameTicks % 10 == 0 && state == 1 && !player.dying)
    {
        renderList[0].val += 1;
        if(renderList[0].val > renderList[2].max) endGame();
        if(renderList[0].val % 50 == 0)
        {
            let pirate;
            if(renderList[0].val == 500)
            {
                pirate = new Boss();
                renderList.push(pirate.sprite);
                logicList.push(pirate);
            }
            else if(!bossfight)
            {
                pirate = new Pirate();
                renderList.push(pirate.sprite);
                logicList.push(pirate);
            }
        }
    }
    
    for(let i in logicList)
    {
        if(!logicList[i].alive) logicList.splice(i, 1);
        else logicList[i].update();
    }
}

function gameTick()
{
    requestAnimationFrame(gameTick);
    
    if(state > 1) return;
    
    gameTicks++;
    
    if(state == 1) logicTick();
    render();
    
    //fps logger
    delta = (Date.now() - lastCalledTime)/1000;
    lastCalledTime = Date.now();
    fps = 1/delta;
    if(gameTicks % 20 == 0) fpsDom.innerHTML = fps|0;
}

function processKeyDown(e)
{
    if(e.keyCode == 27)
    {
        if(state == 1)
        {
            player.movingDown = false;
            player.movingLeft = false;
            player.movingRight = false;
            player.movingUp = false;
            player.shooting = false;
            overlay.show("pause");
            state = 2;
        }
        else if(state == 2)
        {
            overlay.hide();
            state = 1;
        }
        else if(state == -1)
        {
            overlay.hide();
            overlay.show("guide");
            state = -2
        }
        else if(state == -2)
        {
            overlay.hide();
            overlay.show("menu");
            state = -1;
        }
    }
    if(e.keyCode == 32)
    {
       if(state == -1) //menu
       {
           overlay.hide();
           newGame();
           state = 1;
           soundManager.stop("menu");
           soundManager.play("game", true);
       }
       else if(state == 0)  //gameover
       {
            overlay.hide();
            overlay.show("menu");
            state = -1;
            soundManager.stop("gameover");
            soundManager.play("menu", true);
       }
       else if(state == -3) //gameend
       {
            overlay.hide();
            overlay.show("menu");
            state = -1;
            soundManager.stop("endgame");
            soundManager.play("menu", true);
       }
    }
    if(state == 1) player.processInput(e.keyCode, true);
}

function processKeyUp(e)
{
    if(state == 1) player.processInput(e.keyCode, false);
}