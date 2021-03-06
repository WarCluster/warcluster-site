var Waypoint = require("../../../space/waypoint");

module.exports = function(context, config, controller){
  THREE.EventDispatcher.call(this);

  var self = this;

  config = config || {};

  this.context = context;
  this.controller = controller;
  this.mpos = {
    x: 0,
    y: 0
  };

  this.waypoints = [];

  this.attackTarget = null;
  this.supportTarget = null;
  this.spyTarget = null;

  this.selectedPlanets = [];
  this.ctrlKey = false;
  this.shiftKey = false;

  this.selectionRect = $('<div class="selection-rect"></div>');

  $(document).bind("contextmenu",function(e){
    if (!self.ctrlKey)
      return false;
  });

  // *****************************************************************
  var handlePointerActions = function(e) {

    var intersects = self.getPointerIntersectionObjects(e);
    if (intersects.length > 0) {
      var target = intersects[0].object.parent;
      if (target.data.Owner == self.context.playerData.Username) {
        if (self.supportTarget && self.ctrlKey) {
          self.dispatchEvent({
            type: "supplyPlanet",
            supportSourcesIds: self.getSelectedPlanetsIds(),
            planetToSupportId: self.getPlanetТоSupportId(),
            waypoints: self.getWaypointsPositions()
          });
        } else if (self.shiftKey && !self.ctrlKey) {
          var index = self.getSelectedPlanetIndexById(target.data.id);
          if (index == -1) {
            self.selectPlanet(target.data);
          } else {
            self.deselectPlanet(target.data);
          }
        } else {
          self.deselectAll();
          self.selectPlanet(target.data);
        }

        if (self.selectedPlanets.length == 0)
          self.removeWaypoints();
      } else {
        if (self.selectedPlanets.length > 0) {
            if (self.ctrlKey && !self.shiftKey) {
              self.dispatchEvent({
                type: "supplyPlanet",
                supportSourcesIds: self.getSelectedPlanetsIds(),
                planetToSupportId: self.getPlanetТоSupportId(),
                waypoints: self.getWaypointsPositions()
              });
          } else if (self.attackTarget) {
              console.log(self.getWaypointsPositions())
              self.dispatchEvent({
                type: "attackPlanet",
                attackSourcesIds: self.getSelectedPlanetsIds(),
                planetToAttackId: self.getPlanetТоAttackId(),
                waypoints: self.getWaypointsPositions()
              });
          } else if (self.spyTarget && self.ctrlKey && self.shiftKey) {
            self.dispatchEvent({
              type: "spyPlanet",
              spySourcesIds: self.getSelectedPlanetsIds(),
              planetToSpyId: self.getPlanetТоSpyId(),
                waypoints: self.getWaypointsPositions()
            });
          }
        }
      }
    } else {
      if (self.shiftKey && self.selectedPlanets.length > 0) {
        if (self.waypoints.length < 5) {
          var waypoint = self.context.waypointsFactory.build(self.waypoints.length + 1)
          self.waypoints.push(waypoint);
        } else {
          var n = noty({
              text: "You cannot add more than 5 waypoints",
              type: 'information'
          });
        }
      } else {
        self.removeWaypoints();

        if (!self.shiftKey)
          self.deselectAll();
      }
    }
  }

  var selectionPointerMove = function(e) {
    e.preventDefault();
    e.clientX = e.clientX || e.changedTouches[0].clientX;
    e.clientY = e.clientY || e.changedTouches[0].clientY;
    var w = e.clientX - self.mpos.x;
    var h = e.clientY - self.mpos.y;

    var css = {
      left: w >= 0 ? self.mpos.x : e.clientX,
      top: h >= 0 ? self.mpos.y : e.clientY,
      width: w >= 0 ? w : Math.abs(w),
      height: h >= 0 ? h : Math.abs(h)
    };

    $(self.selectionRect).css(css);
  }

  var selectionPointerUp = function(e) {
    e.preventDefault();

    var clientX = e.clientX || e.changedTouches[0].clientX;
    var clientY = e.clientY || e.changedTouches[0].clientY;

    var w = clientX - self.mpos.x;
    var h = clientY - self.mpos.y;
    var rect = {
      x: w >= 0 ? self.mpos.x : clientX,
      y: h >= 0 ? self.mpos.y : clientY,
      width: w >= 0 ? w : Math.abs(w),
      height: h >= 0 ? h : Math.abs(h)
    };
    if (rect.width < 4 && rect.height < 4)
      handlePointerActions(e);
    else
      self.hitTestPlanets(rect);

    self.selectionRect.remove();

    self.removeSelectionEventListeners();
  }

  this.removeSelectionEventListeners = function() {
    window.removeEventListener("mousemove", selectionPointerMove);
    window.removeEventListener("mouseup", selectionPointerUp);
    window.removeEventListener("touchmove", selectionPointerMove);
    window.removeEventListener("touchend", selectionPointerUp);
  }

  this.selectionPointerDown = function(e) {
    e.preventDefault();
    e.stopPropagation();

    var clientX = e.clientX || e.targetTouches[0].clientX;
    var clientY = e.clientY || e.targetTouches[0].clientY;
    self.mpos.x = clientX;
    self.mpos.y = clientY;

    $("body").append(self.selectionRect);

    var css = {
      left: self.mpos.x,
      top: self.mpos.y,
      width: clientX - self.mpos.x,
      height: clientY - self.mpos.y
    }

    $(self.selectionRect).css(css);

    window.addEventListener("mousemove", selectionPointerMove);
    window.addEventListener("mouseup", selectionPointerUp);
    window.addEventListener("touchmove", selectionPointerMove);
    window.addEventListener("touchend", selectionPointerUp);
  }
}

