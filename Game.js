function delta() {
  const fr = frameRate()
  return fr === 0 ? 1 : 1 / fr
}

function collision(X1, Y1, W1, H1, X2, Y2, W2, H2) {
  if (X1 < X2 + W2 &&
    X1 + W1 > X2 &&
    Y1 < Y2 + H2 &&
    Y1 + H1 > Y2) {
    return true
  }

  return false
}

function hitEnemy(enemy, playerID) {
  --enemy.lives
  if (enemy.lives <= 0) {
    killEnemy(enemy, playerID)
  }
}

function killEnemy(enemy, idPlayer) {
  // Score
  worldInstance.CurrentScore[idPlayer] += enemy.points
  
  // Explosion
  worldInstance.addExplosion(new Explosion(enemy.x, enemy.y))
  
  // Deletion
  worldInstance.deleteEnemy(enemy)
}

function hitPlayer(player) {
  --player.lives
  if (player.lives <= 0) {
    killPlayer(player)
  }
}

function killPlayer(player) {
  // Score
  worldInstance.BestScore[player.id] = max(worldInstance.BestScore[player.id], worldInstance.CurrentScore[player.id])
  let playerScore =  worldInstance.CurrentScore[player.id]
  if (playerScore > BestScoreEver) {
    BestScoreEver = playerScore
    saveBestScoreEver(playerScore)
  }
  worldInstance.CurrentScore[player.id] = 0
  
  // Explosion
  worldInstance.addExplosion(new Explosion(player.x, player.y))
  
  // Respawn time
  worldInstance.remainingRespawnTime[player.id] = World.PlayerRespawnTime
  
  // Deletion
  worldInstance.deletePlayer(player.id)
}

function saveBestScoreEver(score) {
  api.storage.set('bestScoreEver', score)
}

class Entity {
  constructor(x, y, w, h) {
    this.x = x
    this.y = y
    this.w = w
    this.h = h
  }

  draw() {

  }

  update() {

  }
}

class AnimatedEntity extends Entity {
  constructor(animation, x, y, w, h) {
    super(x, y, w, h)
    this.playAnim(animation)
  }

  playAnim(animation) {
    this.animation = animations[animation]
    this.setFrame(0)
    this.animTime = 0
    this.finishCalled = false
  }

  setFrame(frame) {
    this.image = images[this.animation.frameList[frame]]
    this.frame = frame
  }

  update() {
    super.update()

    this.animTime += delta()
    if (this.animTime >= this.animation.timePerFrame) {
      this.animTime = 0
      const l = this.animation.frameList.length

      if (this.frame === l - 1) {
        if (this.animation.finish && !this.finishCalled) {
          this.animation.finish(this)
          this.finishCalled = true
        }
        if (this.animation.loop) {
          this.setFrame(0)
        }
      } else {
        this.setFrame(this.frame + 1)
      }
    }
  }

  draw() {
    // This is a p5js function to draw sprites
    image(this.image, this.x - this.w / 2.0, this.y - this.h / 2.0)
  }
}

class Text extends Entity {
  constructor(txt, x, y, align = CENTER, w = World.width, h = Text.size * 4) {
    super(x, y, w, h)
    this.txt = txt
    this.align = align
  }

  draw() {
    fill('white')
    stroke('black')
    textAlign(this.align)
    text(this.txt, this.x, this.y, this.w, this.h)
  }

  setText(txt) {
    this.txt = txt
  }

  setAlign(align) {
    this.align = align
  }

}
Text.size = undefined

class Plane extends AnimatedEntity {
  constructor(x, y, interShootTime, lives, animation) {
    super(animation, x, y, Plane.width, Plane.height)
    this.interShootTime = interShootTime
    this.currentInterShootTime = interShootTime
    this.lives = lives
    this.maxLives = this.lives
    this.isEnemy = true
  }

  shoot() {
    let bullet = new Bullet(this.isEnemy, createVector(0, 1), this.x, this.y, this.w, this.h)
    worldInstance.addBullet(bullet)
    return bullet
  }

  update() {
    super.update()

    this.currentInterShootTime += delta()
    // Negative interShootTime means the plane can't shoot
    if (this.interShootTime >= 0 && this.currentInterShootTime >= this.interShootTime) {
      this.shoot()
      this.currentInterShootTime = 0
    }
  }

  draw() {
    this.drawColorLive()
    super.draw()
    noTint() // Disable tint
  }

