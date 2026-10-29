import router from '@system.router';
import device from '@system.device';
import model from '../../common/model';
export default {
  data: {
    ready:false,error:'\u6b63\u5728\u8bfb\u53d6\u5c4f\u5e03\u5c40\u2026',
    w:0,h:0,margin:0,headerW:0,headerH:0,viewportW:0,viewportH:0,safeBottom:0,
    atlasW:0,atlasH:0,tileW:0,tileH:0,imageLeft:0,imageTop:0,
    font:20,titleFont:22,smallFont:16,textH:30,captionH:32,titleW:0,badgeW:0,
    startX:0,startY:0,startLeft:0,startTop:0,lastX:0,lastY:0,downAt:0,moved:false,touching:false,crownValue:50,
    active:false,alive:true,leaving:false,layoutTicket:0,focusTimer:0,tapBlockUntil:0
  },
  appState: function () {
    try{var a=getApp();if(a)return a;}catch(e){}
    try{if($app)return $app.$def||$app;}catch(e){}
    return this.$app && this.$app.$def ? this.$app.$def : null;
  },
  onInit: function () {this.active=true;this.alive=true;this.restore();this.measure();},
  onShow: function () {this.active=true;this.alive=true;this.leaving=false;this.restore();this.measure();},
  restore: function () {
    var a=this.appState();if(!a)return;
    this.imageLeft=typeof a.tableLeft==='number'?a.tableLeft:0;
    this.imageTop=typeof a.tableTop==='number'?a.tableTop:0;
  },
  save: function () {
    var a=this.appState();if(a){a.tableLeft=this.imageLeft;a.tableTop=this.imageTop;}
  },
  measure: function () {
    var self=this,ticket=++this.layoutTicket;
    try{device.getInfo({
      success:function(info){
        if(!self.alive || !self.active || ticket!==self.layoutTicket)return;
        var v=model.viewport(info);
        if(!v){self.ready=false;self.error='\u5c4f\u5e55\u4fe1\u606f\u65e0\u6548\uff0c\u70b9\u6b64\u91cd\u8bd5';return;}
        self.w=v.w;self.h=v.h;self.layout();self.ready=true;self.error='';self.focusLater();
        console.info('PT:index_ready w='+self.w+' h='+self.h+' left='+self.imageLeft+' top='+self.imageTop);
      },
      fail:function(){if(self.alive && self.active && ticket===self.layoutTicket){self.ready=false;self.error='\u65e0\u6cd5\u8bfb\u53d6\u5c4f\u5e55\u4fe1\u606f\uff0c\u70b9\u6b64\u91cd\u8bd5';}}
    });}catch(e){this.ready=false;this.error='\u5c4f\u5e55\u63a5\u53e3\u9519\u8bef\uff0c\u70b9\u6b64\u91cd\u8bd5';console.error('PT:device_error');}
  },
  layout: function () {
    var l=model.layout(this.w,this.h),p;
    this.margin=l.margin;this.headerW=l.headerW;this.headerH=l.headerH;
    this.viewportW=l.viewportW;this.viewportH=l.viewportH;this.safeBottom=l.safeBottom;
    this.tileW=l.tileW;this.tileH=l.tileH;this.atlasW=l.atlasW;this.atlasH=l.atlasH;
    this.font=l.font;this.titleFont=l.titleFont;this.smallFont=l.smallFont;
    this.textH=Math.round(l.font*1.5);this.captionH=Math.round(l.titleFont*1.5);
    this.titleW=Math.round(l.headerW*0.72);this.badgeW=l.headerW-this.titleW;
    p=model.clampPan(this.imageLeft,this.imageTop,l);this.imageLeft=p.left;this.imageTop=p.top;this.save();
  },
  point: function (event) {
    event=event||{};
    var t=event && event.touches && event.touches[0] ? event.touches[0] :
      event && event.changedTouches && event.changedTouches[0] ? event.changedTouches[0] : event || {};
    var x=typeof t.globalX==='number'?t.globalX:typeof t.x==='number'?t.x:this.lastX;
    var y=typeof t.globalY==='number'?t.globalY:typeof t.y==='number'?t.y:this.lastY;
    return {x:x,y:y,time:typeof event.timestamp==='number'?event.timestamp:Date.now()};
  },
  touchStart: function (event) {
    if(!this.ready || this.leaving)return;
    this.focusCrown(true);
    var p=this.point(event);this.startX=p.x;this.startY=p.y;this.lastX=p.x;this.lastY=p.y;
    this.startLeft=this.imageLeft;this.startTop=this.imageTop;this.downAt=p.time;this.moved=false;this.touching=true;
  },
  applyGesturePoint: function (p) {
    var dx=p.x-this.startX,dy=p.y-this.startY,l,r;
    this.lastX=p.x;this.lastY=p.y;
    if(dx*dx+dy*dy>=64)this.moved=true;
    if(!this.moved)return;
    l={viewportW:this.viewportW,viewportH:this.viewportH,atlasW:this.atlasW,atlasH:this.atlasH};
    r=model.clampPan(this.startLeft+dx,this.startTop+dy,l);
    this.imageLeft=r.left;this.imageTop=r.top;
  },
  touchMove: function (event) {
    if(!this.ready || this.leaving || !this.touching)return;
    this.applyGesturePoint(this.point(event));
  },
  touchEnd: function (event) {
    if(!this.ready || this.leaving || !this.touching)return;
    var p=this.point(event);this.applyGesturePoint(p);this.touching=false;
    this.tapBlockUntil=Date.now()+150;
    if(this.moved){this.save();console.info('PT:pan_end left='+this.imageLeft+' top='+this.imageTop);return;}
    if(p.time-this.downAt<0 || p.time-this.downAt>500){this.save();return;}
    this.openAt(p.x-this.margin,p.y-this.headerH);
  },
  touchCancel: function (event) {
    if(!this.touching)return;
    var p=this.point(event);this.applyGesturePoint(p);this.touching=false;this.moved=true;this.save();
    this.tapBlockUntil=Date.now()+150;
    console.info('PT:pan_cancel left='+this.imageLeft+' top='+this.imageTop);
  },
  tap: function (event) {
    if(!this.ready || this.leaving || this.touching || !event || Date.now()<this.tapBlockUntil)return;
    var x=typeof event.globalX==='number'?event.globalX:event.x;
    var y=typeof event.globalY==='number'?event.globalY:event.y;
    if(typeof x!=='number' || typeof y!=='number' || !isFinite(x) || !isFinite(y))return;
    x-=this.margin;y-=this.headerH;
    if(x<0 || y<0 || x>=this.viewportW || y>=this.viewportH)return;
    this.openAt(x,y);
  },
  clearFocus: function () {if(this.focusTimer){clearTimeout(this.focusTimer);this.focusTimer=0;}},
  focusLater: function () {
    this.clearFocus();if(!this.active || !this.ready)return;
    var self=this;this.focusTimer=setTimeout(function(){self.focusTimer=0;if(self.active && self.alive)self.focusCrown(true);},80);
  },
  focusCrown: function (on) {
    var r=this.$refs && this.$refs.panCrown;
    if(r && r.rotation){try{r.rotation({focus:on});}catch(e){console.warn('PT:crown_focus_error');}}
  },
  listenCrown: function (event) {
    if(!this.ready || this.leaving || !event || typeof event.value!=='number')return;
    var value=event.value;
    var l={viewportW:this.viewportW,viewportH:this.viewportH,atlasW:this.atlasW,atlasH:this.atlasH};
    var p=model.clampPan(this.imageLeft,this.imageTop+(value-this.crownValue)*24,l);
    this.imageLeft=p.left;this.imageTop=p.top;this.crownValue=value;
    if(this.crownValue<=0 || this.crownValue>=100)this.crownValue=50;
    this.save();console.info('PT:crown_pan left='+this.imageLeft+' top='+this.imageTop);
  },
  openAt: function (localX,localY) {
    var l={viewportW:this.viewportW,viewportH:this.viewportH,atlasW:this.atlasW,atlasH:this.atlasH,tileW:this.tileW,tileH:this.tileH};
    var z=model.hit(localX,localY,this.imageLeft,this.imageTop,l),p;
    if(!z)return;
    if(z===-1 || z===-2){
      p=model.clampPan(this.imageLeft,-(z===-1?7:8)*this.tileH,l);this.imageTop=p.top;this.save();return;
    }
    var a=this.appState();if(!a){console.error('PT:no_app_state');return;}
    this.leaving=true;this.save();a.selectedElement=z;console.info('PT:select z='+z+' viaApp=1');router.replace({uri:'pages/detail/detail'});
  },
  onHide: function () {this.save();this.active=false;this.touching=false;this.layoutTicket++;this.clearFocus();this.focusCrown(false);},
  onDestroy: function () {this.onHide();this.alive=false;}
};
