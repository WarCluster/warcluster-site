module.exports = function(context, config){
  THREE.EventDispatcher.call(this);

  var self = this;

  config = config || {};

  this.context = context;
  this.mpos = {
    x: 0, 
    y: 0
  };

  this.attackTarget = null;
  this.supportTarget = null;
  this.spyTarget = null;

  this.selectedPlanets = [];
  this.ctrlKey = false;
  this.shiftKey = false;

  this.selectionRect = $('<div class="selection-rect"></div>');

  // *****************************************************************

  this.context.spaceScene.afterRenderFn = function() {
    for (var i=0;i < self.context.planetsHitObjects.length;i ++) {
      self.context.planetsHitObjects[i].on("mouseover", function(e) {
        self.onPlanetMouseOver(e);
      });
      self.context.planetsHitObjects[i].on("mouseout", function(e) {
        self.onPlanetMouseOut(e);
      });
    }
  }

  $(document).bind("contextmenu",function(e){
    if (!self.shiftKey)
      return false;
  });

  // *****************************************************************

  var selectionMouseMove = function(e) {
    e.preventDefault();

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

  var handleMouseActions = function(e) {
    var intersects = self.getMouseIntersectionObjects(e);
    if (intersects.length > 0) {
      var target = intersects[0].object.parent;
      if (target.data.Owner.indexOf(self.context.playerData.Username) != -1) {
        if (self.supportTarget && self.ctrlKey) {
          self.dispatchEvent({
            type: "supplyPlanet", 
            supportSourcesIds: self.getSelectedPlanetsIds(),
            planetToSupportId: self.getPlanetТоSupportId()
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
      } else {
        if (self.selectedPlanets.length > 0) {
            if (self.ctrlKey && !self.shiftKey) {
              self.dispatchEvent({
                type: "supplyPlanet", 
                supportSourcesIds: self.getSelectedPlanetsIds(),
                planetToSupportId: self.getPlanetТоSupportId()
              });
          } else if (self.attackTarget) {
              self.dispatchEvent({
                type: "attackPlanet", 
                attackSourcesIds: self.getSelectedPlanetsIds(),
                planetToAttackId: self.getPlanetТоAttackId()
              });
          } else if (self.spyTarget && self.ctrlKey && self.shiftKey) {
            self.dispatchEvent({
              type: "spyPlanet",
              spySourcesIds: self.getSelectedPlanetsIds(),
              planetToSpyId: self.getPlanetТоSpyId()
            });
          }
        }
      }
    } else {
      self.deselectAll();
    }
  }

  var selectionMouseUp = function(e) {
    e.preventDefault();

    var w = e.clientX - self.mpos.x;
    var h = e.clientY - self.mpos.y;
    var rect = {
      x: w >= 0 ? self.mpos.x : e.clientX,
      y: h >= 0 ? self.mpos.y : e.clientY,
      width: w >= 0 ? w : Math.abs(w),
      height: h >= 0 ? h : Math.abs(h)
    };
    if (rect.width < 4 && rect.height < 4)
      handleMouseActions(e);
    else
      self.hitTestPlanets(rect);
    self.selectionRect.remove();
    
    window.removeEventListener("mousemove", selectionMouseMove);
    window.removeEventListener("mouseup", selectionMouseUp);
  }

  this.selectionMouseDown = function(e) {
    e.preventDefault();

    self.mpos.x = e.clientX;
    self.mpos.y = e.clientY;

    $("body").append(self.selectionRect);

    var css = {
      left: self.mpos.x,
      top: self.mpos.y,
      width: e.clientX - self.mpos.x,
      height: e.clientY - self.mpos.y
    }

    $(self.selectionRect).css(css);

    window.addEventListener("mousemove", selectionMouseMove);
    window.addEventListener("mouseup", selectionMouseUp);
  }
}

module.exports.prototype = new THREE.EventDispatcher();
module.exports.prototype.getMouseIntersectionObjects = function(e) {
  var mouseX = (e.clientX / window.innerWidth) * 2 - 1;
  var mouseY = - (e.clientY / window.innerHeight) * 2 + 1;

  var vector = new THREE.Vector3( mouseX, mouseY, 0.5 );
  this.context.projector.unprojectVector( vector, this.context.camera );

  var raycaster = new THREE.Raycaster(this.context.camera.position, vector.sub(this.context.camera.position ).normalize());
  return raycaster.intersectObjects(this.context.planetsHitObjects);
}

module.exports.prototype.hitTestPlanets = function(rect) {
  if (!this.shiftKey) {
    //TODO: need to refactor...
    for (var i=0;i < this.selectedPlanets.length;i ++) {
      var planet = this.context.objectsById[this.selectedPlanets[i].id];
      if (planet) {
        planet.deselect();
      }
    }
    this.selectedPlanets = [];
    this.context.planetsSelection.allPilotsSelected = 0;
    this.context.planetsSelection.selectedPlanets = [];
    //TODO: ... this block
  }
  for (var i=0;i < this.context.planetsHitObjects.length;i ++) {
    var target = this.context.planetsHitObjects[i].parent;
    if (target.data.Owner.indexOf(this.context.playerData.Username) != -1) {
      if (!this.shiftKey) {
        target.deselect();
        //TODO: refactor this because it causes flickering in the planet selection control
        this.context.planetsSelection.$('.selection-planet-item[data-id="'+target.data.id+'"]').remove();
      }
      if (target.rectHitTest(rect) && this.getSelectedPlanetIndexById(target.data.id) == -1) {
        this.selectPlanet(target.data);
      }
    }
  }

  if (this.selectedPlanets.length == 0) {
    this.onPlanetMouseOut();
    this.deselectAll();
  }
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

module.exports.prototype.selectPlanet = function(planetData) {
  var planet = this.context.objectsById[planetData.id];

  if (planet) {
    planet.select();
    
    this.selectedPlanets.push(planetData);
    this.dispatchEvent({
      type: "selectPlanet", 
      planet: planet,
      planetData: planetData
    });  
  }
}

module.exports.prototype.deselectPlanet = function(planetData) {
  var index = this.getSelectedPlanetIndexById(planetData.id);
  
  if (index != -1) {
    var planet = this.context.objectsById[planetData.id];

    if (planet) 
      planet.deselect();

    this.selectedPlanets.splice(index, 1);
    this.dispatchEvent({
      type: "deselectPlanet", 
      planet: planet,
      planetData: planetData
    });
  }
}

module.exports.prototype.deselectPlanetById = function(id) {
  var planet = this.getSelectedPlanetById(id);
  if (planet)
    this.deselectPlanet(planet);
}

module.exports.prototype.onPlanetMouseOver = function(e) {
  if (this.selectedPlanets.length > 0) 
    if (e.target.parent.data.Owner.indexOf(this.context.playerData.Username) == -1){
      if (this.ctrlKey && this.shiftKey) {
        this.spyTarget = e.target.parent;
        this.spyTarget.showSpySelection();
        return;
      } else if (this.ctrlKey){
        this.supportTarget = e.target.parent;
        this.handleShowSupportSelection();
        return;
      } 
        this.attackTarget = e.target.parent;
        this.attackTarget.showAttackSelection();
    } else {
        this.supportTarget = e.target.parent;
        if (this.ctrlKey)
          this.handleShowSupportSelection();
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

module.exports.prototype.getSelectedPlanetById = function(id) {
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
