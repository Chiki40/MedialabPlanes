function delta()
{
  const fr = frameRate()
  return fr === 0 ? 1 : 1000 / fr
}

class Entity
{
  constructor(x = 0, y = 0, w, h = w)
  {
    this.move(x, y)
    this.w = w
    this.h = h
  }

  /**
   * @param {number} x
   * @param {number} y
   */
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
    image(this.image, x, y)
  }
}

class Text extends Entity
{
  constructor(cadena, y)
  {
    super(0, y, Habitacion.ancho, Text.size * 4)
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
  constructor(x, y, w = Plane.width, h = Plane.height)
  {
    super("idle", x, y, w, h)
    this.interShootTime = interShootTime
    this.currentInterShootTime = interShootTime
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
}

Plane.width = 18
Plane.height = 23

class PlayerPlane extends Plane
{
  constructor(id, x, y, interShootTime)
  {
    super(x, y, interShootTime)
    this.id = id
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

  shoot()
  {
  }

  assignBlob(f)
  {
    const blob = this.blobs.find(f)

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
      this.deletePlayerPlane(this)
    }
  }

  SyncWithBlobsPos()
  {
    this.assignBlob(b => this.IsBlobAtDistance(b))
  }

  SyncWithBlobsId()
  {
    this.assignBlob(b => this.IsMyBlob(b))
  }
}

PlayerPlane.trackingDistance = 10

class World
{
  constructor()
  {
    this.playerPlanes = new Set()
    this.texts = new Set()
  }

  update(blobs)
  {
    this.blobs = blobs
    
    for (const playerPlane of this.playerPlanes.values())
    {
      playerPlane.update()
    }
    
    for (const blob of blobs) {
      if (!blob.assigned) {
        this.playerPlane(new PlayerPlane(blob.id, blob.x, blob.y, 1.0))
      }
    }
  }

  draw()
  {
    image(images.plaza, 0, 0)
    for (const playerPlane of this.playerPlanes.values())
    {
      playerPlane.draw()
    }

    for (const text of this.texts.values())
    {
      text.draw()
    }
  }
  
  addText(text)
  {
    this.texts.add(text)
  }

  playerPlane(playerPlane)
  {
    this.playerPlanes.add(playerPlane)
  }
  
  deletePlayerPlane(playerPlane)
  {
    this.playerPlanes.delete(playerPlane)
  }
}

World.width = 192
World.height = 157

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

function f(name, first, last)
{
  return range(last, first).map(i => `${name}.ani.${i.toString().padStart(4, '0')}`)
}

function preload() {
  const url = '/media/usera4300b002b'

  animations.plane = { frameList: f("idle", 0, 2), timePerFrame: 500, loop: true }

  const pngs = Object.keys(animations).flatMap(k => animations[k].frameList)
  for (const png of pngs)
  {
    images[png] = loadImage(`${url}/${png}.png`)
  }
}

function draw()
{
  drawWorld()
}

function drawWorld()
{
  worldInstance.update(
    api.tracking.getBlobs()
  )
  worldInstance.draw()
}