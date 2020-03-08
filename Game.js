function delta()
{
  const fr = frameRate()
  return fr === 0 ? 1 : 1 / fr
}

function collision(X1, Y1, W1, H1, X2, Y2, W2, H2)
{
  if (X1 < X2 + W2 &&
    X1 + W1 > X2 &&
    Y1 < Y2 + H2 &&
    Y1 + H1 > Y2)
   {
     return true
   }

  return false
}

class Entity
{
  constructor(x = 0, y = 0, w, h = w)
  {
    this.x = x
    this.y = y
    this.w = w
    this.h = h
  }

  draw()
  {
    
  }

  update()
  { 
    
  }
}

class AnimatedEntity extends Entity
{
  constructor(animation, x, y, w, h = w)
  {
    super(x, y, w, h)
    this.playAnim(animation)
  }

  playAnim(animation)
  {
    this.animation = animations[animation]
    this.setFrame(0)
    this.animTime = 0
    this.finishCalled = false
  }

  setFrame(frame)
  {
    this.image = images[this.animation.frameList[frame]]
    this.frame = frame
  }

  update()
  {
    super.update()

    this.animTime += delta()
    if (this.animTime >= this.animation.timePerFrame)
    {
      this.animTime = 0
      const l = this.animation.frameList.length

      if (this.frame === l - 1)
      {
        if (this.animation.finish && !this.finishCalled)
        {
          this.animation.finish(this)
          this.finishCalled = true
        }
        if (this.animation.loop)
        {
          this.setFrame(0)
        }
      }
      else
      {
        this.setFrame(this.frame + 1)
      }
    }
  }

  draw(x = this.x, y = this.y)
  {
    // This is a p5js function to draw sprites
    image(this.image, x, y)
  }
}

class Text extends Entity
{
  constructor(cadena, y)
  {
    super(0, y, World.width, Text.size * 4)
    this.cadena = cadena
  }

  draw()
  {
    fill('white')
    stroke('black')
    text(this.cadena, this.x, this.y, this.w, this.h)
  }

  setCadena(cadena)
  {
    this.cadena = cadena;
  }

}
Text.size = undefined

class Plane extends AnimatedEntity
{
  constructor(x, y, interShootTime, w = Plane.width, h = Plane.height)
  {
    super("plane", x, y, w, h)
    this.interShootTime = interShootTime
    this.currentInterShootTime = interShootTime
    this.lives = 1
  }
  
  shoot()
  {
    let bullet = new Bullet(this.isEnemy, this.x, this.y)
    worldInstance.addBullet(bullet)
  }

  update()
  {
    this.currentInterShootTime += delta()
    if (this.currentInterShootTime >= this.interShootTime)
    {
      this.shoot()
      this.currentInterShootTime = 0
    }
  }
  
  draw()
  {
    super.draw()
  }
}
Plane.width = 18
Plane.height = 18

class EnemyPlane extends Plane
{
  constructor(x, y, interShootTime, velocity)
  {
    super(x, y, interShootTime)
    this.isEnemy = true
    this.velocity = velocity
  }
  
  move()
  {
    this.y += delta() * this.velocity
    if (this.y + (this.h / 2.0) < 0 || this.y - (this.h / 2.0) > World.height)
    {
      // Delete plane out of bounds
      worldInstance.deleteEnemyPlane(this)
    }
  }
  
  update()
  {
    super.update()
    this.move()
  }
  
  draw()
  {
    this.drawColorLive();
    super.draw()
    noTint() // Disable tint
  }

  //same colos like breakout
  drawColorLive()
  {
    switch(this.lives)
    {
      default:
      case 1: tint(255,255,255);//white
       break;
      case 2: tint(255,255,0);//yellow
       break;
      case 3: tint(0,255,0);//green
       break;
      case 4: tint(255,165,0);//orange
       break;
      case 5: tint(255,0,0);//red
       break;
    }
  }
}

class PlayerPlane extends Plane
{
  constructor(id, x, y, interShootTime)
  {
    super(x, y, interShootTime, 0)
    this.isEnemy = false
    this.id = id
  }

