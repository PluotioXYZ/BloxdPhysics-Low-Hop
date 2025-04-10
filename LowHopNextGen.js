const Vec3d = Java.type("net.minecraft.util.math.Vec3d");
const Networking = Java.type("net.fabricmc.fabric.api.client.networking.v1.ClientPlayNetworking");
const PayloadNetworking = Java.type("net.fabricmc.fabric.api.networking.v1.PayloadTypeRegistry");
const FakePayload = Java.type("net.minecraft.network.packet.UnknownCustomPayload");
const Payload = Java.type("net.minecraft.network.packet.CustomPayload");
const Identifier = Java.type("net.minecraft.util.Identifier");
//CustomPayload.Id
const DELTA = 1 / 30;
const script = registerScript({
    name: "BloxdLowHop",
    version: "1.0.0",
    authors: ["PluotioXYZ"]
});

class BloxdPhysics {
    impulseVector = new Vec3d(0, 0, 0)
    forceVector = new Vec3d(0, 0, 0)
    velocityVector = new Vec3d(0, 0, 0)
    gravityVector = new Vec3d(0, -10, 0)
    gravityMul = 4
    mass = 1
    getMotionForTick() {
        // forces
        const massDiv = 1 / this.mass;
        this.forceVector = this.forceVector.multiply(massDiv);
        // gravity
        this.forceVector = this.forceVector.add(this.gravityVector);
        this.forceVector = this.forceVector.multiply(this.gravityMul);

        // impulses
        this.impulseVector = this.impulseVector.multiply(massDiv);
        this.forceVector = this.forceVector.multiply(DELTA);
        this.impulseVector = this.impulseVector.add(this.forceVector);
        // velocity
        this.velocityVector = this.velocityVector.add(this.impulseVector);

        this.forceVector = new Vec3d(0, 0, 0);
        this.impulseVector = new Vec3d(0, 0, 0);

        return this.velocityVector;
    }
}

let groundTicks = 0;
let jumpfunny = 0;
let jumpticks = 0;
const pBody = new BloxdPhysics();
class CustomPayload {
    ID = new Payload.Id(Identifier.of("bloxd", "resyncphysics"))
    CODEC = Payload.codecOf(() => {}, (buf) => this.read(buf))
    read(data) {
        localStorage.resyncVelocity(data.readFloat(), data.readFloat(), data.readFloat());
        return new FakePayload(this.ID.id());
    }
    getId() {
        return this.ID;
    }
}

script.registerModule({
    name: "BloxdLowHop",
    category: "Movement",
    description: "Makes you jump lower in Bloxd.",
    settings: {
        spider: Setting.boolean({
            name: "Spider",
            default: true
        })
    }
}, (mod) => {
    try {
        const payload = new CustomPayload();
        PayloadNetworking.playS2C().register(payload.ID, payload.CODEC);
    } catch (err) {
        console.log(err);
    }

    localStorage.resyncVelocity = function(x, y, z) {
        jumpfunny = 0;
        pBody.impulseVector = new Vec3d(0, 0, 0);
        pBody.forceVector = new Vec3d(0, 0, 0);
        pBody.velocityVector = new Vec3d(x, y, z);
    }

    mod.on("playerStrafe", (event) => {
        if (mc.player.groundCollision && pBody.velocityVector.y < 0) {
            pBody.velocityVector = new Vec3d(0, 0, 0);
        }

        if (mc.player.groundCollision && mc.player.getVelocity().y == 0.41999998688697815) {
            jumpfunny = Math.min(jumpfunny + 1, 3);
            pBody.impulseVector = pBody.impulseVector.add(new Vec3d(0, 8, 0));
        }

        if (mc.player.horizontalCollision && mod.settings.spider.value) {
            pBody.velocityVector = new Vec3d(0, 5, 0);
        }

        groundTicks = mc.player.groundCollision ? groundTicks + 1 : 0;
        if (groundTicks > 5) {
            jumpfunny = 0;
        }

        event.movementInput = new Vec3d(0, 0, 0);
        event.velocity = new Vec3d(0, 0, 0);
        event.speed = 0;
        mc.player.setVelocity(0, (mc.world.isPosLoaded(mc.player.getSteppingPos()) || mc.player.getPos().y <= 0) ? pBody.getMotionForTick().y * DELTA : 0, 0);
        MovementUtil.strafeWithSpeed(jumpticks > Date.now() ? 1 : (mc.player.isUsingItem() ? 0.06 : 0.26 + 0.025 * jumpfunny));
    });

    mod.on("packet", (event) => {
        if (event.packet.getPacketType().id().path == "set_entity_motion") {
            if (event.packet.getEntityId() == mc.player.getId()) {
                jumpticks = Date.now() + 1300;
            }
        }
    })
});