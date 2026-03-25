import AmmoFactory from 'ammojs-typed'

export type AmmoApi = Awaited<ReturnType<typeof AmmoFactory>>

let ammoSingleton: Promise<AmmoApi> | null = null

export function getAmmo(): Promise<AmmoApi> {
  if (!ammoSingleton) ammoSingleton = AmmoFactory()
  return ammoSingleton
}

export type PhysicsWorld = {
  Ammo: AmmoApi
  world: InstanceType<AmmoApi['btDiscreteDynamicsWorld']>
  dispatcher: InstanceType<AmmoApi['btCollisionDispatcher']>
  tmpTransform: InstanceType<AmmoApi['btTransform']>
}

export async function createWorld(): Promise<PhysicsWorld> {
  const Ammo = await getAmmo()

  const collisionConfiguration = new Ammo.btDefaultCollisionConfiguration()
  const dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration)
  const broadphase = new Ammo.btDbvtBroadphase()
  const solver = new Ammo.btSequentialImpulseConstraintSolver()
  const world = new Ammo.btDiscreteDynamicsWorld(dispatcher, broadphase, solver, collisionConfiguration)
  world.setGravity(new Ammo.btVector3(0, -9.81, 0))

  const tmpTransform = new Ammo.btTransform()

  return { Ammo, world, dispatcher, tmpTransform }
}

export type RigidBodyBundle = {
  body: InstanceType<AmmoApi['btRigidBody']>
  motionState?: InstanceType<AmmoApi['btDefaultMotionState']>
  shape: InstanceType<AmmoApi['btCollisionShape']>
}

export function createStaticBox(args: {
  Ammo: AmmoApi
  world: InstanceType<AmmoApi['btDiscreteDynamicsWorld']>
  halfExtents: [number, number, number]
  position: [number, number, number]
  restitution?: number
  friction?: number
  userIndex?: number
}): RigidBodyBundle {
  const { Ammo, world, halfExtents, position, restitution = 0.0, friction = 0.8, userIndex } = args
  const shape = new Ammo.btBoxShape(new Ammo.btVector3(halfExtents[0], halfExtents[1], halfExtents[2]))
  const transform = new Ammo.btTransform()
  transform.setIdentity()
  transform.setOrigin(new Ammo.btVector3(position[0], position[1], position[2]))
  const motionState = new Ammo.btDefaultMotionState(transform)

  const localInertia = new Ammo.btVector3(0, 0, 0)
  const rbInfo = new Ammo.btRigidBodyConstructionInfo(0, motionState, shape, localInertia)
  const body = new Ammo.btRigidBody(rbInfo)
  body.setRestitution(restitution)
  body.setFriction(friction)
  if (typeof userIndex === 'number') body.setUserIndex(userIndex)

  world.addRigidBody(body)
  return { body, motionState, shape }
}

export function createDynamicCapsule(args: {
  Ammo: AmmoApi
  world: InstanceType<AmmoApi['btDiscreteDynamicsWorld']>
  radius: number
  height: number
  mass: number
  position: [number, number, number]
  restitution?: number
  friction?: number
  angularFactor?: [number, number, number]
  userIndex?: number
}): RigidBodyBundle {
  const {
    Ammo,
    world,
    radius,
    height,
    mass,
    position,
    restitution = 0.0,
    friction = 0.8,
    angularFactor = [0, 1, 0],
    userIndex,
  } = args

  const shape = new Ammo.btCapsuleShape(radius, height)
  const transform = new Ammo.btTransform()
  transform.setIdentity()
  transform.setOrigin(new Ammo.btVector3(position[0], position[1], position[2]))
  const motionState = new Ammo.btDefaultMotionState(transform)

  const localInertia = new Ammo.btVector3(0, 0, 0)
  shape.calculateLocalInertia(mass, localInertia)

  const rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, shape, localInertia)
  const body = new Ammo.btRigidBody(rbInfo)
  body.setRestitution(restitution)
  body.setFriction(friction)
  body.setAngularFactor(new Ammo.btVector3(angularFactor[0], angularFactor[1], angularFactor[2]))
  body.setActivationState(4) // disable deactivation for player
  if (typeof userIndex === 'number') body.setUserIndex(userIndex)

  world.addRigidBody(body)
  return { body, motionState, shape }
}

export function readBodyPosition(args: {
  body: InstanceType<AmmoApi['btRigidBody']>
  out: { x: number; y: number; z: number }
  tmpTransform: InstanceType<AmmoApi['btTransform']>
}) {
  const { body, out, tmpTransform } = args
  const motionState = body.getMotionState()
  if (!motionState) return
  motionState.getWorldTransform(tmpTransform)
  const origin = tmpTransform.getOrigin()
  out.x = origin.x()
  out.y = origin.y()
  out.z = origin.z()
}

