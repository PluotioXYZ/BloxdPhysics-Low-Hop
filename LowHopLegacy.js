/// api_version=2
var script = registerScript({
    name: "LowHop",
    version: "1.0.0",
    authors: ["PluotioXYZ"]
});

var S12PacketEntityVelocity = Java.type("net.minecraft.network.play.server.S12PacketEntityVelocity");
var S3FPacketCustomPayload = Java.type("net.minecraft.network.play.server.S3FPacketCustomPayload");
var DELTA = 1 / 30;
function createVec3(x, y, z) {
    return {
        x: x,
        y: y,
        z: z,
        add: function(vec) {
            this.x += vec.x;
            this.y += vec.y;
            this.z += vec.z;
            return this;
        },
        set: function(x, y, z) {
            this.x = x;
            this.y = y;
            this.z = z;
            return this;
        },
        multiply: function(num) {
            this.x *= num;
            this.y *= num;
            this.z *= num;
            return this;
        }
    }
}

var BloxdPhysics = {
    impulseVector: createVec3(0, 0, 0),
    forceVector: createVec3(0, 0, 0),
    velocityVector: createVec3(0, 0, 0),
    gravityVector: createVec3(0, -10, 0),
    gravityMul: 4,
    mass: 1,
    getMotionForTick: function() {
        // forces
        var massDiv = 1 / this.mass;
        this.forceVector.multiply(massDiv);
        // gravity
        this.forceVector.add(this.gravityVector);
        this.forceVector.multiply(this.gravityMul);

        // impulses
        this.impulseVector.multiply(massDiv);
        this.forceVector.multiply(DELTA);
        this.impulseVector.add(this.forceVector);
        // velocity
        this.velocityVector.add(this.impulseVector);

        this.forceVector.set(0, 0, 0);
        this.impulseVector.set(0, 0, 0);

        return this.velocityVector;
    }
}

var groundTicks = 0;
var jumpfunny = 0;
var jumpticks = 0;
var pBody = BloxdPhysics;

function getMoveDir(forward, strafe, yaw, bps) {
    var f = Math.sin(yaw * Math.PI / 180) * bps;
    var g = Math.cos(yaw * Math.PI / 180) * bps;
    var sqrt = Math.sqrt(forward * forward + strafe * strafe);

    if (sqrt > 1) {
        forward = forward / sqrt;
        strafe = strafe / sqrt;
    }

    return {
        x: strafe * g - forward * f,
        y: 0,
        z: forward * g + strafe * f
    };
}

script.registerModule({
    name: "BloxdLowHop",
    category: "Movement",
    description: "Makes LowHop possible on Bloxd.",
    tag: "Lowhop",
    settings: {}
}, function (module) {
    module.on("strafe", function(event) {
        if (mc.thePlayer.onGround && pBody.velocityVector.y < 0) {
            pBody.velocityVector.set(0, 0, 0);
        }

        if (mc.thePlayer.onGround && mc.thePlayer.motionY == 0.41999998688697815) {
            jumpfunny = Math.min(jumpfunny + 1, 3);
            pBody.impulseVector.add(createVec3(0, 8, 0));
        }

        groundTicks = mc.thePlayer.onGround ? groundTicks + 1 : 0;
        if (groundTicks > 5) {
            jumpfunny = 0;
        }

        if (mc.thePlayer.isCollidedHorizontally) {
            pBody.velocityVector = createVec3(0, 5, 0);
        }

        var moveDir = getMoveDir(event.getForward(), event.getStrafe(), mc.thePlayer.rotationYaw, jumpticks > Date.now() ? 1 : (mc.thePlayer.isUsingItem() ? 0.06 : 0.26 + 0.025 * jumpfunny));
        event.cancelEvent();
        mc.thePlayer.motionX = moveDir.x;
        mc.thePlayer.motionY = pBody.getMotionForTick().y * DELTA;
        mc.thePlayer.motionZ = moveDir.z;
    });

    module.on("packet", function(event) {
        var packet = event.getPacket();
        if (packet instanceof S3FPacketCustomPayload && packet.getChannelName() == "bloxd:resyncphysics") {
            var data = packet.getBufferData();
            jumpfunny = 0;
            pBody.impulseVector.set(0, 0, 0);
            pBody.forceVector.set(0, 0, 0);
            pBody.velocityVector.set(data.readFloat(), data.readFloat(), data.readFloat());
        } else if (packet instanceof S12PacketEntityVelocity && mc.thePlayer != null && packet.getEntityID() == mc.thePlayer.getEntityId()) {
            jumpticks = Date.now() + 1300;
        }
    });
});