  assignBlob(f)
  {
    const blob = worldInstance.blobs.find(f)

    if (blob !== undefined)
    {
      const x = blob.x - this.x
      const y = blob.y - this.y
      if (!(x === 0 && y === 0))
      {
        this.x = blob.x
        this.y = blob.y
        this.dir = atan2(y, x)
      }
      blob.assigned = true
    }
    else
    {
      // Delete existing player
      worldInstance.deletePlayerPlane(this)
    }
  }
  
  IsMyBlob(blob)
  {
    return blob.id === this.id
  }

  update()
  {
    super.update()
    // Player movement via camera tracking
    this.assignBlob(b => this.IsMyBlob(b))
  }
  
  draw()
  {
    super.draw()
  }
}
PlayerPlane.trackingDistance = 10
PlayerPlane.lives = 10;


class BasicPlane extends EnemyPlane 
{
  constructor(x, y)
  {
    super(x, y, BasicPlane.interShootTime, BasicPlane.velocity)
  }
  
  update()
  {
    super.update()
  }

  move()
  {
    super.move()
    // this plane doesn't do anything more
  }
}
BasicPlane.velocity = 2
BasicPlane.interShootTime = 10
BasicPlane.points = 10;
BasicPlane.lives = 2;
BasicPlane.prob = 50

class HardPlane extends EnemyPlane 
{
  constructor(x, y)
  {
    super(x, y, HardPlane.interShootTime, HardPlane.velocity)
    this.movementLeft = false;
    let randomValue = random(0, 100)
    if(randomValue < 50)
    {
      this.movementLeft = true;
    }
  }

  update()
  {
    super.update()
  }

  move()
  {
    super.move()
    
    //move also in the X coor
    this.x += delta() * this.velocity * this.movementLeft ? -1 : 1;
    if (this.x + (this.w / 2.0) < 0 || this.x + (this.w / 2.0) > World.width)
    {
      this.movementLeft = !this.movementLeft;
    }
  }
}
HardPlane.velocity = 4
HardPlane.interShootTime = 5
HardPlane.points = 100;
HardPlane.lives= 5;
HardPlane.prob = 30

class KamikazePlane extends EnemyPlane 
{
  constructor(x, y)
  {
    super(x, y, KamikazePlane.interShootTime, KamikazePlane.velocity)
  }

  update()
  {
    super.update()
  }

  move()
  {
    super.move()
    // this plane doesn't do anything more
  }
}
KamikazePlane.velocity = 10
KamikazePlane.interShootTime = 5000
KamikazePlane.points = 50;
KamikazePlane.lives= 1;
KamikazePlane.prob = 20


class Bullet extends Entity
{
  constructor(isFromEnemy, x = 0, y = 0, w = Bullet.width, h = Bullet.height)
  {
    super(x, y, w, h)
    this.isFromEnemy = isFromEnemy
  }
  
  update()
  {
    // Move up or down depending on bullet's shooter
    this.y += (!this.isFromEnemy ? -1.0 : 1.0) * Bullet.speed * delta()
    // Check bounds
    if (this.y + (this.h / 2.0) < 0 || this.y - (this.h / 2.0) > World.width)
    {
      // Delete bullet out of bounds
      worldInstance.deleteBullet(this)
    }
  }
  
  draw()
  {
    if (this.isFromEnemy)
    {
      tint(255, 0, 0) // Tint red
    }
    // Sprite also depends on bullet's shooter as it may face up or down
    image(images.bullet, this.x, this.y)
    if (this.isFromEnemy)
    {
      noTint() // Disable tint
    }
  }
}
Bullet.speed = 25.0
Bullet.width = 8
Bullet.height = 8

class PowerUp extends Entity
{
  constructor(x = 0, y = 0, w = PowerUp.width, h = PowerUp.height)
  {
    super(x, y, w, h)
    this.image = undefined // Overriden by each type of PowerUp
    this.remainingLifeTime = PowerUp.lifeTime
  }
  
  update()
  {
    this.remainingLifeTime -= delta()
    // Check bounds
    if (this.remainingLifeTime <= 0)
    {
      print("PowerUp disappears")
      // Delete PowerUp out of bounds
      worldInstance.deletePowerUp(this)
    }
  }
  