module.exports.prototype = new THREE.EventDispatcher();

module.exports.prototype.cancelSelection = function() {
  this.selectionRect.remove();
  this.removeSelectionEventListeners();
}
module.exports.prototype.getPointerIntersectionObjects = function(e) {
  var clientX = e.clientX || e.changedTouches[0].clientX;
  var clientY = e.clientY || e.changedTouches[0].clientY;
  var mouseX = (clientX / window.innerWidth) * 2 - 1;
  var mouseY = - (clientY / window.innerHeight) * 2 + 1;

  var vector = new THREE.Vector3( mouseX, mouseY, 0.5 );
  this.context.projector.unprojectVector( vector, this.context.camera );

  var raycaster = new THREE.Raycaster(this.context.camera.position, vector.sub(this.context.camera.position ).normalize());
  return raycaster.intersectObjects(this.context.planetsHitObjects);
}

module.exports.prototype.hitTestPlanets = function(rect) {
  var selectedPlanets = [];
  var deselectedPlanets = [];

  for (var i=0;i < this.context.planetsHitObjects.length;i ++) {
    var target = this.context.planetsHitObjects[i].parent;
    if (target.data.Owner == this.context.playerData.Username) {
      if (target.rectHitTest(rect)) {
        var index = this.getSelectedPlanetIndexById(target.data.id);
        if (index == -1) {
          this.selectPlanet(target.data, true);
          selectedPlanets.push(target.data);
        } else if (this.shiftKey) {
          this.deselectPlanet(target.data, true);
          deselectedPlanets.push(target.data);
        }
      } else if (!this.shiftKey && target.selected) {
        deselectedPlanets.push(target.data);
        this.deselectPlanet(target.data, true);
      }
    }
  }

  if (selectedPlanets.length > 0 || deselectedPlanets.length > 0)
    this.dispatchEvent({
      type: "selectionChanged",
      selectedPlanets: selectedPlanets,
      deselectedPlanets: deselectedPlanets
    });

  if (this.selectedPlanets.length == 0)
    this.removeWaypoints();
}

module.exports.prototype.deselectAll = function() {
  for (var i=0;i < this.selectedPlanets.length;i ++) {
    var planet = this.context.objectsById[this.selectedPlanets[i].id];
    if (planet)
      planet.deselect();
  }

  this.selectedPlanets = [];
  this.dispatchEvent({
    type: "deselectAllPlanets"
  });
}

module.exports.prototype.selectPlanet = function(planetData, notDispatch) {
  var planet = this.context.objectsById[planetData.id];
  if (planet) {
    planet.select();
    this.selectedPlanets.push(planetData);
    if (!notDispatch)
      this.dispatchEvent({
        type: "selectionChanged",
        selectedPlanets: [planetData]
      });
  }
}

module.exports.prototype.deselectPlanet = function(planetData, notDispatch) {
  var index = this.getSelectedPlanetIndexById(planetData.id);
  if (index != -1) {
    var planet = this.context.objectsById[planetData.id];
    if (planet)
      planet.deselect();
    this.selectedPlanets.splice(index, 1);
    if (!notDispatch)
      this.dispatchEvent({
        type: "selectionChanged",
        deselectedPlanets: [planetData]
      });
  }
}

module.exports.prototype.deselectPlanetById = function(id) {
  var planetData = this.getSelectedPlanetDataById(id);
  if (planetData)
    this.deselectPlanet(planetData);
}

module.exports.prototype.onPlanetMouseOver = function(e) {
  if (this.selectedPlanets.length > 0) {
    if (this.ctrlKey && !this.shiftKey){
      this.supportTarget = e.target.parent;
      this.handleShowSupportSelection();
    } else if (e.target.parent.data.Owner != this.context.playerData.Username){
      if (this.ctrlKey && this.shiftKey) {
        this.spyTarget = e.target.parent;
        this.spyTarget.showSpySelection();
      } else {
        this.attackTarget = e.target.parent;
        this.attackTarget.showAttackSelection();
      }
    }
  }
}

module.exports.prototype.onPlanetMouseOut = function(e) {
  if (this.attackTarget) {
    this.attackTarget.hideAttackSelection();
    this.attackTarget = null;
  } else if (this.supportTarget) {
    this.supportTarget.hideSupportSelection();
    this.supportTarget = null;
  } else if (this.spyTarget) {
    this.spyTarget.hideSpySelection();
    this.spyTarget = null;
  }
}

