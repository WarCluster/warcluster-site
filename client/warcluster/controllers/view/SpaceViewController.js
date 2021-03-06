var Scroller = require("./scroller");
var Selection = require("./selection");
var Zoomer = require("./zoomer");
var Info = require("./info");

var utils = require("../../utils")

module.exports = function(context, config){
	THREE.EventDispatcher.call(this);

	var self = this;

  this.context = context;
  this.config = config;
  this.scrollPosition = new THREE.Vector3();

  var gameContainer = document.getElementsByClassName("game-container");
  var hammertime = new Hammer(gameContainer[0]);
  hammertime.get("pinch").set({ enable: true }).set({threshold: 0.5});
  hammertime.on('press', function(e) {
    self.selection.cancelSelection();//don't select the planet we're focusing on.
    self.info.renderAt(e);
  });
  hammertime.on('pinchin', function(ev) {
    self.zoomer.zoomOut();
  });
  hammertime.on('pinchout', function(ev) {
    self.zoomer.zoomIn();
  });

  this.cell = {xIndex: null, yIndex: null};
  this.tlPosition = {xIndex: null, yIndex: null};
  this.brPosition = {xIndex: null, yIndex: null};
  this.screenRect = {
    width: 0,
    height: 0,
    cx: 0,
    cy: 0,
    X: 0,
    Y: 0
  }

  this.resolution = { width: 0, height: 0 }

  this.zoomer = new Zoomer(context, config.zoomer, this);
  this.zoomer.zoomFn = function(zoom) {
    //console.log("zoomFn:", zoom, self.scrollPosition.z)
    self.scroller.scaleIndex = zoom;
    self.info.updatePosition();
    self.checkPosition();
  };

  this.scroller = new Scroller(context, config.scroller, this);
  this.scroller.scrollFn = function() {
    self.info.updatePosition();
    self.checkPosition();
  }

  this.selection = new Selection(context, config.selection, this);
  this.selection.addEventListener("attackPlanet", function(e) {
    self.dispatchEvent(e);
  });
  this.selection.addEventListener("spyPlanet", function(e) {
    self.dispatchEvent(e);
  });
  this.selection.addEventListener("supplyPlanet", function(e) {
    self.dispatchEvent(e);
  });
  this.selection.addEventListener("selectionChanged", function(e) {
    self.dispatchEvent(e);
  });
  this.selection.addEventListener("deselectAllPlanets", function(e) {
    self.dispatchEvent(e);
  });

  this.info = new Info(context);
  this.info.addEventListener("attackPlanet", function(e) {
    var attackSourcesIds = self.selection.getSelectedPlanetsIds()
    if (attackSourcesIds.length > 0)
      self.dispatchEvent({
        type: "attackPlanet",
        attackSourcesIds: attackSourcesIds,
        planetToAttackId: e.id
      });
    else {
      var n = noty({
              text: "First you must select a planet you control in order to Attack",
              type: 'information'
          });
    }
  });
  this.info.addEventListener("supplyPlanet", function(e) {
    var supplySourcesIds = self.selection.getSelectedPlanetsIds()
    if (supplySourcesIds.length > 0)
      self.dispatchEvent({
        type: "supplyPlanet",
        supportSourcesIds: supplySourcesIds,
        planetToSupportId: e.id
      });
    else {
      var n = noty({
              text: "First you must select a planet you control in order to Supply",
              type: 'information'
          });
    }
  });
  this.info.addEventListener("spyPlanet", function(e) {
    var spySourcesIds = self.selection.getSelectedPlanetsIds()
    if (spySourcesIds.length > 0)
      self.dispatchEvent({
        type: "spyPlanet",
        spySourcesIds: spySourcesIds,
        planetToSpyId: e.id
      });
    else {
      var n = noty({
              text: "First you must select a planet you control in order to Spy",
              type: 'information'
          });
    }
  });

  // *****************************************************************
  this.onTouchStart = function(e) {
    if (self.context.renderer.domElement == e.target) {
      if (e.targetTouches.length > 1) {
        self.selection.cancelSelection();
        self.scroller.scrollPointerDown(e);
      }
      else
        self.selection.selectionPointerDown(e);
    }

    e.preventDefault();
    return false;
  }
  this.onMouseDown = function(e) {
    if (self.context.renderer.domElement == e.target) {
      if (e.button != 0)
        self.scroller.scrollPointerDown(e);
      else
        self.selection.selectionPointerDown(e);
    }

    e.preventDefault();
    return false;
  }

  this.mousePosition = { x: 0, y: 0 };

  $(window).mousemove(function(e) {
    self.mousePosition.x = e.clientX;
    self.mousePosition.y = e.clientY;
  })
}

