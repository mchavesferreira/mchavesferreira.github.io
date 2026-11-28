(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AvrMobileTouch = factory();
  }
}(this, function () {
  'use strict';

  var TOUCH_MAP = {
    mousedown: ['touchstart'],
    mousemove: ['touchmove'],
    mouseup: ['touchend', 'touchcancel']
  };

  function supportsPassiveEvents(win) {
    var target = win || (typeof window !== 'undefined' ? window : null);
    if (!target || typeof target.addEventListener !== 'function') return false;
    var supported = false;
    var noop = function () {};
    try {
      var options = Object.defineProperty({}, 'passive', {
        get: function () {
          supported = true;
          return false;
        }
      });
      target.addEventListener('testpassive', noop, options);
      if (typeof target.removeEventListener === 'function') {
        target.removeEventListener('testpassive', noop, options);
      }
    } catch (e) {
      supported = false;
    }
    return supported;
  }

  function isHtmlUiTarget(target) {
    var cur = target;
    while (cur && cur.nodeType === 1) {
      var nodeName = String(cur.nodeName || '').toUpperCase();
      if (nodeName === 'INPUT' || nodeName === 'TEXTAREA' || nodeName === 'SELECT' ||
          nodeName === 'OPTION' || nodeName === 'BUTTON' || nodeName === 'A') {
        return true;
      }
      var cls = typeof cur.className === 'string' ? cur.className : '';
      if (/\b(?:blocklyToolboxDiv|blocklyTreeRow|blocklyDropdownMenu|blocklyHtmlInput)\b/.test(cls)) {
        return true;
      }
      cur = cur.parentNode;
    }
    return false;
  }

  function normalizeTouchEvent(event) {
    var touch = null;
    if (event && event.changedTouches && event.changedTouches.length) {
      touch = event.changedTouches[0];
    } else if (event && event.touches && event.touches.length) {
      touch = event.touches[0];
    }
    return {
      originalEvent: event,
      type: event && event.type || '',
      target: event && event.target || null,
      currentTarget: event && event.currentTarget || null,
      clientX: touch && typeof touch.clientX === 'number' ? touch.clientX :
        (event && typeof event.clientX === 'number' ? event.clientX : 0),
      clientY: touch && typeof touch.clientY === 'number' ? touch.clientY :
        (event && typeof event.clientY === 'number' ? event.clientY : 0),
      pageX: touch && typeof touch.pageX === 'number' ? touch.pageX :
        (event && typeof event.pageX === 'number' ? event.pageX : 0),
      pageY: touch && typeof touch.pageY === 'number' ? touch.pageY :
        (event && typeof event.pageY === 'number' ? event.pageY : 0),
      screenX: touch && typeof touch.screenX === 'number' ? touch.screenX :
        (event && typeof event.screenX === 'number' ? event.screenX : 0),
      screenY: touch && typeof touch.screenY === 'number' ? touch.screenY :
        (event && typeof event.screenY === 'number' ? event.screenY : 0),
      button: 0,
      ctrlKey: Boolean(event && event.ctrlKey),
      shiftKey: Boolean(event && event.shiftKey),
      altKey: Boolean(event && event.altKey),
      metaKey: Boolean(event && event.metaKey),
      layerX: 0,
      layerY: 0,
      changedTouches: event && event.changedTouches || [],
      touches: event && event.touches || [],
      cancelable: event ? event.cancelable : false,
      preventDefault: function () {
        if (event && event.cancelable !== false && typeof event.preventDefault === 'function') {
          event.preventDefault();
        }
      },
      stopPropagation: function () {
        if (event && typeof event.stopPropagation === 'function') {
          event.stopPropagation();
        }
      }
    };
  }

  function patchFlyoutMove(Blockly) {
    if (!Blockly || !Blockly.Flyout || !Blockly.Flyout.prototype || Blockly.Flyout.prototype.avrPatched_) {
      return;
    }
    var originalMove = Blockly.Flyout.prototype.onMouseMove_;
    Blockly.Flyout.prototype.onMouseMove_ = function (event) {
      if (!this.getMetrics_()) {
        if (typeof Blockly.Flyout.terminateDrag_ === 'function') {
          Blockly.Flyout.terminateDrag_();
        }
        return;
      }
      return originalMove.call(this, event);
    };
    Blockly.Flyout.prototype.avrPatched_ = true;
  }

  function patchBlockSvgSelect(Blockly) {
    if (!Blockly || !Blockly.BlockSvg || !Blockly.BlockSvg.prototype || Blockly.BlockSvg.prototype.avrSelectPatched_) {
      return;
    }
    Blockly.BlockSvg.prototype.addSelect = function () {
      if (typeof Blockly.addClass_ === 'function') {
        Blockly.addClass_(this.svgGroup_, 'blocklySelected');
      }
      var inFlyout = Boolean(this.block_ && this.block_.isInFlyout);
      if (!inFlyout && this.svgGroup_ && this.svgGroup_.parentNode &&
          this.svgGroup_.parentNode.lastChild !== this.svgGroup_) {
        this.svgGroup_.parentNode.appendChild(this.svgGroup_);
      }
    };
    Blockly.BlockSvg.prototype.avrSelectPatched_ = true;
  }

  function patchBlockly(Blockly, win) {
    if (!Blockly) return false;
    patchFlyoutMove(Blockly);
    patchBlockSvgSelect(Blockly);
    if (typeof Blockly.bindEvent_ !== 'function') return false;
    if (Blockly.avrTouchPatched_) return true;
    Blockly.avrTouchPatched_ = true;

    var passiveSupported = supportsPassiveEvents(win || (typeof window !== 'undefined' ? window : null));

    Blockly.bindEvent_ = function (node, name, thisObject, func) {
      var wrapFunc = function () {
        return func.apply(thisObject, arguments);
      };
      node.addEventListener(name, wrapFunc, false);
      var bindData = [[node, name, wrapFunc]];
      if (Object.prototype.hasOwnProperty.call(TOUCH_MAP, name)) {
        var touchWrapFunc = function (e) {
          if (!e || (e.touches && e.touches.length > 1)) return;
          var normalized = normalizeTouchEvent(e);
          func.call(thisObject, normalized);
          if (!isHtmlUiTarget(e.target) && e.cancelable !== false && typeof e.preventDefault === 'function') {
            e.preventDefault();
          }
        };
        var mapped = TOUCH_MAP[name];
        for (var i = 0; i < mapped.length; i++) {
          var touchName = mapped[i];
          var options = passiveSupported && (touchName === 'touchstart' || touchName === 'touchmove') ?
            {passive: false} : false;
          node.addEventListener(touchName, touchWrapFunc, options);
          bindData.push([node, touchName, touchWrapFunc]);
        }
      }
      return bindData;
    };
    Blockly.bindEvent_.TOUCH_MAP = TOUCH_MAP;
    return true;
  }

  return {
    TOUCH_MAP: TOUCH_MAP,
    supportsPassiveEvents: supportsPassiveEvents,
    isHtmlUiTarget: isHtmlUiTarget,
    normalizeTouchEvent: normalizeTouchEvent,
    patchFlyoutMove: patchFlyoutMove,
    patchBlockSvgSelect: patchBlockSvgSelect,
    patchBlockly: patchBlockly
  };
}));