  //same colos like breakout
  drawColorLive() {
    if (this.lives >= this.maxLives) {
      tint(255, 255, 255) // white
    }
    else if (this.lives <= 1) {
      tint(255, 0, 0) // red
    }
    else if (this.lives <= floor(this.maxLives * 0.25)) {
      tint(255, 128, 0) // orange
    }
    else if (this.lives <= floor(this.maxLives * 0.50)) {
      tint(255, 255, 0) // yellow
    }
    else {
      tint(255, 255, 255) // white
    }
  }
}
Plane.width = 20
Plane.height = 20

class EnemyPlane extends Plane {
  constructor(x, y, interShootTime, lives, animation, velocity, points) {
    super(x, y, interShootTime, lives, animation)
    this.isEnemy = true
    this.velocity = velocity
    this.points = points
  }

  move() {
    this.y += delta() * this.velocity
    if (this.y + (this.h / 2.0) < 0 || this.y - (this.h / 2.0) > World.height) {
      // Delete plane out of bounds (without killing it)
      worldInstance.deleteEnemy(this)
    }
  }

  update() {
    this.move()
    super.update()
  }
}

class PlayerPlane extends Plane {
  constructor(id, x, y) {
    super(x, y, PlayerPlane.interShootTime, PlayerPlane.lives, id == 0 ? PlayerPlane.player1IdleAnim : PlayerPlane.player2IdleAnim)
    this.id = id
    
    this.isEnemy = false

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
    print("Player " + id + " has joined!" + " and the lives are " + this.lives)
  }

  updateBlob() {
    // World assigns a blob to us in manageBlobs function, before calling PlayerPlane Update
    if (this.blob !== undefined) {
      // Invert coordinates, so it's more intuitive to the user
      this.x = World.width - this.blob.x
      this.y = World.height - this.blob.y
      // Player is online. Update disconnection time while player exists
      this.offlineState = false
      this.timeRemainingForDisconnection = PlayerPlane.DisconnectionTime
      // Clear it so a new blob could be assigned on the next frame
      this.blob = undefined
    } else {
      print("Player " + this.id + " not detected")
      // Player is offline, countdown for disconnection
      this.offlineState = true
      this.timeRemainingForDisconnection -= delta()
      if (this.timeRemainingForDisconnection <= 0.0) {
        print("Player " + this.id + " left")
        
        // Score
        worldInstance.BestScore[this.id] = max(worldInstance.BestScore[this.id], worldInstance.CurrentScore[this.id])
        let playerScore =  worldInstance.CurrentScore[this.id]
        if (playerScore > BestScoreEver) {
          BestScoreEver = playerScore
          saveBestScoreEver(playerScore)
        }
        worldInstance.CurrentScore[this.id] = 0
        
        // Deletion
        worldInstance.deletePlayer(this.id)
      }
    }
  }

  addRapidFireBuff(interShootTimeMultiplier, duration) {
    this.rapidFireRemainingDuration = duration
    this.interShootTime *= interShootTimeMultiplier
  }

  addTripleFireBuff(duration) {
    this.tripleFireRemainingDuration = duration
  }

  shoot() {
    // Offline players can't shoot
    if (this.offlineState) {
      return
    }

    let bulletCenter = super.shoot()
    bulletCenter.idPlayer = this.id
    if (this.tripleFireRemainingDuration > 0) {
      let bulletLeft = new Bullet(this.isEnemy, createVector(-1, 1), this.x, this.y, this.w, this.h)
      worldInstance.addBullet(bulletLeft)
      bulletLeft.idPlayer = this.id
      let bulletRight = new Bullet(this.isEnemy, createVector(1, 1), this.x, this.y, this.w, this.h)
      worldInstance.addBullet(bulletRight)
      bulletRight.idPlayer = this.id
    }
  }

  update() {
    // Player movement via camera tracking
    this.updateBlob()

    // Shooting
    super.update()

    // RapidFire PowerUp
    if (this.rapidFireRemainingDuration > 0.0) {
      this.rapidFireRemainingDuration -= delta()
      if (this.rapidFireRemainingDuration <= 0.0) {
        this.interShootTime = this.rapidFirePreviousInterShootTime
      }
    }

    // TripleFire PowerUp
    if (this.tripleFireRemainingDuration > 0.0) {
      this.tripleFireRemainingDuration -= delta()
    }
  }
}
PlayerPlane.trackingDistance = 10
PlayerPlane.interShootTime = 2
PlayerPlane.lives = 5
PlayerPlane.player1IdleAnim = "player1Plane_idle"
PlayerPlane.player2IdleAnim = "player2Plane_idle"
PlayerPlane.DisconnectionTime = 20.0


