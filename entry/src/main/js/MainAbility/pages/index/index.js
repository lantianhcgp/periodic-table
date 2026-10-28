import router from '@system.router';
import device from '@system.device';
import model from '../../common/model';
import grid from '../../common/grid';
export default {
  data: {
    ready:false,error:'\u6b63\u5728\u8bfb\u53d6\u5c4f\u5e55\u5e03\u5c40\u2026',zoom:1,cols:6,colStart:0,
    w:0,h:0,margin:0,tableW:0,headerW:0,headerH:0,listH:0,hintH:0,footerH:0,
    footerW:0,btnW:0,btnGap:0,tileW:0,tileH:0,
    font:20,titleFont:22,smallFont:16,textH:30,captionH:32,controlFont:27,
    titleW:0,badgeW:0,hint:'',zoomLabel:'1\xd7',listOn:false,canvasOn:false,
    active:false,alive:true,leaving:false,focusTimer:0,renderTimer:0,drawTimer:0,layoutTicket:0,renderTicket:0,
    moved:false,touchX:0,touchY:0,lastSwipeAt:0,lastMoveAt:0
  },
  appState: function () { return this.$app && this.$app.$def ? this.$app.$def : null; },
  onInit: function () { this.active=true;this.alive=true;this.restore();this.measure(); },
  onShow: function () { this.active=true;this.alive=true;this.leaving=false;this.restore();this.measure(); },
  restore: function () {
    var a=this.appState();if(!a)return;
    this.zoom=a.tableZoom===2 || a.tableZoom===3 ? a.tableZoom : 1;
    this.colStart=typeof a.tableColumn==='number' ? a.tableColumn : 0;
  },
  save: function () {var a=this.appState();if(a){a.tableZoom=this.zoom;a.tableColumn=this.colStart;}},
  measure: function () {
    var self=this,ticket=++this.layoutTicket;
    try{device.getInfo({
      success:function(info){
        if(!self.alive || !self.active || ticket!==self.layoutTicket)return;
        var v=model.viewport(info);
        if(!v){self.ready=false;self.error='\u5c4f\u5e55\u4fe1\u606f\u65e0\u6548\uff0c\u70b9\u6b64\u91cd\u8bd5';return;}
        self.w=v.w;self.h=v.h;self.layout();self.ready=true;self.error='';self.scheduleCanvas(true);
        console.info('PT:index_ready w='+self.w+' h='+self.h+' zoom='+self.zoom+' col='+self.colStart+' cols='+self.cols);
      },
      fail:function(){if(self.alive && self.active && ticket===self.layoutTicket){self.ready=false;self.error='\u65e0\u6cd5\u8bfb\u53d6\u5c4f\u5e55\u4fe1\u606f\uff0c\u70b9\u6b64\u91cd\u8bd5';}}
    });}catch(e){this.ready=false;this.error='\u5c4f\u5e55\u63a5\u53e3\u9519\u8bef\uff0c\u70b9\u6b64\u91cd\u8bd5';console.error('PT:device_error');}
  },
  layout: function () {
    var l=model.layout(this.w,this.h,this.zoom);
    this.margin=l.margin;this.tableW=l.tableW;this.headerW=l.headerW;this.headerH=l.headerH;
    this.listH=l.listH;this.hintH=l.hintH;this.footerH=l.footerH;this.footerW=l.footerW;
    this.btnW=l.btnW;this.btnGap=l.btnGap;this.tileW=l.tileW;this.tileH=l.tileH;
    this.font=l.font;this.titleFont=l.titleFont;this.smallFont=l.smallFont;
    this.textH=Math.round(l.font*1.5);this.captionH=Math.round(l.titleFont*1.5);this.controlFont=l.font+8;
    this.titleW=Math.round(l.headerW*0.72);this.badgeW=l.headerW-this.titleW;
    this.cols=l.cols;this.colStart=Math.max(0,Math.min(18-this.cols,this.colStart));
    this.hint=(this.colStart+1)+'\u2013'+(this.colStart+this.cols)+'\u5217 \xb7 \u5de6\u53f3\u6ed1\u52a8';
    this.zoomLabel=this.zoom+'\xd7';this.save();
  },
  clearFocus: function () {if(this.focusTimer){clearTimeout(this.focusTimer);this.focusTimer=0;}},
  clearCanvasTimers: function () {
    if(this.renderTimer){clearTimeout(this.renderTimer);this.renderTimer=0;}
    if(this.drawTimer){clearTimeout(this.drawTimer);this.drawTimer=0;}
  },
  focus: function (on) {
    var r=this.$refs && this.$refs.tableList;
    if(r && r.rotation){try{r.rotation({focus:on});}catch(e){console.warn('PT:focus_error');}}
  },
  focusLater: function () {
    this.clearFocus();if(!this.active)return;
    var self=this;this.focusTimer=setTimeout(function(){self.focusTimer=0;if(self.alive && self.active)self.focus(true);},150);
  },
  scheduleCanvas: function (recreateList) {
    this.clearCanvasTimers();this.canvasOn=false;if(recreateList)this.listOn=false;var self=this,ticket=++this.renderTicket;
    if(!this.ready || !this.active || !this.alive)return;
    this.renderTimer=setTimeout(function(){
      self.renderTimer=0;if(!self.active || !self.alive || ticket!==self.renderTicket)return;
      if(recreateList)self.listOn=true;self.canvasOn=true;
      self.drawTimer=setTimeout(function(){self.drawTimer=0;if(self.active && self.alive && ticket===self.renderTicket)self.drawAll();},45);
    },5);
  },
  drawAll: function () {
    var refs=this.$refs,r,canvas,ctx;
    if(!refs){this.canvasFailure();return;}
    try{
      for(r=0;r<9;r++){
        canvas=refs['c'+r];if(!canvas || !canvas.getContext){this.canvasFailure();return;}
        ctx=canvas.getContext('2d');if(!ctx){this.canvasFailure();return;}
        this.drawRow(ctx,r);
      }
      this.focusLater();
      console.info('PT:canvas_draw zoom='+this.zoom+' col='+this.colStart+' rows=9');
    }catch(e){this.canvasFailure();}
  },
  canvasFailure: function () {
    this.renderTicket++;this.clearCanvasTimers();this.clearFocus();this.focus(false);this.listOn=false;this.canvasOn=false;this.ready=false;
    this.error='\u8868\u683c\u7ed8\u5236\u5931\u8d25\uff0c\u70b9\u6b64\u91cd\u8bd5';console.error('PT:canvas_error');
  },
  drawRow: function (ctx,row) {
    var c,z,x,gap=this.tileW<80?2:3;
    ctx.fillStyle='#0c1119';ctx.fillRect(0,0,this.tableW,this.tileH);
    for(c=0;c<this.cols;c++){
      z=model.cell(row,c,this.colStart,this.zoom);if(!z)continue;x=c*this.tileW;
      ctx.fillStyle=grid.color(z);ctx.fillRect(x+gap,gap,this.tileW-gap*2,this.tileH-gap*2);
      ctx.fillStyle='#edf3fa';ctx.textAlign='center';ctx.textBaseline='middle';
      if(z<0){
        ctx.font='SourceHanSansSC-Regular '+Math.max(12,Math.round(this.tileW*0.22))+'px';ctx.fillText(grid.symbol(z),x+this.tileW/2,this.tileH*0.43);
        ctx.font='SourceHanSansSC-Regular '+Math.max(12,Math.round(this.tileW*0.21))+'px';ctx.fillText(grid.name(z),x+this.tileW/2,this.tileH*0.72);
      }else{
        ctx.fillStyle='#becbd8';ctx.textAlign='right';ctx.textBaseline='top';ctx.font='SourceHanSansSC-Regular '+Math.max(10,Math.round(this.tileW*0.18))+'px';ctx.fillText(String(z),x+this.tileW-gap-4,gap+3);
        if(grid.isCore(z)){ctx.fillStyle='#f6c879';ctx.fillRect(x+gap+5,gap+6,Math.max(4,Math.round(this.tileW*0.05)),Math.max(4,Math.round(this.tileW*0.05)));}
        ctx.fillStyle='#f0f3f8';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='SourceHanSansSC-Regular '+Math.max(17,Math.round(this.tileW*0.42))+'px';ctx.fillText(grid.symbol(z),x+this.tileW/2,this.tileH*0.43);
        ctx.font='SourceHanSansSC-Regular '+Math.max(12,Math.round(this.tileW*0.22))+'px';ctx.fillText(grid.name(z),x+this.tileW/2,this.tileH*0.78);
      }
    }
  },
  onHide: function () {this.save();this.active=false;this.layoutTicket++;this.renderTicket++;this.clearFocus();this.clearCanvasTimers();this.listOn=false;this.canvasOn=false;this.focus(false);},
  onDestroy: function () {this.onHide();this.alive=false;},
  touchStart: function (event) {
    this.moved=false;var t=event && event.touches && event.touches[0] ? event.touches[0] : event || {};
    if(typeof t.globalX==='number')this.touchX=t.globalX-this.margin;
    else if(typeof t.localX==='number')this.touchX=t.localX;
    else this.touchX=typeof t.x==='number'?t.x-this.margin:0;
    this.touchY=typeof t.globalY==='number'?t.globalY:typeof t.localY==='number'?t.localY:typeof t.y==='number'?t.y:0;
  },
  touchMove: function (event) {
    var t=event && event.touches && event.touches[0] ? event.touches[0] : event || {};
    var x=typeof t.globalX==='number'?t.globalX-this.margin:typeof t.localX==='number'?t.localX:typeof t.x==='number'?t.x-this.margin:this.touchX;
    var y=typeof t.globalY==='number'?t.globalY:typeof t.localY==='number'?t.localY:typeof t.y==='number'?t.y:this.touchY;
    if(Math.abs(x-this.touchX)>12 || Math.abs(y-this.touchY)>12){this.moved=true;this.lastMoveAt=Date.now();}
  },
  onSwipe: function (event) {
    if(!this.ready || !this.active || this.leaving)return;
    var direction=event && (event.direction || event.detail && event.detail.direction);
    if(direction!=='left' && direction!=='right')return;
    var now=Date.now();if(now-this.lastSwipeAt<180)return;
    this.lastSwipeAt=now;this.lastMoveAt=now;this.moved=true;var next=model.shift(this.colStart,this.zoom,direction);
    if(next===this.colStart)return;
    this.colStart=next;this.layout();this.scheduleCanvas(false);
    console.info('PT:swipe direction='+direction+' col='+this.colStart+' zoom='+this.zoom);
  },
  onScrollEnd: function () {console.info('PT:scroll_end zoom='+this.zoom+' col='+this.colStart);},
  zoomIn: function () {if(!this.ready || this.leaving || this.zoom===3)return;this.zoom++;this.layout();this.scheduleCanvas(true);console.info('PT:zoom value='+this.zoom+' cols='+this.cols);},
  zoomOut: function () {if(!this.ready || this.leaving || this.zoom===1)return;this.zoom--;this.layout();this.scheduleCanvas(true);console.info('PT:zoom value='+this.zoom+' cols='+this.cols);},
  reset: function () {
    if(!this.ready || this.leaving)return;this.zoom=1;this.colStart=0;this.layout();
    var r=this.$refs && this.$refs.tableList;if(r && r.scrollTo){try{r.scrollTo({index:0});}catch(e){console.warn('PT:scroll_error');}}
    this.scheduleCanvas(true);console.info('PT:reset');
  },
  openRow0: function (event) {this.openRow(0,event);},
  openRow1: function (event) {this.openRow(1,event);},
  openRow2: function (event) {this.openRow(2,event);},
  openRow3: function (event) {this.openRow(3,event);},
  openRow4: function (event) {this.openRow(4,event);},
  openRow5: function (event) {this.openRow(5,event);},
  openRow6: function (event) {this.openRow(6,event);},
  openRow7: function (event) {this.openRow(7,event);},
  openRow8: function (event) {this.openRow(8,event);},
  openRow: function (row,event) {
    var now=Date.now();if(!this.ready || this.leaving || now-this.lastSwipeAt<180 || now-this.lastMoveAt<180)return;
    var t=event && event.touches && event.touches[0] ? event.touches[0] : event || {};
    if(typeof t.globalX==='number')this.touchX=t.globalX-this.margin;
    else if(typeof t.localX==='number')this.touchX=t.localX;
    else if(typeof t.x==='number')this.touchX=t.x-this.margin;
    this.moved=false;
    var slot=Math.floor(this.touchX/this.tileW);var z=model.cell(row,slot,this.colStart,this.zoom);if(!z)return;
    console.info('PT:tap row='+row+' slot='+slot+' z='+z);
    if(z===-1 || z===-2){var r=this.$refs && this.$refs.tableList;if(r && r.scrollTo){r.scrollTo({index:z===-1?7:8});}return;}
    var a=this.appState();if(!a){console.error('PT:no_app_state');return;}
    this.leaving=true;this.save();a.selectedElement=z;console.info('PT:select z='+z+' viaApp=1');router.replace({uri:'pages/detail/detail'});
  }
};
