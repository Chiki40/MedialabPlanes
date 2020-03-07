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
  
  move(x, y)
  {
    this.x = x
    this.y = y
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
}
Text.size = undefined

class Plane extends AnimatedEntity
{
  constructor(x, y, interShootTime, velocity, w = Plane.width, h = Plane.height)
  {
    super("plane", x, y, w, h)
    this.interShootTime = interShootTime
    this.currentInterShootTime = interShootTime
    this.isEnemy = true
    this.destroyPoints = 10
    this.velocityDown = velocity
    this.live = 1
  }

  update()
  {
    this.currentInterShootTime += delta()
    if (this.currentInterShootTime >= this.interShootTime)
    {
      this.shoot()
      this.currentInterShootTime = 0
    }

    this.moveDown()
  }
  
  shoot()
  {
    //print("PEW!")
    let bullet = new Bullet(this.isEnemy, this.x, this.y)
    worldInstance.addBullet(bullet)
  }

  moveDown()
  {
    //print(this.x)
    //print("mi posicion es [" + this.x + "," + this.y+ "]")
    this.y += delta() * this.velocityDown

    if (this.y + (this.h / 2.0) < 0 || this.y - (this.h / 2.0) > World.width)
    {
      // Delete bullet out of bounds
      worldInstance.deletePlane(this)
    }
  }
}
Plane.width = 18
Plane.height = 18

class PlayerPlane extends Plane
{
  constructor(id, x, y, interShootTime)
  {
    super(x, y, interShootTime, 0)
    this.id = id
    // Override isEnemy field to be false
    this.isEnemy = false
  }

  IsBlobAtDistance(blob)
  {
    return dist(blob.x, blob.y, this.x, this.y) < PlayerPlane.trackingDistance
  }

  IsMyBlob(blob)
  {
    return blob.id === this.id
  }

  update()
  {
    super.update()
    this.SyncWithBlobsId()
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
        this.move(blob.x, blob.y)
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

  SyncWithBlobsId()
  {
    this.assignBlob(b => this.IsMyBlob(b))
  }

  moveDown()
  {
    //do nothing, the player cant move
  }
}
PlayerPlane.trackingDistance = 10

BasicPlane_velocityDown = 2
BasicPlane_interShootTime = 10
BasicPlane_prob = 70
class BasicPlane extends Plane 
{
  constructor(x, y)
  {
    super(x, y, BasicPlane_interShootTime, BasicPlane_velocityDown)
    this.points = 20 //the points could be different for different types of planes
    this.live = 1
  }

  moveDown()
  {
    super.moveDown()
    //this plane dont do anything more
  }

  draw()
  {
    tint(255, 0, 0) // Tint blue
    super.draw()
    noTint() // Disable tint
  }
}

HardPlane_velocityDown = 4
HardPlane_interShootTime = 5
HardPlane_prob = 30
class HardPlane extends Plane 
{
  constructor(x, y)
  {
    super(x, y, HardPlane_interShootTime, HardPlane_velocityDown)
    this.points = 100 //the points could be different for different types of planes
    this.live = 5
  }

  moveD()
  {
    super.moveDown()
    //this plane dont do anything more
  }

  draw()
  {
    tint(0, 255, 0) // Tint green
    super.draw()
    noTint() // Disable tint
  }
}

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
    this.texts = new Set()
    this.enemies = new Set()
    this.timeForNextPowerUp = World.TimeBetweenPowerUps
    
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
  }

  checkCollisions()
  {
    for (const bullet of this.bullets.values())
    {
      if(!bullet.isFromEnemy)
      {
        for (const enemy of this.enemies.values())
        {
          if(collision(bullet.x, bullet.y, bullet.width, bullet.height, enemy.x, enemy.y, enemy.width, enemy.height))
          {
            //hay colision 
            enemy.live--
            if(enemy.live == 0)
            {
              CurrentScore += enemy.points
              this.deletePlane(enemy) //I assume that this dont broke anything
            }
            this.deleteBullet(bullet) //I assume that this dont broke anything
          }
        }
      }
      else
      {
        //its a enemy bullet, check collision with player
        for (const player of this.playerPlanes.values())
        {
          if(collision(bullet.x, bullet.y, bullet.width, bullet.height, player.x, player.y, player.width, player.height))
          {
            player.live--
            if(player.live == 0)
            {
              print("hemos muerto")
            }
          }
        }
      }
    }
    
    for (const powerUp of this.powerUps.values())
    {
        for (const player of this.playerPlanes.values())
        {
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

  generateRandomEnemy()
  {
    let randomValue = random(0, 100)
    let randomX = random(0, World.width)
    if(randomValue < HardPlane_prob)
    {
      //hard plane
      this.enemies.add(new HardPlane(randomX,0)) //this could be random
    }
    else
    {
      //basic plane
      this.enemies.add(new BasicPlane(randomX,0)) //this could be random
    }
    //if we want another types of planes, add more logic here
  }
  
  generateRandomPowerUp()
  {
    print("PowerUp appears")
    let randomX = random(0, World.width)
    let randomY = random(World.height / 2.0, World.height)
    this.powerUps.add(new ScorePowerUp(randomX, randomY))
    //if we want another types of powerUps, add more logic here
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
  }
  
  addText(text)
  {
    this.texts.add(text)
  }
  addPlayerPlane(playerPlane)
  {
    this.playerPlanes.add(playerPlane)
  }
  deletePlayerPlane(playerPlane)
  {
    this.playerPlanes.delete(playerPlane)
  }
  addBullet(bullet)
  {
    this.bullets.add(bullet)
  }
  addPowerUp(powerUp)
  {
    this.powerUps.add(powerUp)
  }
  
  deleteBullet(bullet)
  {
    this.bullets.delete(bullet)
  }
  deletePowerUp(powerUp)
  {
    this.powerUps.delete(powerUp)
  }
  deletePlane(plane)
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
  print(animations.plane.frameList)

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