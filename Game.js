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
  constructor(x, y, interShootTime, w = Plane.width, h = Plane.height)
  {
    super("plane", x, y, w, h)
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
  
  shoot()
  {
  }
}

Plane.width = 18
Plane.height = 18

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
      worldInstance.deletePlayerPlane(this)
    }
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
    
    for (const blob of blobs)
    {
      if (!blob.assigned)
      {
        this.addPlayerPlane(new PlayerPlane(blob.id, blob.x, blob.y, 1.0))
      }
    }
  }

  draw()
  {
    // Background
    image(images.background, 0, 0)
    
    // Players
    for (const playerPlane of this.playerPlanes.values())
    {
      playerPlane.draw()
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

function getSpritesList(name, first, last)
{
  return range(first, last).map(i => `${name}_${i.toString().padStart(2, '0')}`)
}

function preload() {
  const url = '/media/usera4300b002b'
  const urlVictor = '/media/usere205ee2a5d'

  animations.plane = { frameList: getSpritesList("plane_idle", 0, 2), timePerFrame: 500, loop: true }
  print(animations.plane.frameList)

  const pngs = Object.keys(animations).flatMap(k => animations[k].frameList)
  for (const png of pngs)
  {
    images[png] = loadImage(`${url}/${png}.png`)
  }
  images["background"] = loadImage(`${url}/background.png`)
}

function draw()
{
  worldInstance.update(
    api.tracking.getBlobs()
  )
  worldInstance.addText(new Text("asdf", 10));
  worldInstance.draw()
}