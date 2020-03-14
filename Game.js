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

  draw()
  {
    // This is a p5js function to draw sprites
    image(this.image, this.x, this.y)
  }
}

class Text extends Entity
{
  constructor(txt, x, y, w = World.width, h = Text.size * 4)
  {
    super(x, y, w, h)
    this.txt = txt
  }

  draw()
  {
    fill('white')
    stroke('black')
    text(this.txt, this.x, this.y, this.w, this.h)
  }

  setText(txt)
  {
    this.txt = txt;
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
    let bullet = new Bullet(this.isEnemy, createVector(0, 1), this.x, this.y)
    worldInstance.addBullet(bullet)
  }

  update()
  {
    super.update()
    
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
    this.move()
    super.update()
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
  constructor(id, x, y, interShootTime = PlayerPlane.interShootTime)
  {
    super(x, y, interShootTime, 0)
    this.isEnemy = false
    this.id = id
    
    // For RapidFire PowerUp
    this.rapidFirePreviousInterShootTime = this.interShootTime
    this.rapidFireRemainingDuration = 0.0
    
    // For TripleFire PowerUp
    this.tripleFireRemainingDuration = 0.0
    
    // For blob tracking
    this.blob = undefined
    
    // For disconnection
    this.timeRemainingForDisconnection = PlayerPlane.DisconnectionTime
    this.offlineState = false
    
    print("Player " + id + " has joined!")
  }

  updateBlob()
  {
    // World assigns a blob to us in manageBlobs function, before calling PlayerPlane Update
    if (this.blob !== undefined)
    {
      const x = this.blob.x - this.x
      const y = this.blob.y - this.y
      if (x !== 0 || y !== 0)
      {
        this.x = this.blob.x
        this.y = this.blob.y
      }
      // Player is online. Update disconnection time while player exists
      this.offlineState = false
      this.timeRemainingForDisconnection = PlayerPlane.DisconnectionTime
      // Clear it so a new blob could be assigned on the next frame
      this.blob = undefined
    }
    else
    {
      print("Player " + this.id + " not detected")
      // Player is offline, countdown for disconnection
      this.offlineState = true
      this.timeRemainingForDisconnection -= delta()
      if (this.timeRemainingForDisconnection <= 0.0)
      {
        print("Player " + this.id + " left")
        worldInstance.deletePlayerPlane(this)
      }
    }
  }
  
  addRapidFireBuff(interShootTimeMultiplier, duration)
  {
    this.rapidFireRemainingDuration = duration
    this.interShootTime *= interShootTimeMultiplier
  }
  
  addTripleFireBuff(duration)
  {
    this.tripleFireRemainingDuration = duration
  }
  
  shoot()
  {
    // Offline players can't shoot
    if (this.offlineState)
    {
      return
    }
    
    super.shoot()
    if (this.tripleFireRemainingDuration > 0)
    {
      let bulletLeft = new Bullet(this.isEnemy, createVector(-1, 1), this.x, this.y)
      worldInstance.addBullet(bulletLeft)
      let bulletRight = new Bullet(this.isEnemy, createVector(1, 1), this.x, this.y)
      worldInstance.addBullet(bulletRight)
    }
  }

  update()
  {
    // Player movement via camera tracking
    this.updateBlob()
    
    // Shooting
    super.update()
    
    // RapidFire PowerUp
    if (this.rapidFireRemainingDuration > 0.0)
    {
      this.rapidFireRemainingDuration -= delta()
      if (this.rapidFireRemainingDuration <= 0.0)
      {
        this.interShootTime = this.rapidFirePreviousInterShootTime
      }
    }
    
    // TripleFire PowerUp
    if (this.tripleFireRemainingDuration > 0.0)
    {
      this.tripleFireRemainingDuration -= delta()
    }
  }
  
  draw()
  {
    super.draw()
  }
}
PlayerPlane.trackingDistance = 10
PlayerPlane.interShootTime = 10
PlayerPlane.lives = 10;
PlayerPlane.DisconnectionTime = 20.0


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
HardPlane.lives = 5;
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
KamikazePlane.lives = 1;
KamikazePlane.prob = 20


class Bullet extends Entity
{
  constructor(isFromEnemy, direction, x = 0, y = 0, w = Bullet.width, h = Bullet.height)
  {
    super(x, y, w, h)
    this.isFromEnemy = isFromEnemy
    this.direction = direction.normalize()
    // If bullet is from player, shooting forward means down
    if (!this.isFromEnemy)
    {
      direction.y *= -1
    }
    else // If bullet is from enemy, shooting laterally is inverted (no enemies shoot laterally right now)
    {
      direction.x *= -1
    }
  }
  
