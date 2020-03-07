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
    if (this.y + (this.h / 2.0) < 0 || this.y - (this.h / 2.0) > World.width)
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
    super.draw()
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

class BasicPlane extends EnemyPlane 
{
  constructor(x, y)
  {
    super(x, y, BasicPlane.interShootTime, BasicPlane.velocity)
    this.points = 20
    this.lives = 1
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

  draw()
  {
    tint(0, 0, 255) // Tint blue
    super.draw()
    noTint() // Disable tint
  }
}
BasicPlane.velocity = 2
BasicPlane.interShootTime = 10
BasicPlane.prob = 70

class HardPlane extends EnemyPlane 
{
  constructor(x, y)
  {
    super(x, y, HardPlane.interShootTime, HardPlane.velocity)
    this.points = 100
    this.lives = 5
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

  draw()
  {
    tint(0, 255, 0) // Tint green
    super.draw()
    noTint() // Disable tint
  }
}
HardPlane.velocity = 4
HardPlane.interShootTime = 5
HardPlane.prob = 30

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
      //basic plane
      this.enemies.add(new BasicPlane(randomX, 0)) //this could be random
    }
    //if we want another types of planes, add more logic here
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