class BasicPlane extends EnemyPlane {
  constructor(x, y) {
    super(x, y, BasicPlane.interShootTime, BasicPlane.lives, BasicPlane.idleAnim, BasicPlane.velocity, BasicPlane.points)
  }

  update() {
    super.update()
  }

  move() {
    super.move()
    // this plane doesn't do anything else
  }
}
BasicPlane.velocity = 2
BasicPlane.interShootTime = 6
BasicPlane.points = 10
BasicPlane.lives = 2
BasicPlane.idleAnim = "basicEnemyPlane_idle"
BasicPlane.prob = 50

class HardPlane extends EnemyPlane {
  constructor(x, y) {
    super(x, y, HardPlane.interShootTime, HardPlane.lives, HardPlane.idleAnim, HardPlane.velocity, HardPlane.points)
    this.movementLeft = false
    let randomValue = random(0, 100)
    if (randomValue < 50) {
      this.movementLeft = true
    }
  }

  update() {
    super.update()
  }

  move() {
    super.move()

    //move also in the X coor
    this.x += delta() * this.velocity * this.movementLeft ? -1 : 1
    if (this.x + (this.w / 2.0) < 0 || this.x + (this.w / 2.0) > World.width) {
      this.movementLeft = !this.movementLeft
    }
  }
}
HardPlane.velocity = 4
HardPlane.interShootTime = 5
HardPlane.points = 100
HardPlane.lives = 5
HardPlane.idleAnim = "hardEnemyPlane_idle"
HardPlane.prob = 30

class KamikazePlane extends EnemyPlane {
  constructor(x, y) {
    super(x, y, KamikazePlane.interShootTime, KamikazePlane.lives, KamikazePlane.idleAnim, KamikazePlane.velocity, KamikazePlane.points)
  }

  update() {
    super.update()
  }

  move() {
    super.move()
    // this plane doesn't do anything else
  }
}
KamikazePlane.velocity = 10
KamikazePlane.interShootTime = -1 // Can't shoot
KamikazePlane.points = 50
KamikazePlane.lives = 1
KamikazePlane.prob = 20
KamikazePlane.idleAnim = "kamikazeEnemyPlane_idle"


class Bullet extends Entity {
  constructor(isFromEnemy, direction, parentX, parentY, parentW, parentH) {
    // Calculate where the bullet spawns
    let xPos = parentX
    let yPos = !isFromEnemy ? parentY - parentH / 2.0 : parentY + parentH / 2.0
    super(xPos, yPos, Bullet.width, Bullet.height)
    
    this.isFromEnemy = isFromEnemy
    this.direction = direction.normalize()
    // If bullet is from player, shooting forward means down
    if (!this.isFromEnemy) {
      direction.y *= -1
    } else // If bullet is from enemy, shooting laterally is inverted (no enemies shoot laterally right now)
    {
      direction.x *= -1
    }
    this.idPlayer = undefined
  }

  update() {
    // Move up or down depending on bullet's shooter
    let movementMagnitude = Bullet.speed * delta()
    this.x += this.direction.x * movementMagnitude
    this.y += this.direction.y * movementMagnitude
    // Check bounds
    if (this.y + (this.h / 2.0) < 0 || this.y - (this.h / 2.0) > World.width) {
      // Delete bullet out of bounds
      worldInstance.deleteBullet(this)
    }
  }

  draw() {
    if (this.isFromEnemy) {
      image(images.bulletBad, this.x - this.w / 2.0, this.y - this.h / 2.0)
    }
    else {
      image(this.idPlayer == 0 ? images.bulletGood : images.bulletGood2, this.x - this.w / 2.0, this.y - this.h / 2.0)
    }
  }
}
Bullet.speed = 25.0
Bullet.width = 8
Bullet.height = 8

class PowerUp extends Entity {
  constructor(x, y) {
    super(x, y, PowerUp.width, PowerUp.height)
    this.image = undefined // Overriden by each type of PowerUp
    this.remainingLifeTime = PowerUp.lifeTime
  }

  update() {
    this.remainingLifeTime -= delta()
    if (this.remainingLifeTime <= 0) {
      // Delete PowerUp out of bounds
      worldInstance.deletePowerUp(this)
    }
  }