  update()
  {
    // Move up or down depending on bullet's shooter
    let movementMagnitude = Bullet.speed * delta()
    this.x += this.direction.x * movementMagnitude
    this.y += this.direction.y * movementMagnitude
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
  
  applyEffect(playerPlane)
  {
  }
}
PowerUp.timeBetweenPowerUps = 10.0
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
  
  applyEffect(playerPlane)
  {
    super.applyEffect(playerPlane)
    CurrentScore += ScorePowerUp.ScoreGiven
  }
}
ScorePowerUp.ScoreGiven = 50

class RapidFirePowerUp extends PowerUp
{
  constructor(x = 0, y = 0)
  {
    super(x, y)
    this.image = images.rapidFirePowerUp
  }
  
  applyEffect(playerPlane)
  {
    super.applyEffect(playerPlane)
    playerPlane.addRapidFireBuff(RapidFirePowerUp.InterShootTimeMultiplier, RapidFirePowerUp.Duration)
  }
}
RapidFirePowerUp.InterShootTimeMultiplier = 0.3
RapidFirePowerUp.Duration = 10.0

class TripleFirePowerUp extends PowerUp
{
  constructor(x = 0, y = 0)
  {
    super(x, y)
    this.image = images.tripleFirePowerUp
  }
  
  applyEffect(playerPlane)
  {
    super.applyEffect(playerPlane)
    playerPlane.addTripleFireBuff(TripleFirePowerUp.Duration)
  }
}
TripleFirePowerUp.Duration = 10.0

class BackgroundManager extends Entity
{
  constructor(velocidad, imagenes)
  {
    super(0,0,0,0);

    this._velocidad = velocidad;
    this._imagenes = imagenes;
    this._posiciones = new Array()

    for(let i = 0;  i < this._imagenes.length; ++i)
    {
      this._posiciones.push( -i * World.height)
    }
  }

  draw()
  {
    for(let i = 0; i < this._imagenes.length; ++i)
    {
      image(this._imagenes[i], 0, this._posiciones[i])
    }
  }

  update()
  { 
    let increment = delta() * this._velocidad;
    for(let i = 0; i < this._posiciones.length; ++i)
    {
      this._posiciones[i] += increment;
      if(this._posiciones[i] >= World.height)
      {
        this._posiciones[i] -= World.height * this._posiciones.length;
      }
    }
  }
}

CurrentScore = 0
class World
{
  constructor()
  {
    this.playerPlanes = new Array()
    this.bullets = new Array()
    this.powerUps = new Array()
    this.enemies = new Array()
    this.timeForNextPowerUp = PowerUp.timeBetweenPowerUps
    
    this.scoreText = new Text("", 0, -10)
    this.livesText = new Text("", 0, 10)
    this.playerTexts = new Array()

    this.backgroudMgr = new BackgroundManager(10, new Array(images.background,images.background));
  }

