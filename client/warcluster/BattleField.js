var SpaceViewController = require("./controllers/view/SpaceViewController");
var GameContext = require("./data/GameContext");
var ResourcesLoader = require("./loaders/resources/ResourcesLoader");

var PlanetsFactory = require("./factories/planets/PlanetsFactory");
var MissionsFactory = require("./factories/missions/MissionsFactory");
var ShipsFactory = require("./factories/ships/ShipsFactory");
var CanvasTextFactory = require("./factories/text/CanvasTextFactory");
var SunsFactory = require("./factories/suns/SunsFactory");

var CommandsManager = require("./commander/CommandsManager");

var SpaceScene = require("./scene/SpaceScene");

var UserPopover = require("./popovers/UserPopover");

module.exports = function(){
	var self = this;

	this.popover = new UserPopover();

	this.context = new GameContext();
  this.context.$content = $(".content");
	this.context.activationTime = (new Date()).getTime();
	this.context.currentTime = this.context.activationTime;
	this.context.cTemp = $("#cTemp");
	this.context.playerData = {};
	
	this.context.resourcesLoader = new ResourcesLoader();

	this.context.planetsHitObjectsFactory = new PlanetsFactory(this.context);
	this.context.missionsFactory = new MissionsFactory(this.context);
	this.context.shipsFactory = new ShipsFactory(this.context);
	this.context.canvasTextFactory = new CanvasTextFactory(this.context);
	this.context.sunsFactory = new SunsFactory(this.context);

	this.context.spaceScene = new SpaceScene(this.context);
	this.context.spaceScene.prepare();
	this.context.spaceScene.addEventListener("complete", function() { 
		console.log("--complete space scene--");
		self.connect();
	});

	this.attackMode = false;
	this.sourceTarget = null;
	this.enemyTarget = null;

	this.spaceViewController = new SpaceViewController(this.context);
	this.spaceViewController.zoom = 6000;
	this.spaceViewController.maxZoom = 60000000;
	this.spaceViewController.minZoom = 2000; //6000;
	this.spaceViewController.zoomStep = 2000;
	this.spaceViewController.addEventListener("showPlanetInfo", function(e) {
		self.popover.render();
    self.popover.move(e.tooltipPosition.x, e.tooltipPosition.y);

    if (self.attackMode) {
    	if (!self.sourceTarget) 
    		self.sourceTarget = e.target.planetData.id;
    	else {
    		self.attackMode = false;
    		self.commandsManager.attack(self.sourceTarget, e.target.planetData.id);

    		$(".attack-container").hide();
    	}
    }
	});

	this.spaceViewController.addEventListener("scrollProgress", function(e) {
		if (e.tooltipPlanet)
			self.popover.move(e.tooltipPosition.x, e.tooltipPosition.y);
	}); 

	this.spaceViewController.addEventListener("zoomProgress", function(e) {
		if (e.tooltipPlanet)
			self.popover.move(e.tooltipPosition.x, e.tooltipPosition.y);
	});

  this.spaceViewController.addEventListener("attackPlanet", function(e) {
    console.log("-SEND ATTACK MISSION-");
    for (var i = 0;i < e.attackSourcesIds.length;i ++)
      self.commandsManager.sendMission(e.attackSourcesIds[i], e.planetToAttackId);
  });

  this.spaceViewController.addEventListener("supportPlanet", function(e) {
    console.log("-SEND SUPPORT MISSION-");
    for (var i = 0;i < e.supportSourcesIds.length;i ++)
      self.commandsManager.sendMission(e.supportSourcesIds[i], e.planetToSupportId);
  });

	this.context.spaceViewController = this.spaceViewController;

  this.commandsManager = new CommandsManager("http://127.0.0.1:7000/universe", this.context);
  this.commandsManager.loginFn = function(data) {
    console.log("-loginFn-", data);

    _.extend(self.context.playerData, data);

    self.spaceViewController.activate();
    self.spaceViewController.setPosition(data.Position[0], data.Position[1]);

    this.scopeOfView(self.context.playerData.Position);
  }
  this.commandsManager.updateViewFn = function(data) {
    self.context.spaceScene.update(data);
  }
}

module.exports.prototype.connect = function() {
  //this.commandsManager.prepare("RobbFlynn" + Math.random(), "TwitterID" + Math.random());
  this.commandsManager.prepare("RobbFlynn", "TwitterID");
}

module.exports.prototype.prepareAttack = function() {
	this.attackMode = true;
	$(".attack-container").show();
	
  console.log("-prepareAttack-");
}