module.exports.prototype = new THREE.EventDispatcher();
module.exports.prototype.activate = function(x, y) {
	if (!this.active) {
		this.active = true;

    var sc = 9999999;
    this.hitPlane =  new THREE.Mesh(new THREE.PlaneGeometry(1366 * sc, 768 * sc, 1, 1));
    this.hitPlane.visible = false;

    this.context.container.add(this.hitPlane);

    this.scroller.scrollTo(x,y);
    this.zoomer.prepare();
    this.scroller.scaleIndex = this.zoomer.getZoomIndex();

    this.updateResolution();

    this.tlPosition = this.getGridPosition(this.context.spaceScene.camera.position.x - (this.resolution.width / 2), this.context.spaceScene.camera.position.y + (this.resolution.height / 2));
    this.brPosition = this.getGridPosition(this.context.spaceScene.camera.position.x + (this.resolution.width / 2), this.context.spaceScene.camera.position.y - (this.resolution.height / 2));

    this.updateScreenRect();

		window.addEventListener("mousedown", this.onMouseDown);
    window.addEventListener("touchstart", this.onTouchStart);
	}
}

module.exports.prototype.deactivate = function() {
	if (this.active) {
		this.active = false;
		window.removeEventListener("mousedown", this.onMouseDown);
    window.removeEventListener("touchstart", this.onTouchStart);
	}
}

module.exports.prototype.checkPosition = function() {
  this.updateResolution();

  var cpx = this.context.spaceScene.camera.position.x;
  var cpy = this.context.spaceScene.camera.position.y;

  var tlPosition = this.getGridPosition(cpx - (this.resolution.width / 2), cpy + (this.resolution.height / 2));
  var brPosition = this.getGridPosition(cpx + (this.resolution.width / 2), cpy - (this.resolution.height / 2));

  if (this.tlPosition.xIndex != tlPosition.xIndex || this.tlPosition.yIndex != tlPosition.yIndex ||
      this.brPosition.xIndex != brPosition.xIndex || this.brPosition.yIndex != brPosition.yIndex) {

    this.tlPosition = tlPosition;
    this.brPosition = brPosition;

    this.updateScreenRect();

    //console.log("---- ########## checkPosition:", this.tlPosition, this.brPosition, this.screenRect)

    this.context.commandsManager.scopeOfView(Math.ceil(cpx), Math.ceil(cpy), this.resolution.width, this.resolution.height);
  }
}

module.exports.prototype.scrollTo = function (x, y, animated) {
  this.scroller.scrollTo(x, y, animated);
}

module.exports.prototype.updateResolution = function() {
  this.resolution.width = Math.ceil(this.context.width * this.scroller.scaleIndex);
  this.resolution.height = Math.ceil(this.context.height * this.scroller.scaleIndex);
}

module.exports.prototype.updateScreenRect = function() {
  var tl = this.getCellPosition(this.tlPosition.xIndex, this.tlPosition.yIndex);
  var br = this.getCellPosition(this.brPosition.xIndex, this.brPosition.yIndex, "br");

  var width = Math.abs(br.x - tl.x);
  var height = Math.abs(tl.y - br.y);

  this.screenRect.width = width;
  this.screenRect.height = height;
  this.screenRect.cx = tl.x + (width / 2);
  this.screenRect.cy = tl.y - (height / 2);
  this.screenRect.x = tl.x;
  this.screenRect.y = tl.y;

  //console.log("### updateScreenRect", this.screenRect)

  return this.screenRect;
}

module.exports.prototype.getCellPosition = function(xIndex, yIndex, position) {
  switch (position) {
    case "tr":
      return {
        x: xIndex > 0 ? Math.ceil(xIndex * this.context.areaSize) : Math.floor((xIndex + 1) * this.context.areaSize),
        y: yIndex > 0 ? Math.ceil(yIndex * this.context.areaSize) : Math.floor((yIndex + 1) * this.context.areaSize)
      };
    break;
    case "bl":
      return {
        x: xIndex > 0 ? Math.ceil((xIndex - 1) * this.context.areaSize) : Math.floor(xIndex * this.context.areaSize),
        y: yIndex > 0 ? Math.ceil((yIndex - 1) * this.context.areaSize) : Math.floor(yIndex * this.context.areaSize)
      };
    break;
    case "br":
      return {
        x: xIndex > 0 ? Math.ceil(xIndex * this.context.areaSize) : Math.floor((xIndex + 1) * this.context.areaSize),
        y: yIndex > 0 ? Math.ceil((yIndex - 1) * this.context.areaSize) : Math.floor(yIndex * this.context.areaSize)
      };
    break;
  }

  return {
    x: xIndex > 0 ? Math.ceil((xIndex - 1) * this.context.areaSize) : Math.floor(xIndex * this.context.areaSize),
    y: yIndex > 0 ? Math.ceil(yIndex * this.context.areaSize) : Math.floor((yIndex + 1) * this.context.areaSize)
  };
}