  update(blobs)
  {
    this.manageBlobs(blobs)
    this.manageEnemies()
    this.managePowerUps()
    this.backgroudMgr.update();
    
    // Players
    for (const playerPlane of this.playerPlanes.values())
    {
      playerPlane.update()
    }
    
    // Enemies
    for (const enemy of this.enemies.values())
    {
      enemy.update()
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
    this.updateTexts()
  }

  manageBlobs(blobs)
  {
    // Create each player the first time we have a blob for him
    for (let i = 0; i < blobs.length && i < World.MaxPlayers; ++i)
    {
      if (this.playerPlanes.length <= i)
      {
        this.addPlayerPlane(new PlayerPlane(i, blobs[i].x, blobs[i].y))
      }
    }
    
    // First, each blob votes for its closest player
    for (let i = 0; i < blobs.length; ++i)
    {
      let blob = blobs[i]
      blob.player = undefined
      // Let's see which player is closer to this blob position
      blob.closestPlayer = undefined
      blob.closestDistance = 99999
      for (let j = 0; j < this.playerPlanes.length; ++j)
      {
        let player = this.playerPlanes[j]
        let xDist = blob.x - player.x
        let yDist = blob.y - player.y
        let distance = Math.sqrt(xDist * xDist + yDist * yDist)
        if (distance < blob.closestDistance)
        {
          blob.closestPlayer = player
          blob.closestDistance = distance
        }
      }
    }
    
    // Then, each player chooses the closest blob between the ones which voted for him
    for (let i = 0; i < this.playerPlanes.length; ++i)
    {
      let player = this.playerPlanes[i]
      // Let's see which blob is closer to this player position
      let closestBlobWhichVotedMe = undefined
      let closestBlobWhichVotedMeDistance = 99999
      for (let j = 0; j < blobs.length; ++j)
      {
        let blob = blobs[j]
        // Skip if this blob didn't vote for me
        if (blob.closestPlayer !== player)
        {
          continue
        }
        // Use the distance which the blob calculated early so we don't have to calculate it again
        if (blob.closestDistance < closestBlobWhichVotedMeDistance)
        {
          closestBlobWhichVotedMe = blob
          closestBlobWhichVotedMeDistance = blob.closestDistance
        }
      }
      // Found closest blob which voted for me, actually assign it to me
      if (closestBlobWhichVotedMe !== undefined)
      {
        player.blob = closestBlobWhichVotedMe
        // Tag it as assigned for next step
        closestBlobWhichVotedMe.player = player
      }
    }
    
    // Finally, each player who was not voted chooses the closest not-choosen blob
    for (let i = 0; i < this.playerPlanes.length; ++i)
    {
      let player = this.playerPlanes[i]
      // Skip if this player has already assigned a blob
      if (player.blob !== undefined)
      {
        continue
      }
      // Let's see which non-assigned blob is closer to this player position
      let closestBlob = undefined
      let closestBlobDistance = 99999
      for (let j = 0; j < blobs.length; ++j)
      {
        let blob = blobs[j]
        // Skip if this blob was assigned to a player
        if (blob.player !== undefined)
        {
          continue
        }
        
        let xDist = blob.x - player.x
        let yDist = blob.y - player.y
        let distance = Math.sqrt(xDist * xDist + yDist * yDist)
        if (distance < closestBlobDistance)
        {
          closestBlob = blob
          closestBlobDistance = distance
        }
      }
      if (closestBlob !== undefined)
      {
        player.blob = closestBlob
        closestBlob.player = player
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
          if (collision(bullet.x, bullet.y, bullet.w, bullet.h, enemy.x, enemy.y, enemy.w, enemy.h))
          {
            // Collision
            --enemy.lives
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
          // Offline players can't be killed
          if (player.offlineState)
          {
            continue
          }
          
          if (collision(bullet.x, bullet.y, bullet.w, bullet.h, player.x, player.y, player.w, player.h))
          {
            --player.lives
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
         // Offline players can't get PowerUps
        if (player.offlineState)
        {
          continue
        }
          
        if(collision(powerUp.x, powerUp.y, powerUp.w, powerUp.h, player.x, player.y, player.w, player.h))
        {
          powerUp.applyEffect(player)
          this.deletePowerUp(powerUp)
          print("Picked up powerUp")
        }
      }
    }
  }

  manageEnemies()
  {
    if(this.enemies.length < 2)
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
      this.enemies.push(new HardPlane(randomX, 0)) //this could be random
    }
    else
    {
      if(randomValue - HardPlane.prob < KamikazePlane.prob)
      {
        //kamikaze
        this.enemies.push(new KamikazePlane(randomX, 0)) //this could be random
      }
      else
      {
        //basic plane
        this.enemies.push(new BasicPlane(randomX, 0)) //this could be random
      }
    }
  }
  
  managePowerUps()
  {
    if(this.powerUps.length == 0)
    {
      this.timeForNextPowerUp -= delta()
      if (this.timeForNextPowerUp <= 0)
      {
        this.generateRandomPowerUp()
        this.timeForNextPowerUp = PowerUp.timeBetweenPowerUps
      }
    }
  }
  
  generateRandomPowerUp()
  {
    print("PowerUp appears")
    let randomX = random(0, World.width)
    let randomY = random(World.height / 2.0, World.height)
    let randomType = floor(random(3))
    print(randomType)
    let newPowerUp = undefined
    if (randomType == 0)
    {
      newPowerUp = new ScorePowerUp(randomX, randomY)
    }
    else if (randomType == 1)
    {
      newPowerUp = new RapidFirePowerUp(randomX, randomY)
    }
    else
    {
      newPowerUp = new TripleFirePowerUp(randomX, randomY)
    }
    this.powerUps.push(newPowerUp)
  }

  updateTexts()
  {
    let textScore = "Points: " + CurrentScore;
    this.scoreText.setText(textScore); 

    let livesScore = "";
    for (let i = 0; i < this.playerPlanes.length; ++i)
    {
      let currText = this.playerTexts[i]
      let currPlayerPlane = this.playerPlanes[i]
      currText.x = currPlayerPlane.x
      currText.y = currPlayerPlane.y
      livesScore += "P" + currPlayerPlane.id + ": " + currPlayerPlane.lives + "\t";
    }
    this.livesText.setText(livesScore); 
  }

  draw()
  {
    // Background
    this.backgroudMgr.draw();
    
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
    this.scoreText.draw()
    this.livesText.draw()
    for (const playerText of this.playerTexts.values())
    {
      playerText.draw()
    }
  }
  
  addPlayerPlane(playerPlane)
  {
    this.playerPlanes.push(playerPlane)
    this.playerTexts.push(new Text("P" + playerPlane.id, playerPlane.x, playerPlane.y, 20))
  }
  addBullet(bullet)
  {
    this.bullets.push(bullet)
  }
  addPowerUp(powerUp)
  {
    this.powerUps.push(powerUp)
  }
  
  deletePlayerPlane(playerPlane)
  {
    for (let i = 0; i < this.playerPlanes.length; ++i)
    {
      if (this.playerPlanes[i] == playerPlane)
      {
        this.playerPlanes.splice(i, 1)
        this.playerTexts.splice(i, 1)
        break
      }
    }
  }
  deleteBullet(bullet)
  {
    for (let i = 0; i < this.bullets.length; ++i)
    {
      if (this.bullets[i] == bullet)
      {
        this.bullets.splice(i, 1)
        break
      }
    }
  }
  deletePowerUp(powerUp)
  {
    for (let i = 0; i < this.powerUps.length; ++i)
    {
      if (this.powerUps[i] == powerUp)
      {
        this.powerUps.splice(i, 1)
        break
      }
    }
  }
  deleteEnemyPlane(plane)
  {
    for (let i = 0; i < this.enemies.length; ++i)
    {
      if (this.enemies[i] == plane)
      {
        this.enemies.splice(i, 1)
        break
      }
    }
  }
}
World.width = 192
World.height = 157
World.MaxPlayers = 2

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
  images.rapidFirePowerUp = loadImage(`${url}/powerup_score.png`)
  images.tripleFirePowerUp = loadImage(`${url}/powerup_score.png`)
  images.background = loadImage(`${url}/background.png`)
}

function draw()
{
  worldInstance.update(
    api.tracking.getBlobs()
  )
  worldInstance.draw()
}