module.exports.prototype.handleShowSupportSelection = function() {
  if (this.selectedPlanets.length == 1) {
    if (this.supportTarget.data.id != this.selectedPlanets[0].id) {
      this.supportTarget.showSupportSelection();
    }
  } else {
    this.supportTarget.showSupportSelection();
  }
}

module.exports.prototype.getSelectedPlanetsIds = function() {
  var ids = [];
  for (var i = 0;i < this.selectedPlanets.length;i ++)
    if (!this.supportTarget || this.supportTarget.data.id != this.selectedPlanets[i].id)
      ids.push(this.selectedPlanets[i].id);
  return ids;
}

module.exports.prototype.getSelectedPlanetsData = function() {
  var planets = [];
  for (var i = 0;i < this.selectedPlanets.length;i ++)
    if (!this.supportTarget || this.supportTarget.id != this.selectedPlanets[i].id)
      planets.push(this.selectedPlanets[i]);
  return planets;
}

module.exports.prototype.getSelectedPlanetDataById = function(id) {
  for (var i = 0;i < this.selectedPlanets.length;i ++) {
    if (this.selectedPlanets[i].id == id)
      return this.selectedPlanets[i];
  }
  return null;
}

module.exports.prototype.getSelectedPlanetIndexById = function(id) {
  for (var i = 0;i < this.selectedPlanets.length;i ++) {
    if (this.selectedPlanets[i].id == id)
      return i;
  }
  return -1;
}

module.exports.prototype.getPlanetТоAttackId = function() {
  return this.attackTarget.data.id;
}

module.exports.prototype.getPlanetТоSupportId = function() {
  return this.supportTarget.data.id;
}

module.exports.prototype.getPlanetТоSpyId = function() {
  return this.spyTarget.data.id;
}

module.exports.prototype.getWaypointsPositions = function() {
  var positions = [];
  for (var i = 0;i < this.waypoints.length;i ++)
    positions.push({
      X: this.waypoints[i].position.x,
      Y: this.waypoints[i].position.y
    })

  return positions;
}

module.exports.prototype.updateSelectedPlanetData = function(data) {
  for (var i = 0;i < this.selectedPlanets.length;i ++)
    if (this.selectedPlanets[i].id == data.id) {
      this.selectedPlanets[i] = data;
      return true;
    }
  return false;
}

module.exports.prototype.pressCtrlKey = function(){
  this.ctrlKey = true;

  if (this.attackTarget) {
    if (this.shiftKey) {
      this.spyTarget = this.attackTarget;
      this.spyTarget.showSpySelection();
    } else {
      this.supportTarget = this.attackTarget;
      this.supportTarget.showSupportSelection();
    }

    this.attackTarget = null;
  } else if (this.supportTarget) {
    this.supportTarget.showSupportSelection();
  }
}

module.exports.prototype.releaseCtrlKey = function(){
  this.ctrlKey = false;

  if (this.spyTarget) {
    if (this.spyTarget.data.Owner != this.context.playerData.Username) {
      this.attackTarget = this.spyTarget;
      this.attackTarget.showAttackSelection();

      this.spyTarget = null;
    } else {
      this.spyTarget.hideSpySelection();
    }
  } else if (this.supportTarget) {
    if (this.supportTarget.data.Owner == this.context.playerData.Username) {
      this.attackTarget = this.supportTarget;
      this.attackTarget.showAttackSelection();

      this.supportTarget = null;
    } else {
      this.supportTarget.hideSupportSelection();
    }
  }
}

module.exports.prototype.pressShiftKey = function(){
  this.shiftKey = true;
  if (this.supportTarget) {
    this.spyTarget = this.supportTarget;
    this.spyTarget.showSpySelection();

    this.supportTarget = null;
  } else if (this.spyTarget && this.ctrlKey) {
    this.spyTarget.showSpySelection();
  }
}

module.exports.prototype.releaseShiftKey = function(){
  this.shiftKey = false;
  if (this.spyTarget) {
    if (this.ctrlKey) {
      this.supportTarget = this.spyTarget;
      this.supportTarget.showSupportSelection();

      this.spyTarget = null;
    } else
      this.spyTarget.hideSpySelection();
  }
}

module.exports.prototype.removeWaypoints = function() {
  while (this.waypoints.length > 0)
    this.context.waypointsFactory.destroy(this.waypoints.shift());
}

module.exports.prototype.addPlanetEvents = function(planet) {
  var self = this;
  planet.hitObject.on("mouseover", function(e) { self.onPlanetMouseOver(e); });
  planet.hitObject.on("mouseout", function(e) { self.onPlanetMouseOut(e); });
}

module.exports.prototype.removePlanetEvents = function(planet) {
  planet.hitObject.off("mouseover");
  planet.hitObject.off("mouseout");
}