module.exports.prototype.getGridPosition = function(x, y) {
  return {
    xIndex: this.roundCoordinate(x, this.context.areaSize),
    yIndex: this.roundCoordinate(y, this.context.areaSize)
  }
}

module.exports.prototype.roundCoordinate = function(d, w) {
  if (d > 0)
    return Math.floor(d / w) + 1;
  else if (d < 0)
    return Math.floor(d / w);

  return 1;
}

module.exports.prototype.translateIndex = function(i, d) {
  if (i > 0 && i + d < 1)
    return i + d - 1;
  else if (i < 0 && i + d > -1)
    return i + d + 1;
  return i + d;
}

module.exports.prototype.addScrollPosition = function(dx, dy, dz){
  return this.setScrollPosition(this.scrollPosition.x + dx, this.scrollPosition.y + dy, this.scrollPosition.z + dz)
}

module.exports.prototype.setScrollPosition = function(x, y, z){
  var xb = typeof x == "number" && !isNaN(x) && x != this.scrollPosition.x;
  var yb = typeof y == "number" && !isNaN(y) && y != this.scrollPosition.y;
  var zb = typeof z == "number" && !isNaN(z) && z != this.scrollPosition.z;

  if (!xb && !yb && !zb)
    return false;

  if (xb) {
    if (x < this.config.scroller.xMin)
      this.scrollPosition.x = this.config.scroller.xMin;
    else if (x > this.config.scroller.xMax)
      this.scrollPosition.x = this.config.scroller.xMax;
    else
      this.scrollPosition.x = x;
  }

  if (yb) {
    if (y < this.config.scroller.yMin)
      this.scrollPosition.y = this.config.scroller.yMin;
    else if (y > this.config.scroller.yMax)
      this.scrollPosition.y = this.config.scroller.yMax;
    else
      this.scrollPosition.y = y;
  }

  if (zb) {
    if (this.config.zoomer.minZoom != null && this.config.zoomer.maxZoom != null) {
      if (z < this.config.zoomer.minZoom)
        this.scrollPosition.z = this.config.zoomer.minZoom;
      else if (z > this.config.zoomer.maxZoom)
        this.scrollPosition.z = this.config.zoomer.maxZoom;
      else
        this.scrollPosition.z = z;
    } else if (this.config.zoomer.minZoom != null && this.config.zoomer.maxZoom == null) {
      if (z < this.config.zoomer.minZoom)
        this.scrollPosition.z = this.config.zoomer.minZoom;
      else
        this.scrollPosition.z = z;
    } else if (this.config.zoomer.minZoom == null && this.config.zoomer.maxZoom != null) {
      if (z > this.config.zoomer.maxZoom)
        this.scrollPosition.z = this.config.zoomer.maxZoom;
      else
        this.scrollPosition.z = z;
    } else {
      this.scrollPosition.z = z;
    }
  }

  return true;
}

module.exports.prototype.toggleMapView = function(){
  if (this.scrollPosition.z == 300000) {
    this.scrollPosition.z = this.previousZ;
  } else {
    this.previousZ = this.scrollPosition.z;
    this.scrollPosition.z = 300000;
  }

  this.zoomer.animateIt();
}
module.exports.prototype.getMousePosition = function() {
  var intersects = utils.getMouseIntersectionObjects(this.mousePosition.x, this.mousePosition.y, [this.hitPlane], this.context)
  if (intersects.length > 0)
    return intersects[0].point;

  return null;
}

module.exports.prototype.pressCtrlKey = function(){
  this.selection.pressCtrlKey();
}

module.exports.prototype.releaseCtrlKey = function(){
  this.selection.releaseCtrlKey();
}

module.exports.prototype.pressShiftKey = function(){
  this.selection.pressShiftKey();
  this.zoomer.shiftKey = true;
}

module.exports.prototype.releaseShiftKey = function(){
  this.selection.releaseShiftKey();
  this.zoomer.shiftKey = false;
}

