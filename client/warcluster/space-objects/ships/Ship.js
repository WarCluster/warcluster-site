var InteractiveObject = require("../InteractiveObject");

module.exports = function(context, color) {
	InteractiveObject.call(this);
	
	this.context = context;
	this.mission = null;
	this.total = null;

	var resource = this.context.resourcesLoader.get("./models/ship1.js");
	var map = this.context.resourcesLoader.get("./images/ships/ship1.png");
	this.material = new THREE.MeshPhongMaterial({map: map});

	this.ship = new THREE.Mesh(resource.geometry, this.material);
	this.ship.scale.set(0.3, 0.3, 0.3); 
	this.add(this.ship);
	
	this.progress = 0;
	this.delta_x = 0;
	this.delta_y = 0;

	this.direction = Math.random() > 0.5 ? 1 : -1;
	this.angle = Math.random() * 360;
	this.formation = null;
}

module.exports.prototype = new InteractiveObject();
module.exports.prototype.prepare = function(total) {
	this.total = total;
}

module.exports.prototype.send = function(mission) {
	this.mission = mission;

	this.delta_x = this.mission.target.x - this.mission.source.x;
	this.delta_y = this.mission.target.y - this.mission.source.y;
	
	this.rotation.z = -Math.atan2(this.delta_x, this.delta_y) + Math.PI;
	this.ship.rotation.y = Math.PI * Math.random();

	this.endTime = this.mission.startTime + this.mission.travelTime;

	this.ship.position.x = this.formation.x;
	this.ship.position.y = this.formation.y;
	this.ship.position.z = this.formation.z;
}

module.exports.prototype.tick = function() {
	if (this.context.currentTime > this.endTime) {
		this.context.shipsFactory.destroy(this);
	} else {
		this.progress = (this.context.currentTime - this.mission.startTime) / this.mission.travelTime;

		if (this.progress > 1)
			this.progress = 1;

		this.position.x = this.mission.source.x + this.delta_x * this.progress;
		this.position.y = this.mission.source.y + this.delta_y * this.progress;

		this.angle += this.direction;

		var ind = Math.sin(this.angle*(Math.PI/180))
		var ind2 = Math.sin((180 * this.progress)*(Math.PI/180))

		this.ship.rotation.y = -0.5 * ind - 0.5;

		this.ship.position.x = this.formation.x * ind2 + ind * 15;
		this.ship.position.y = this.formation.y * ind2;
		this.ship.position.z = this.formation.z * ind2;
	}
}