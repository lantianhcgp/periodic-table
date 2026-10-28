import router from '@system.router';
import device from '@system.device';
import model from '../../common/model';
var CATEGORY_COLORS={alk:'#70433f',alk2:'#6b5136',tr:'#2d5270',post:'#3f5963',met:'#4b536f',nm:'#31595d',hal:'#5a496f',nob:'#365575',lan:'#5e4c3c',act:'#554361'};
export default {
  data: {
    ready:false,error:'\u6b63\u5728\u52a0\u8f7d\u5143\u7d20\u2026',active:false,alive:true,leaving:false,ticket:0,focusTimer:0,
    z:0,w:0,h:0,tableW:0,headerW:0,headerH:0,listH:0,footerW:0,footerH:0,
    font:20,smallFont:16,titleFont:22,textH:30,captionH:32,
    heroH:0,structureH:0,nucleusH:0,electronH:0,positionH:0,valenceH:0,noteH:0,gap:0,pad:0,
    cardW:0,thirdW:0,halfW:0,iconW:0,iconH:0,nameW:0,nameH:0,nameFont:32,
    nameCN:'',nameEN:'',nameSymbol:'',categoryText:'',tileColor:'#24313f',protonCount:'',electronCount:'',outerCount:'',
    shellText:'',configText:'',isoLabel:'',massNumber:'',neutronCount:'',nucleusNote:'N=A-Z\uff0c\u4e2d\u5b50\u6570\u968f\u6838\u7d20\u800c\u53d8\u3002',
    isoCount:0,iso1:'',iso2:'',iso3:'',isoW:0,isoH:0,iso1bg:'#31595d',iso2bg:'#24313f',iso3bg:'#24313f',
    weight:'',weightLabel:'',weightNote:'',periodText:'',groupText:'',oxidationText:'',
    pointText:'',noteText:'',pointH:0,noteTextH:0,ionization:'',electronegativity:'',
    meta:null
  },
  appState: function () {
    try{var a=getApp();if(a)return a;}catch(e){}
    try{if($app)return $app.$def||$app;}catch(e){}
    return this.$app && this.$app.$def ? this.$app.$def : null;
  },
  onInit: function () {
    this.alive=true;this.active=true;var a=this.appState();var z=a?a.selectedElement:0;
    if(typeof z!=='number' || z<1 || z>118 || Math.floor(z)!==z){this.error='\u8bf7\u4ece\u5468\u671f\u8868\u9009\u62e9\u5143\u7d20';console.error('PT:no_selection');return;}
    try{this.meta=a && a.getElement ? a.getElement(z) : null;}catch(e){this.error='\u5143\u7d20\u8d44\u6599\u52a0\u8f7d\u5931\u8d25';console.error('PT:catalog_error z='+z);return;}
    if(!this.meta){this.error='\u5143\u7d20\u4e0d\u5b58\u5728';return;}this.z=z;this.populate();this.measure();
  },
  onShow: function () {this.active=true;this.alive=true;this.leaving=false;if(this.meta)this.measure();},
  populate: function () {
    var e=this.meta;
    var names={alk:'\u78b1\u91d1\u5c5e',alk2:'\u78b1\u571f\u91d1\u5c5e',tr:'\u8fc7\u6e21\u91d1\u5c5e',post:'\u91d1\u5c5e',met:'\u7c7b\u91d1\u5c5e',nm:'\u975e\u91d1\u5c5e',hal:'\u5364\u7d20',nob:'\u7a00\u6709\u6c14\u4f53',lan:'\u9567\u7cfb',act:'\u9515\u7cfb'};
    this.nameCN=e.cn;this.nameEN=e.en;this.nameSymbol=e.symbol;this.categoryText=names[e.category]||'';this.tileColor=CATEGORY_COLORS[e.category]||'#24313f';
    this.protonCount=e.z;this.electronCount=e.z;this.outerCount=e.shells[e.shells.length-1];
    this.shellText=e.shells.join(' \xb7 ');this.configText=e.config;
    this.isoCount=e.isotopes.length;this.iso1=e.symbol+'-'+e.isotopes[0];
    this.iso2=e.isotopes.length>1?e.symbol+'-'+e.isotopes[1]:'';
    this.iso3=e.isotopes.length>2?e.symbol+'-'+e.isotopes[2]:'';
    this.weight=e.weight;this.weightLabel=e.weightKind==='nuclide'?'\u4ee3\u8868\u6838\u7d20\u8d28\u91cf\u6570':'\u76f8\u5bf9\u539f\u5b50\u8d28\u91cf';
    this.weightNote=e.weightKind==='nuclide'?'\u65e0\u6807\u51c6\u539f\u5b50\u91cf\uff1b\u65b9\u62ec\u53f7\u5185\u4e3a\u6838\u7d20\u8d28\u91cf\u6570':'\u5e38\u7528\u7b80\u5199\uff1b\u5929\u7136\u540c\u4f4d\u7d20\u7684\u52a0\u6743\u7ed3\u679c';
    this.periodText='\u7b2c'+e.period+'\u5468\u671f';this.groupText=e.group;
    this.oxidationText=e.oxidation;this.ionization=e.ionization;this.electronegativity=e.electronegativity;
    this.switchIsotope(0);
  },
  measure: function () {
    var self=this,ticket=++this.ticket;
    try{device.getInfo({
      success:function(info){
        if(!self.alive || !self.active || ticket!==self.ticket)return;
        var v=model.viewport(info);if(!v){self.ready=false;self.error='\u5c4f\u5e55\u4fe1\u606f\u65e0\u6548\uff0c\u70b9\u6b64\u91cd\u8bd5';return;}
        self.w=v.w;self.h=v.h;self.layout();self.ready=true;self.error='';self.focusLater();
        console.info('PT:detail_ready z='+self.z+' w='+self.w+' h='+self.h+' isotope='+self.isoLabel+' p='+self.protonCount+' n='+self.neutronCount);
      },
      fail:function(){if(self.alive && self.active && ticket===self.ticket){self.ready=false;self.error='\u65e0\u6cd5\u8bfb\u53d6\u5c4f\u5e55\u4fe1\u606f\uff0c\u70b9\u6b64\u91cd\u8bd5';}}
    });}catch(e){this.ready=false;this.error='\u5c4f\u5e55\u63a5\u53e3\u9519\u8bef';console.error('PT:detail_device_error');}
  },
  layout: function () {
    var l=model.layout(this.w,this.h,1),f=l.font;
    this.tableW=l.tableW;this.headerW=l.headerW;this.headerH=l.headerH;this.listH=l.detailH;
    this.footerW=l.footerW;this.footerH=l.footerH;this.font=f;this.smallFont=l.smallFont;this.titleFont=l.titleFont;
    this.textH=Math.round(f*1.5);this.captionH=Math.round(l.titleFont*1.5);
    this.gap=Math.round(f*0.65);this.pad=Math.round(f*0.6);this.cardW=l.tableW-this.pad*2;
    this.thirdW=Math.floor(this.cardW/3);this.halfW=Math.floor(this.cardW/2);
    this.iconW=Math.round(this.cardW*0.25);this.iconH=Math.round(this.iconW*128/114);
    this.nameW=this.cardW-this.iconW-this.gap;this.nameH=Math.round(f*2.25);this.nameFont=Math.round(f*1.65);
    this.heroH=Math.max(this.iconH,this.nameH+this.textH*2)+this.pad*2;
    this.structureH=this.captionH+this.textH*2+this.pad*2;
    this.isoH=Math.round(f*2);this.isoW=Math.floor((this.cardW-this.gap*4)/3);
    this.nucleusH=this.captionH+this.textH*3+this.isoH+this.pad*2+this.gap*2;
    this.electronH=this.captionH+this.textH*6+this.pad*2;
    this.positionH=this.textH*4+this.pad*2;
    var columns=Math.max(12,Math.floor(this.cardW/f));
    this.pointText=model.wrap(this.meta.keyPoint,columns);
    this.pointH=this.pointText.split('\n').length*this.textH;
    this.noteText=model.wrap(this.meta.note,columns);this.noteTextH=this.noteText.split('\n').length*this.textH;
    this.valenceH=this.captionH+this.textH+this.pointH+this.pad*2+this.gap;
    this.noteH=this.captionH+this.noteTextH+this.pad*2;
  },
  switchIsotope: function (i) {
    var e=this.meta;if(!e || i<0 || i>=e.isotopes.length)return;
    var a=e.isotopes[i],n=model.nucleus(e.z,a);if(!n){console.error('PT:nucleus_invalid');return;}
    this.massNumber=a;this.neutronCount=n.neutrons;this.isoLabel=e.symbol+'-'+a;
    this.iso1bg=i===0?'#31595d':'#24313f';this.iso2bg=i===1?'#31595d':'#24313f';this.iso3bg=i===2?'#31595d':'#24313f';
    if(this.ready)this.focusLater();
    console.info('PT:isotope z='+e.z+' a='+a+' n='+n.neutrons);
  },
  clearFocus: function () {if(this.focusTimer){clearTimeout(this.focusTimer);this.focusTimer=0;}},
  focus: function (on) {
    var r=this.$refs && this.$refs.detailList;
    if(r && r.rotation){try{r.rotation({focus:on});if(on)console.info('PT:detail_focus on=1');}catch(e){console.warn('PT:detail_focus_error');}}
  },
  focusLater: function () {this.clearFocus();if(!this.active)return;var self=this;this.focusTimer=setTimeout(function(){self.focusTimer=0;if(self.alive && self.active)self.focus(true);},150);},
  onScrollEnd: function () {console.info('PT:detail_scroll_end z='+this.z);},
  onHide: function () {this.active=false;this.ticket++;this.clearFocus();this.focus(false);},
  onDestroy: function () {this.onHide();this.alive=false;this.meta=null;},
  retry: function () {if(this.meta)this.measure();else this.back();},
  back: function () {if(this.leaving)return;this.leaving=true;this.onHide();console.info('PT:back z='+this.z);router.replace({uri:'pages/index/index'});}
};