  draw() {
    if (this.image !== undefined) {
      image(this.image, this.x - this.w / 2.0, this.y - this.h / 2.0)
    }
  }

  applyEffect(playerPlane) {}
}
PowerUp.timeBetweenPowerUps = 10.0
PowerUp.lifeTime = 8.0
PowerUp.width = 17
PowerUp.height = 17

class ScorePowerUp extends PowerUp {
  constructor(x, y) {
    super(x, y)
    this.image = images.scorePowerUp
  }

  applyEffect(playerPlane) {
    super.applyEffect(playerPlane)
    worldInstance.CurrentScore[playerPlane.id] += ScorePowerUp.ScoreGiven
  }
}
ScorePowerUp.ScoreGiven = 50

class LivesPowerUp extends PowerUp {
  constructor(x, y) {
    super(x, y)
    this.image = images.livesPowerUp
  }

  applyEffect(playerPlane) {
    super.applyEffect(playerPlane)
    playerPlane.lives = min(playerPlane.lives + LivesPowerUp.LivesGiven, playerPlane.maxLives)
  }
}
LivesPowerUp.LivesGiven = 1

class RapidFirePowerUp extends PowerUp {
  constructor(x, y) {
    super(x, y)
    this.image = images.rapidFirePowerUp
  }

  applyEffect(playerPlane) {
    super.applyEffect(playerPlane)
    playerPlane.addRapidFireBuff(RapidFirePowerUp.InterShootTimeMultiplier, RapidFirePowerUp.Duration)
  }
}
RapidFirePowerUp.InterShootTimeMultiplier = 0.3
RapidFirePowerUp.Duration = 10.0

class TripleFirePowerUp extends PowerUp {
  constructor(x, y) {
    super(x, y)
    this.image = images.tripleFirePowerUp
  }

  applyEffect(playerPlane) {
    super.applyEffect(playerPlane)
    playerPlane.addTripleFireBuff(TripleFirePowerUp.Duration)
  }
}
TripleFirePowerUp.Duration = 10.0

class Explosion extends AnimatedEntity {
  constructor(x, y) {
    super(Explosion.animation, x, y, Explosion.width, Explosion.height)
  }

  update() {
    super.update()
  }

  draw() {
    super.draw()
  }
}
Explosion.width = 20
Explosion.height = 20
Explosion.animation = "explosion"
Explosion.OnExplotionEndCallback = function (explosion)
{
  // Delete the explosion when animation finishes
  worldInstance.deleteExplosion(explosion)
}

class BackgroundManager {
  constructor(speed, images) {
    this.speed = speed
    this.images = images
    this.positions = new Array()

    for (let i = 0; i < this.images.length; ++i) {
      this.positions.push(-i * World.height)
    }
  }

  draw() {
    for (let i = 0; i < this.images.length; ++i) {
      image(this.images[i], 0, this.positions[i])
    }
  }

  update() {
    let increment = delta() * this.speed
    for (let i = 0; i < this.positions.length; ++i) {
      this.positions[i] += increment
      if (this.positions[i] >= World.height) {
        this.positions[i] -= World.height * this.positions.length
      }
    }
  }
}

class World {
  constructor() {
    this.playerPlanes = new Array(World.MaxPlayers)
    for (let i = 0; i < this.playerPlanes.length; ++i) {
      this.playerPlanes[i] = undefined
    }
    this.bullets = new Array()
    this.powerUps = new Array()
    this.explosions = new Array()
    this.enemies = new Array()
    this.timeForNextPowerUp = PowerUp.timeBetweenPowerUps

    this.playerUIText = [new Text("", 2, 20, LEFT), new Text("", 0, 20, RIGHT)]
    this.playerTexts = new Array(World.MaxPlayers)
    for (let i = 0; i < this.playerTexts.length; ++i) {
      this.playerTexts[i] = undefined
    }

    // Setting random background
    let backgroundSelected = images.backgrounds[floor(random(images.backgrounds.length))]
    this.backgroudMgr = new BackgroundManager(World.BackgroundSpeed, backgroundSelected)
    this.remainingRespawnTime = new Array(World.MaxPlayers)
    // Undefined means that the player is not respawning
    this.remainingRespawnTime.fill(undefined)

    this.bestScoreEverTxt = new Text("", 0, 0, CENTER)
    
    this.CurrentScore = new Array(World.MaxPlayers)
    this.BestScore = new Array(World.MaxPlayers)
    this.CurrentScore.fill(0, 0, World.MaxPlayers)
    this.BestScore.fill(0, 0, World.MaxPlayers)
    BestScoreEver = api.storage.get('bestScoreEver')
    if (BestScoreEver == null) {
      BestScoreEver = 0
      saveBestScoreEver(0)
    }
  }