  draw()
  {
    if (this.image !== undefined)
    {
      image(this.image, this.x, this.y)
    }
  }
  
  applyEffect()
  {
  }
}
PowerUp.lifeTime = 8.0
PowerUp.width = 8
PowerUp.height = 8

class ScorePowerUp extends PowerUp
{
  constructor(x = 0, y = 0)
  {
    super(x, y)
    this.image = images.scorePowerUp
  }
  
  applyEffect()
  {
    super.applyEffect()
    CurrentScore += ScorePowerUp.ScoreGiven
  }
}
ScorePowerUp.ScoreGiven = 50

CurrentScore = 0
class World
{
  constructor()
  {
    this.playerPlanes = new Set()
    this.bullets = new Set()
    this.powerUps = new Set()
    this.texts = new Set() // <= RELAMENTE NECESITAMOS MUCHOS TEXTOS???
    this.enemies = new Set()
    this.timeForNextPowerUp = World.TimeBetweenPowerUps
    
    this.scoreText = new Text("TEXTO DE PRUEBA", -10)
    this.livesText = new Text("TEXTO DE PRUEBA", 10)
  }

  update(blobs)
  {
    this.blobs = blobs

    this.manageEnemies()
    this.managePowerUps()
    
    for (const enemy of this.enemies.values())
    {
      enemy.update()
    }

    // Players
    for (const playerPlane of this.playerPlanes.values())
    {
      playerPlane.update()
    }
    
    // Bullets
    for (const bullet of this.bullets.values())
    {
      bullet.update()
    }
    
    // PowerUps
    for (const powerUp of this.powerUps.values())
    {
      powerUp.update()
    }

    this.checkCollisions()
    
    // New player  
    for (const blob of blobs)
    {
      if (!blob.assigned)
      {
        this.addPlayerPlane(new PlayerPlane(blob.id, blob.x, blob.y, 10.0))
      }
    }

    this.updateTexts();
  }

  checkCollisions()
  {
    for (let i = this.bullets.length - 1; i >= 0; --i)
    {
      let bullet = this.bullets[i]
      if (!bullet.isFromEnemy)
      {
        for (let j = this.enemies.length - 1; j >= 0; --j)
        {
          let enemy = this.enemies[j]
          if (collision(bullet.x, bullet.y, bullet.width, bullet.height, enemy.x, enemy.y, enemy.width, enemy.height))
          {
            // Collision
            enemy.lives--
            if (enemy.lives <= 0)
            {
              CurrentScore += enemy.points
              this.deleteEnemyPlane(enemy)
            }
            this.deleteBullet(bullet)
            break // This bullet is destroyed, don't want it to hit anything else
          }
        }
      }
      else
      {
        //It's a enemy bullet, check collision with player
        for (let j = this.playerPlanes.length - 1; j >= 0; --j)
        {
          let player = this.playerPlanes[j]
          if (collision(bullet.x, bullet.y, bullet.width, bullet.height, player.x, player.y, player.width, player.height))
          {
            player.lives--
            if (player.lives <= 0)
            {
              print("hemos muerto")
            }
            this.deleteBullet(bullet)
            break // This bullet is destroyed, don't want it to hit anything else
          }
        }
      }
    }
    
    for (let i = this.powerUps.length - 1; i >= 0; --i)
    {
      let powerUp = this.powerUps[i]
      for (let j = this.playerPlanes.length - 1; j >= 0; --j)
      {
        let player = this.playerPlanes[j]
        if(collision(powerUp.x, powerUp.y, powerUp.width, powerUp.height, player.x, player.y, player.width, player.height))
        {
          powerUp.applyEffect()
          this.deletePowerUp(powerUp)
          print("Picked up powerUp")
        }
      }
    }
  }

  manageEnemies()
  {
    if(this.enemies.size < 2)
    {
      let numberToGenerate = random(2, 4) //allways will be from 4 to 6 enemies
      for(let i = 0; i < numberToGenerate; ++i)
      {
        this.generateRandomEnemy()
      }
    }
  }
  
