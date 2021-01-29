// (function(){!function(a,b){return"function"==typeof define&&define.amd?define(function(){return b()}):"object"==typeof exports?module.exports=b():a.ifvisible=b()}(this,function(){var a,b,c,d,e,f,g,h,i,j,k,l,m,n;return i={},c=document,k=!1,l="active",g=6e4,f=!1,b=function(){var a,b,c,d,e,f,g;return a=function(){return(65536*(1+Math.random())|0).toString(16).substring(1)},e=function(){return a()+a()+"-"+a()+"-"+a()+"-"+a()+"-"+a()+a()+a()},f={},c="__ceGUID",b=function(a,b,d){return a[c]=void 0,a[c]||(a[c]="ifvisible.object.event.identifier"),f[a[c]]||(f[a[c]]={}),f[a[c]][b]||(f[a[c]][b]=[]),f[a[c]][b].push(d)},d=function(a,b,d){var e,g,h,i,j;if(a[c]&&f[a[c]]&&f[a[c]][b]){for(i=f[a[c]][b],j=[],g=0,h=i.length;g<h;g++)e=i[g],j.push(e(d||{}));return j}},g=function(a,b,d){var e,g,h,i,j;if(d){if(a[c]&&f[a[c]]&&f[a[c]][b])for(j=f[a[c]][b],g=h=0,i=j.length;h<i;g=++h)if(e=j[g],e===d)return f[a[c]][b].splice(g,1),e}else if(a[c]&&f[a[c]]&&f[a[c]][b])return delete f[a[c]][b]},{add:b,remove:g,fire:d}}(),a=function(){var a;return a=!1,function(b,c,d){return a||(a=b.addEventListener?function(a,b,c){return a.addEventListener(b,c,!1)}:b.attachEvent?function(a,b,c){return a.attachEvent("on"+b,c,!1)}:function(a,b,c){return a["on"+b]=c}),a(b,c,d)}}(),d=function(a,b){var d;return c.createEventObject?a.fireEvent("on"+b,d):(d=c.createEvent("HTMLEvents"),d.initEvent(b,!0,!0),!a.dispatchEvent(d))},h=function(){var a,b,d,e,f;for(e=void 0,f=3,d=c.createElement("div"),a=d.getElementsByTagName("i"),b=function(){return d.innerHTML="<!--[if gt IE "+ ++f+"]><i></i><![endif]-->",a[0]};b(););return f>4?f:e}(),e=!1,n=void 0,"undefined"!=typeof c.hidden?(e="hidden",n="visibilitychange"):"undefined"!=typeof c.mozHidden?(e="mozHidden",n="mozvisibilitychange"):"undefined"!=typeof c.msHidden?(e="msHidden",n="msvisibilitychange"):"undefined"!=typeof c.webkitHidden&&(e="webkitHidden",n="webkitvisibilitychange"),m=function(){var b,d;return b=[],d=function(){return b.map(clearTimeout),"active"!==l&&i.wakeup(),f=+new Date,b.push(setTimeout(function(){if("active"===l)return i.idle()},g))},d(),a(c,"mousemove",d),a(c,"keyup",d),a(c,"touchstart",d),a(window,"scroll",d),i.focus(d),i.wakeup(d)},j=function(){var b;return!!k||(e===!1?(b="blur",h<9&&(b="focusout"),a(window,b,function(){return i.blur()}),a(window,"focus",function(){return i.focus()})):a(c,n,function(){return c[e]?i.blur():i.focus()},!1),k=!0,m())},i={setIdleDuration:function(a){return g=1e3*a},getIdleDuration:function(){return g},getIdleInfo:function(){var a,b;return a=+new Date,b={},"idle"===l?(b.isIdle=!0,b.idleFor=a-f,b.timeLeft=0,b.timeLeftPer=100):(b.isIdle=!1,b.idleFor=a-f,b.timeLeft=f+g-a,b.timeLeftPer=(100-100*b.timeLeft/g).toFixed(2)),b},focus:function(a){return"function"==typeof a?this.on("focus",a):(l="active",b.fire(this,"focus"),b.fire(this,"wakeup"),b.fire(this,"statusChanged",{status:l})),this},blur:function(a){return"function"==typeof a?this.on("blur",a):(l="hidden",b.fire(this,"blur"),b.fire(this,"idle"),b.fire(this,"statusChanged",{status:l})),this},idle:function(a){return"function"==typeof a?this.on("idle",a):(l="idle",b.fire(this,"idle"),b.fire(this,"statusChanged",{status:l})),this},wakeup:function(a){return"function"==typeof a?this.on("wakeup",a):(l="active",b.fire(this,"wakeup"),b.fire(this,"statusChanged",{status:l})),this},on:function(a,c){return j(),b.add(this,a,c),this},off:function(a,c){return j(),b.remove(this,a,c),this},onEvery:function(a,b){var c,d;return j(),c=!1,b&&(d=setInterval(function(){if("active"===l&&c===!1)return b()},1e3*a)),{stop:function(){return clearInterval(d)},pause:function(){return c=!0},resume:function(){return c=!1},code:d,callback:b}},now:function(a){return j(),l===(a||"active")}}})}).call(this);


