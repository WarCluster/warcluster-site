module.exports = function(context, data){
  THREE.Object3D.call(this);
  var _self = this;

  this.sc = 2.6 + Math.random() * 0.4;
  this.context = context;
  this.data = data.sunData;

  this.position.x = data.position.x;
  this.position.y = data.position.y;

  this.sc = 1.6 + Math.random() * 0.4 + 1;

  var bmd1 = context.resourcesLoader.get("./images/suns/sun1.png");

  this.sunMaterial = new THREE.MeshBasicMaterial({map: bmd1, transparent : true});
  this.sun =  new THREE.Mesh(new THREE.PlaneGeometry(225, 225, 1, 1), this.sunMaterial);
  this.sun.scale.x = this.sc;
  this.sun.scale.y = this.sc;
  this.sun.z = Math.random() * (-50);

  this.add(this.sun);
}

module.exports.prototype = new THREE.Object3D();