  update(blobs) {
    this.manageRespawn()
    this.manageBlobs(blobs)
    this.manageEnemies()
    this.managePowerUps()
    this.backgroudMgr.update()

    // Players
    for (let i = 0; i < this.playerPlanes.length; ++i) {
      if (this.playerPlanes[i] !== undefined) {
        this.playerPlanes[i].update()
      }
    }

    // Enemies
    for (const enemy of this.enemies.values()) {
      enemy.update()
    }

    // Bullets
    for (const bullet of this.bullets.values()) {
      bullet.update()
    }

    // PowerUps
    for (const powerUp of this.powerUps.values()) {
      powerUp.update()
    }
    
    // Explosions
    for (const explosion of this.explosions.values()) {
      explosion.update()
    }


    this.checkCollisions()
    this.updateTexts()
  }
  
  manageRespawn() {
    for (let i = 0; i < World.MaxPlayers; ++i) {
      // This player is respawning
      if (this.remainingRespawnTime[i] !== undefined) {
        this.remainingRespawnTime[i] = max(this.remainingRespawnTime[i] - delta(), 0.0)
        // Respawn ended
        if (this.remainingRespawnTime[i] == 0.0) {
          // Set the respawn time to undefined as this is our way to say it's not respawning anymore
          this.remainingRespawnTime[i] = undefined
        }
      }
    }
  }

  manageBlobs(blobs) {
    // Create each player the first time we have a blob for him
    for (let i = 0; i < blobs.length && i < World.MaxPlayers; ++i) {
      // Player should not exist and not respawning
      if (this.playerPlanes[i] === undefined && this.remainingRespawnTime[i] === undefined) {
        // Spawn a plane
        this.addPlayer(new PlayerPlane(i, 0, 0))
      }
    }

    // First, each blob votes for its closest player
    for (let i = 0; i < blobs.length; ++i) {
      let blob = blobs[i]
      blob.player = undefined
      // Let's see which player is closer to this blob position
      blob.closestPlayer = undefined
      blob.closestDistance = 99999
      for (let j = 0; j < this.playerPlanes.length; ++j) {
        if (this.playerPlanes[j] === undefined) {
          continue
        }
        let player = this.playerPlanes[j]
        // For each comparison, convert blob space into player space (inverting axis)
        let xDist = (World.width - blob.x) - player.x
        let yDist = (World.height - blob.y) - player.y
        let distance = Math.sqrt(xDist * xDist + yDist * yDist)
        if (distance < blob.closestDistance) {
          blob.closestPlayer = player
          blob.closestDistance = distance
        }
      }
    }

    // Then, each player chooses the closest blob between the ones which voted for him
    for (let i = 0; i < this.playerPlanes.length; ++i) {
      if (this.playerPlanes[i] === undefined) {
        continue
      }
      let player = this.playerPlanes[i]
      // Let's see which blob is closer to this player position
      let closestBlobWhichVotedMe = undefined
      let closestBlobWhichVotedMeDistance = 99999
      for (let j = 0; j < blobs.length; ++j) {
        let blob = blobs[j]
        // Skip if this blob didn't vote for me
        if (blob.closestPlayer !== player) {
          continue
        }
        // Use the distance which the blob calculated early so we don't have to calculate it again
        if (blob.closestDistance < closestBlobWhichVotedMeDistance) {
          closestBlobWhichVotedMe = blob
          closestBlobWhichVotedMeDistance = blob.closestDistance
        }
      }
      // Found closest blob which voted for me, actually assign it to me
      if (closestBlobWhichVotedMe !== undefined) {
        player.blob = closestBlobWhichVotedMe
        // Tag it as assigned for next step
        closestBlobWhichVotedMe.player = player
      }
    }

    // Finally, each player who was not voted chooses the closest not-choosen blob
    for (let i = 0; i < this.playerPlanes.length; ++i) {
      if (this.playerPlanes[i] === undefined) {
        continue
      }
      let player = this.playerPlanes[i]
      // Skip if this player has already assigned a blob
      if (player.blob !== undefined) {
        continue
      }
      // Let's see which non-assigned blob is closer to this player position
      let closestBlob = undefined
      let closestBlobDistance = 99999
      for (let j = 0; j < blobs.length; ++j) {
        let blob = blobs[j]
        // Skip if this blob was assigned to a player
        if (blob.player !== undefined) {
          continue
        }

        // For each comparison, convert blob space into player space (inverting axis)
        let xDist = (World.width - blob.x) - player.x
        let yDist = (World.height - blob.y) - player.y
        let distance = Math.sqrt(xDist * xDist + yDist * yDist)
        if (distance < closestBlobDistance) {
          closestBlob = blob
          closestBlobDistance = distance
        }
      }
      if (closestBlob !== undefined) {
        player.blob = closestBlob
        closestBlob.player = player
      }
    }
  }