  generateRandomEnemy()
  {
    let randomValue = random(0, 100)
    let randomX = random(0, World.width)
    if(randomValue < HardPlane.prob)
    {
      //hard plane
      this.enemies.add(new HardPlane(randomX, 0)) //this could be random
    }
    else
    {
      if(randomValue - HardPlane.prob < KamikazePlane.prob)
      {
        //kamikaze
        this.enemies.add(new KamikazePlane(randomX, 0)) //this could be random
      }
      else
      {
        //basic plane
        this.enemies.add(new BasicPlane(randomX, 0)) //this could be random
      }
    }
  }
  
  managePowerUps()
  {
    if(this.powerUps.size == 0)
    {
      this.timeForNextPowerUp -= delta()
      if (this.timeForNextPowerUp <= 0)
      {
        this.generateRandomPowerUp()
        this.timeForNextPowerUp = World.TimeBetweenPowerUps
      }
    }
  }
  
  generateRandomPowerUp()
  {
    print("PowerUp appears")
    let randomX = random(0, World.width)
    let randomY = random(World.height / 2.0, World.height)
    this.powerUps.add(new ScorePowerUp(randomX, randomY))
    //if we want another types of powerUps, add more logic here
  }

  updateTexts()
  {
    let textScore = "Points: " + CurrentScore;
    this.scoreText.setCadena(textScore); 

    let livesScore = "";
    let actualPlayer = 1;

    for (const playerPlane of this.playerPlanes.values())
    {
      livesScore += "P" + actualPlayer + ": " + playerPlane.lives + "\t";
      ++actualPlayer;
    }

   
    this.livesText.setCadena(livesScore); 
  }

  draw()
  {
    // Background
    image(images.background, 0, 0)
    
    // Bullets
    for (const enemy of this.enemies.values())
    {
      enemy.draw()
    }

    // Players
    for (const playerPlane of this.playerPlanes.values())
    {
      playerPlane.draw()
    }
    
    // Bullets
    for (const bullet of this.bullets.values())
    {
      bullet.draw()
    }
    
    // PowerUps
    for (const powerUp of this.powerUps.values())
    {
      powerUp.draw()
    }
    
    // Texts
    for (const text of this.texts.values())
    {
      text.draw()
    }

    this.scoreText.draw();
    this.livesText.draw();
  }
  
  addText(text)
  {
    this.texts.add(text)
  }
  addPlayerPlane(playerPlane)
  {
    this.playerPlanes.add(playerPlane)
  }
  addBullet(bullet)
  {
    this.bullets.add(bullet)
  }
  addPowerUp(powerUp)
  {
    this.powerUps.add(powerUp)
  }
  
  deletePlayerPlane(playerPlane)
  {
    this.playerPlanes.delete(playerPlane)
  }
  deleteBullet(bullet)
  {
    this.bullets.delete(bullet)
  }
  deletePowerUp(powerUp)
  {
    this.powerUps.delete(powerUp)
  }
  deleteEnemyPlane(plane)
  {
    this.enemies.delete(plane)
  }
}
World.width = 192
World.height = 157
World.TimeBetweenPowerUps = 10

function setup()
{
  createCanvas(World.width, World.height)
  noSmooth()
  textAlign(CENTER, CENTER)
  textFont('Trebuchet MS', 8)

  Text.size = textAscent() + textDescent()

  api.tracking.connect()
  
  worldInstance = new World()
}

const images = {}
const animations = {}

function range(from, to)
{
  return [...Array(to).keys()].slice(from)
}

function getSpritesList(name, first, last)
{
  return range(first, last).map(i => `${name}_${i.toString().padStart(2, '0')}`)
}

function preload() {
  const url = '/media/usera4300b002b'

  animations.plane = { frameList: getSpritesList("plane_idle", 0, 2), timePerFrame: 0.5, loop: true }

  const pngs = Object.keys(animations).flatMap(k => animations[k].frameList)
  for (const png of pngs)
  {
    images[png] = loadImage(`${url}/${png}.png`)
  }
  images.bullet = loadImage(`${url}/bullet_up.png`)
  images.scorePowerUp = loadImage(`${url}/powerup_score.png`)
  images.background = loadImage(`${url}/background.png`)
}

function draw()
{
  worldInstance.update(
    api.tracking.getBlobs()
  )
  //worldInstance.addText(new Text("asdf", 10))
  worldInstance.draw()
}