(function() {
  (function(root, factory) {
    if (typeof define === 'function' && define.amd) {
      return define(function() {
        return factory();
      });
    } else if (typeof exports === 'object') {
      return module.exports = factory();
    } else {
      return root.ifvisible = factory();
    }
  })(this, function() {
    var addEvent, customEvent, doc, fireEvent, hidden, idleStartedTime, idleTime, ie, ifvisible, init, initialized, status, trackIdleStatus, visibilityChange;
    ifvisible = {};
    doc = document;
    initialized = false;
    status = "active";
    var startedHidden = false;

	// xcalar custom code to test if page starts off out of focus
  var scrolled = false;
	var html = '<div id="ifvisibleScrollTest" style="height:100px; overflow:scroll;">' +
	'<div class="content" style="height:2000px;"></div></div>';
	$("body").append(html);
	$("#ifvisibleScrollTest").scroll(function() {
		scrolled = true;
	});
	$("#ifvisibleScrollTest").scrollTop(500);

	setTimeout(function() {
		if (!scrolled) {
			status = "hidden";
			startedHidden = true;
			 if (typeof doc.hidden !== "undefined") {
		      hidden = "hidden";
		      visibilityChange = "visibilitychange";
		    } else if (typeof doc.mozHidden !== "undefined") {
		      hidden = "mozHidden";
		      visibilityChange = "mozvisibilitychange";
		    } else if (typeof doc.msHidden !== "undefined") {
		      hidden = "msHidden";
		      visibilityChange = "msvisibilitychange";
		    } else if (typeof doc.webkitHidden !== "undefined") {
		      hidden = "webkitHidden";
		      visibilityChange = "webkitvisibilitychange";
		    }
		}
		// if we remove immediately, scroll doesn't get triggered
		$("#ifvisibleScrollTest").remove();
    window.ifvisible.now(); // initialize blur listener
	});

    idleTime = 60000;
    idleStartedTime = false;
    customEvent = (function() {
      var S4, addCustomEvent, cgid, fireCustomEvent, guid, listeners, removeCustomEvent;
      S4 = function() {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
      };
      guid = function() {
        return S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4();
      };
      listeners = {};
      cgid = '__ceGUID';
      addCustomEvent = function(obj, event, callback) {
        obj[cgid] = undefined;
        if (!obj[cgid]) {
          obj[cgid] = "ifvisible.object.event.identifier";
        }
        if (!listeners[obj[cgid]]) {
          listeners[obj[cgid]] = {};
        }
        if (!listeners[obj[cgid]][event]) {
          listeners[obj[cgid]][event] = [];
        }
        return listeners[obj[cgid]][event].push(callback);
      };
      fireCustomEvent = function(obj, event, memo) {
        var ev, j, len, ref, results;
        if (obj[cgid] && listeners[obj[cgid]] && listeners[obj[cgid]][event]) {
          ref = listeners[obj[cgid]][event];
          results = [];
          for (j = 0, len = ref.length; j < len; j++) {
            ev = ref[j];
            results.push(ev(memo || {}));
          }
          return results;
        }
      };
      removeCustomEvent = function(obj, event, callback) {
        var cl, i, j, len, ref;
        if (callback) {
          if (obj[cgid] && listeners[obj[cgid]] && listeners[obj[cgid]][event]) {
            ref = listeners[obj[cgid]][event];
            for (i = j = 0, len = ref.length; j < len; i = ++j) {
              cl = ref[i];
              if (cl === callback) {
                listeners[obj[cgid]][event].splice(i, 1);
                return cl;
              }
            }
          }
        } else {
          if (obj[cgid] && listeners[obj[cgid]] && listeners[obj[cgid]][event]) {
            return delete listeners[obj[cgid]][event];
          }
        }
      };
      return {
        add: addCustomEvent,
        remove: removeCustomEvent,
        fire: fireCustomEvent
      };
    })();
    addEvent = (function() {
      var setListener;
      setListener = false;
      return function(el, ev, fn) {
        if (!setListener) {
          if (el.addEventListener) {
            setListener = function(el, ev, fn) {
              return el.addEventListener(ev, fn, false);
            };
          } else if (el.attachEvent) {
            setListener = function(el, ev, fn) {
              return el.attachEvent('on' + ev, fn, false);
            };
          } else {
            setListener = function(el, ev, fn) {
              return el['on' + ev] = fn;
            };
          }
        }
        return setListener(el, ev, fn);
      };
    })();
    fireEvent = function(element, event) {
      var evt;
      if (doc.createEventObject) {
        return element.fireEvent('on' + event, evt);
      } else {
        evt = doc.createEvent('HTMLEvents');
        evt.initEvent(event, true, true);
        return !element.dispatchEvent(evt);
      }
    };
    ie = (function() {
      var all, check, div, undef, v;
      undef = void 0;
      v = 3;
      div = doc.createElement("div");
      all = div.getElementsByTagName("i");
      check = function() {
        return (div.innerHTML = "<!--[if gt IE " + (++v) + "]><i></i><![endif]-->", all[0]);
      };
      while (check()) {
        continue;
      }
      if (v > 4) {
        return v;
      } else {
        return undef;
      }
    })();
    hidden = false;
    visibilityChange = void 0;
    if (typeof doc.hidden !== "undefined") {
      hidden = "hidden";
      visibilityChange = "visibilitychange";
    } else if (typeof doc.mozHidden !== "undefined") {
      hidden = "mozHidden";
      visibilityChange = "mozvisibilitychange";
    } else if (typeof doc.msHidden !== "undefined") {
      hidden = "msHidden";
      visibilityChange = "msvisibilitychange";
    } else if (typeof doc.webkitHidden !== "undefined") {
      hidden = "webkitHidden";
      visibilityChange = "webkitvisibilitychange";
    }
    trackIdleStatus = function() {
      var timer, wakeUp;
      timer = [];
      wakeUp = function() {
        timer.map(clearTimeout);
        if (status !== "active" && !startedHidden) {
          ifvisible.wakeup();
        }
        if (startedHidden) {
        	startedHidden = false;
        }
        idleStartedTime = +(new Date());
        return timer.push(setTimeout(function() {
          if (status === "active") {
            return ifvisible.idle();
          }
        }, idleTime));
      };
      wakeUp();
      addEvent(doc, "mousemove", wakeUp);
      addEvent(doc, "keyup", wakeUp);
      addEvent(doc, "touchstart", wakeUp);
      addEvent(window, "scroll", wakeUp);
      ifvisible.focus(wakeUp);
      return ifvisible.wakeup(wakeUp);
    };
    init = function() {
      var blur;
      if (initialized) {
        return true;
      }
      if (hidden === false) {
        blur = "blur";
        if (ie < 9) {
          blur = "focusout";
        }
        addEvent(window, blur, function() {
          return ifvisible.blur();
        });
        addEvent(window, "focus", function() {
          return ifvisible.focus();
        });
      } else {
        addEvent(doc, visibilityChange, function() {
          if (doc[hidden]) {
            return ifvisible.blur();
          } else {
            return ifvisible.focus();
          }
        }, false);
      }
      initialized = true;
      return trackIdleStatus();
    };
    ifvisible = {
      setIdleDuration: function(seconds) {
        return idleTime = seconds * 1000;
      },
      getIdleDuration: function() {
        return idleTime;
      },
      getIdleInfo: function() {
        var now, res;
        now = +(new Date());
        res = {};
        if (status === "idle") {
          res.isIdle = true;
          res.idleFor = now - idleStartedTime;
          res.timeLeft = 0;
          res.timeLeftPer = 100;
        } else {
          res.isIdle = false;
          res.idleFor = now - idleStartedTime;
          res.timeLeft = (idleStartedTime + idleTime) - now;
          res.timeLeftPer = (100 - (res.timeLeft * 100 / idleTime)).toFixed(2);
        }
        return res;
      },
      focus: function(callback) {
        if (typeof callback === "function") {
          this.on("focus", callback);
        } else {
          status = "active";
          customEvent.fire(this, "focus");
          customEvent.fire(this, "wakeup");
          customEvent.fire(this, "statusChanged", {
            status: status
          });
        }
        return this;
      },
      blur: function(callback) {
        if (typeof callback === "function") {
          this.on("blur", callback);
        } else {
          status = "hidden";
          customEvent.fire(this, "blur");
          customEvent.fire(this, "idle");
          customEvent.fire(this, "statusChanged", {
            status: status
          });
        }
        return this;
      },
      idle: function(callback) {
        if (typeof callback === "function") {
          this.on("idle", callback);
        } else {
          status = "idle";
          customEvent.fire(this, "idle");
          customEvent.fire(this, "statusChanged", {
            status: status
          });
        }
        return this;
      },
      wakeup: function(callback) {
        if (typeof callback === "function") {
          this.on("wakeup", callback);
        } else {
          status = "active";
          customEvent.fire(this, "wakeup");
          customEvent.fire(this, "statusChanged", {
            status: status
          });
        }
        return this;
      },
      on: function(name, callback) {
        init();
        customEvent.add(this, name, callback);
        return this;
      },
      off: function(name, callback) {
        init();
        customEvent.remove(this, name, callback);
        return this;
      },
      onEvery: function(seconds, callback) {
        var paused, t;
        init();
        paused = false;
        if (callback) {
          t = setInterval(function() {
            if (status === "active" && paused === false) {
              return callback();
            }
          }, seconds * 1000);
        }
        return {
          stop: function() {
            return clearInterval(t);
          },
          pause: function() {
            return paused = true;
          },
          resume: function() {
            return paused = false;
          },
          code: t,
          callback: callback
        };
      },
      now: function(check) {
        init();
        return status === (check || "active");
      }
    };
    return ifvisible;
  });

}).call(this);