  checkCollisions() {
    //collisions between bullets and planes
    for (let i = this.bullets.length - 1; i >= 0; --i) {
      let bullet = this.bullets[i]
      if (!bullet.isFromEnemy) {
        for (let j = this.enemies.length - 1; j >= 0; --j) {
          let enemy = this.enemies[j]
          if (collision(bullet.x, bullet.y, bullet.w, bullet.h, enemy.x, enemy.y, enemy.w, enemy.h)) {
            // Collision
            hitEnemy(enemy, bullet.idPlayer)
            this.deleteBullet(bullet)
            break // This bullet is destroyed, don't want it to hit anything else
          }
        }
      } else {
        //It's an enemy bullet, check collision with player
        for (let j = this.playerPlanes.length - 1; j >= 0; --j) {
          if (this.playerPlanes[j] === undefined) {
            continue
          }
          let player = this.playerPlanes[j]
          // Offline players can't be killed
          if (player.offlineState) {
            continue
          }

          if (collision(bullet.x, bullet.y, bullet.w, bullet.h, player.x, player.y, player.w, player.h)) {
            hitPlayer(player)
            this.deleteBullet(bullet)
            break // This bullet is destroyed, don't want it to hit anything else
          }
        }
      }
    }
    //collisions between powerups and players
    for (let i = this.powerUps.length - 1; i >= 0; --i) {
      let powerUp = this.powerUps[i]
      for (let j = this.playerPlanes.length - 1; j >= 0; --j) {
        if (this.playerPlanes[j] === undefined) {
          continue
        }
        let player = this.playerPlanes[j]
        // Offline players can't get PowerUps
        if (player.offlineState) {
          continue
        }

        if (collision(powerUp.x, powerUp.y, powerUp.w, powerUp.h, player.x, player.y, player.w, player.h)) {
          powerUp.applyEffect(player)
          this.deletePowerUp(powerUp)
        }
      }
    }
    //collisions between planes
    for (let i = this.enemies.length - 1; i >= 0; --i) {
      let enemy = this.enemies[i]

      for (let j = this.playerPlanes.length - 1; j >= 0; --j) {
        if (this.playerPlanes[j] === undefined) {
          continue
        }
        let player = this.playerPlanes[j]
        // Offline players can't be killed
        if (player.offlineState) {
          continue
        }

        if (collision(enemy.x, enemy.y, enemy.w, enemy.h, player.x, player.y, player.w, player.h)) {
          killEnemy(enemy, player.id)
          hitPlayer(player)
        }
      }
    }
  }

  manageEnemies() {
    if (this.enemies.length < 2) {
      let numberToGenerate = random(2, 4) //allways will be from 4 to 6 enemies
      for (let i = 0; i < numberToGenerate; ++i) {
        this.generateRandomEnemy()
      }
    }
  }

  generateRandomEnemy() {
    let randomValue = random(0, 100)
    let randomX = random(0, World.width)
    if (randomValue < HardPlane.prob) {
      //hard plane
      this.addEnemy(new HardPlane(randomX, 0)) //this could be random
    } else {
      if (randomValue - HardPlane.prob < KamikazePlane.prob) {
        //kamikaze
        this.addEnemy(new KamikazePlane(randomX, 0)) //this could be random
      } else {
        //basic plane
        this.addEnemy(new BasicPlane(randomX, 0)) //this could be random
      }
    }
  }

  managePowerUps() {
    if (this.powerUps.length == 0) {
      this.timeForNextPowerUp -= delta()
      if (this.timeForNextPowerUp <= 0) {
        this.generateRandomPowerUp()
        this.timeForNextPowerUp = PowerUp.timeBetweenPowerUps
      }
    }
  }

  generateRandomPowerUp() {
    let randomX = random(0, World.width)
    let randomY = random(World.height / 2.0, World.height)
    let randomType = floor(random(4))
    let newPowerUp = undefined
    if (randomType == 0) {
      newPowerUp = new ScorePowerUp(randomX, randomY)
    } else if (randomType == 1) {
      newPowerUp = new RapidFirePowerUp(randomX, randomY)
    } else if(randomType == 2){
      newPowerUp = new TripleFirePowerUp(randomX, randomY)
    } else if(randomType == 3){
      newPowerUp =  new LivesPowerUp(randomX, randomY)
    }
    this.powerUps.push(newPowerUp)
  }

  updateTexts() {
    for (let i = 0; i < World.MaxPlayers; ++i) {
      let txt = ""
      if (this.playerPlanes[i] !== undefined)
      {
        let player = this.playerPlanes[i]
        let playerMarkerText = this.playerTexts[i]
        playerMarkerText.x = player.x
        playerMarkerText.y = player.y
        
        txt += "P: " + (i + 1) + "\n"
        txt += "Lives: " + player.lives + "\n"
        txt += "Score: " + worldInstance.CurrentScore[i] + "\n",
        txt += "Best: " + worldInstance.BestScore[i]
      }
      this.playerUIText[i].setText(txt)
    }
    this.bestScoreEverTxt.setText("HighScore: " +  BestScoreEver)
  }

  draw() {
    // Background
    this.backgroudMgr.draw()

    // Enemies
    for (const enemy of this.enemies.values()) {
      enemy.draw()
    }

    // Players
    for (let i = 0; i < this.playerPlanes.length; ++i) {
      if (this.playerPlanes[i] !== undefined) {
        this.playerPlanes[i].draw()
      }
    }

    // Bullets
    for (const bullet of this.bullets.values()) {
      bullet.draw()
    }

    // PowerUps
    for (const powerUp of this.powerUps.values()) {
      powerUp.draw()
    }
    
    // Explosions
    for (const explosion of this.explosions.values()) {
      explosion.draw()
    }

    // Texts
    for (let i = 0; i < this.playerUIText.length; ++i) {
      this.playerUIText[i].draw()
    }

    for (let i = 0; i < this.playerTexts.length; ++i) {
      if (this.playerTexts[i] !== undefined) {
        this.playerTexts[i].draw()
      }
    }

    this.bestScoreEverTxt.draw()
  }

  addPlayer(player) {
    this.playerPlanes[player.id] = player
    this.playerTexts[player.id] = new Text("P" + (player.id + 1), player.x, player.y, CENTER, 5, 40)
  }
  addBullet(bullet) {
    this.bullets.push(bullet)
  }
  addPowerUp(powerUp) {
    this.powerUps.push(powerUp)
  }
  addExplosion(explosion) {
    this.explosions.push(explosion)
  }
  addEnemy(enemy) {
    this.enemies.push(enemy)
  }

  deletePlayer(id) {
    if (this.playerPlanes[id] !== undefined) {
      this.playerPlanes[id] = undefined
      this.playerTexts[id] = undefined
    }
  }
  deleteBullet(bullet) {
    for (let i = 0; i < this.bullets.length; ++i) {
      if (this.bullets[i] == bullet) {
        this.bullets.splice(i, 1)
        break
      }
    }
  }
  deletePowerUp(powerUp) {
    for (let i = 0; i < this.powerUps.length; ++i) {
      if (this.powerUps[i] == powerUp) {
        this.powerUps.splice(i, 1)
        break
      }
    }
  }
  deleteExplosion(explosion) {
    for (let i = 0; i < this.explosions.length; ++i) {
      if (this.explosions[i] == explosion) {
        this.explosions.splice(i, 1)
        break
      }
    }
  }
  deleteEnemy(enemy) {
    for (let i = 0; i < this.enemies.length; ++i) {
      if (this.enemies[i] == enemy) {
        this.enemies.splice(i, 1)
        break
      }
    }
  }
  
  Destroy() {
    for (let i = 0; i < this.playerPlanes.length; ++i) {
      this.playerPlanes[i] = undefined
      this.playerTexts[i] = undefined
    }
    this.playerPlanes.splice(0, this.playerPlanes.length)
    this.bullets.splice(0, this.bullets.length)
    this.powerUps.splice(0, this.powerUps.length)
    this.explosions.splice(0, this.explosions.length)
    this.enemies.splice(0, this.enemies.length)
    this.playerUIText = undefined
    this.remainingRespawnTime.splice(0, this.remainingRespawnTime.length)
    this.bestScoreEverTxt = undefined
    this.CurrentScore.splice(0, this.CurrentScore.length)
    this.BestScore.splice(0, this.CurrentScore.length)
  }
}
World.width = 192
World.height = 157
World.BackgroundSpeed = 10.0
World.MaxPlayers = 2
World.PlayerRespawnTime = 5.0
BestScoreEver = undefined

function setup() {
  createCanvas(World.width, World.height)
  noSmooth()
  textAlign(CENTER, CENTER)
  textFont('Trebuchet MS', 8)

  Text.size = textAscent() + textDescent()

  api.tracking.connect()

  worldInstance = new World()
}

images = {}
animations = {}
endingScreenImage = undefined

function range(from, to) {
  return [...Array(to).keys()].slice(from)
}

function getSpritesList(name, first, last) {
  return range(first, last).map(i => `${name}_${i.toString().padStart(2, '0')}`)
}

function preload() {
  let url = '/media/usera4300b002b'

  animations.player1Plane_idle = {
    frameList: getSpritesList("player1_idle", 0, 2),
    timePerFrame: 0.5,
    loop: true
  }
  animations.player2Plane_idle = {
    frameList: getSpritesList("player2_idle", 0, 2),
    timePerFrame: 0.5,
    loop: true
  }
  animations.basicEnemyPlane_idle = {
    frameList: getSpritesList("enemy1_idle", 0, 2),
    timePerFrame: 0.5,
    loop: true
  }
  animations.hardEnemyPlane_idle = {
    frameList: getSpritesList("enemy2_idle", 0, 2),
    timePerFrame: 0.5,
    loop: true
  }
  animations.kamikazeEnemyPlane_idle = {
    frameList: getSpritesList("enemy3_idle", 0, 2),
    timePerFrame: 0.5,
    loop: true
  }
  animations.explosion = {
    frameList: getSpritesList("explosion", 0, 2),
    timePerFrame: 0.5,
    loop: false,
    finish: Explosion.OnExplotionEndCallback
  }
  let pngs = Object.keys(animations).flatMap(k => animations[k].frameList)
  for (const png of pngs) {
    images[png] = loadImage(`${url}/${png}.png`)
  }
  images.bulletGood = loadImage(`${url}/ball_blue.png`)
  images.bulletGood2 = loadImage(`${url}/ball_green.png`)
  images.bulletBad = loadImage(`${url}/ball_red.png`)
  images.scorePowerUp = loadImage(`${url}/score_power_up.png`)
  images.livesPowerUp = loadImage(`${url}/ball_red.png`)
  images.rapidFirePowerUp = loadImage(`${url}/rapid_fire_power_up.png`)
  images.tripleFirePowerUp = loadImage(`${url}/triple_fire_power_up.png`)
  images.backgrounds = new Array(
                          new Array(
                            loadImage(`${url}/background_farm_05.png`),
                            loadImage(`${url}/background_farm_04.png`),
                            loadImage(`${url}/background_farm_03.png`),
                            loadImage(`${url}/background_farm_02.png`),
                            loadImage(`${url}/background_farm_01.png`)
                          )
                        )
}

function draw() {
  // worldInstance is undefined when api.project.onAboutToStop is called
  if (worldInstance !== undefined) {
    worldInstance.update(
      api.tracking.getBlobs()
    )
    worldInstance.draw()
  }
  else {
    // World destroyed, show ending screen
    if (endingScreenImage === undefined) {
      endingScreenImage = createImage(192, 157)
      endingScreenImage.loadPixels()
      for (let i = 0; i < endingScreenImage.width; i++) {
        for (let j = 0; j < endingScreenImage.height; j++) {
          endingScreenImage.set(i, j, color(0, 0, 0))
        }
      }
      endingScreenImage.updatePixels()
    }
    image(endingScreenImage, 0, 0)
    text("THE GAME HAS ENDED", World.width * 0.1, World.height * 0.3, World.width * 0.8, World.height * 0.15)
    text("Highscore: " + BestScoreEver, World.width * 0.1, World.height * 0.55, World.width * 0.8, World.height * 0.15)
  }
}

api.project.onAboutToStop(function () {
  // worldInstance is undefined if api.project.onAboutToStop was already called
  if (worldInstance !== undefined) {
    worldInstance.Destroy()
    worldInstance = undefined
    
    // Global stuff from preload
    animations = undefined
    images = undefined
  }
})