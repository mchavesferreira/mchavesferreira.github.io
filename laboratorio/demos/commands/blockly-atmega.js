(function (host) {
  'use strict';

  var doc = host.document;
  var versionAttribute = 'avr-project-version';
  var activeFrame = null;
  var mobileController = null;

  function byId(id) {
    return doc.getElementById(id);
  }

  function setupToolbarMenu() {
    var toggle = byId('toggle-actions');
    var actions = byId('toolbar-actions');
    if (!toggle || !actions || toggle.avrMenuBound) return;
    toggle.avrMenuBound = true;
    var isOpen = false;
    function setOpen(open) {
      isOpen = Boolean(open);
      if (actions.classList && typeof actions.classList.toggle === 'function') {
        actions.classList.toggle('is-open', isOpen);
      }
      if (typeof toggle.setAttribute === 'function') {
        toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        toggle.setAttribute('aria-label', isOpen ? 'Fechar menu de ações' : 'Abrir menu de ações');
      }
    }
    setOpen(false);
    if (typeof toggle.addEventListener === 'function') {
      toggle.addEventListener('click', function () {
        setOpen(!isOpen);
      });
    }
    if (typeof actions.addEventListener === 'function') {
      actions.addEventListener('click', function (event) {
        var target = event && event.target;
        var nodeName = target && String(target.nodeName || '').toLowerCase();
        if (target && target !== actions && (nodeName === 'button' || nodeName === 'a')) {
          setOpen(false);
        }
      });
    }
    ['open-guide', 'load-design', 'save-design', 'save-lib', 'save-asm'].forEach(function (id) {
      var button = byId(id);
      if (button && typeof button.addEventListener === 'function') {
        button.addEventListener('click', function () {
          if (isOpen) setOpen(false);
        });
      }
    });
    if (typeof doc.addEventListener === 'function') {
      doc.addEventListener('keydown', function (event) {
        if (isOpen && event && (event.key === 'Escape' || event.keyCode === 27)) {
          setOpen(false);
          if (typeof toggle.focus === 'function') toggle.focus();
        }
      });
    }
    if (typeof host.addEventListener === 'function') {
      host.addEventListener('resize', function () {
        if (isOpen && host.innerWidth > 760) setOpen(false);
      });
    }
  }

  function triggerFrameResize(targetFrame) {
    if (!targetFrame) return false;
    var resized = false;
    try {
      if (targetFrame.Blockly && targetFrame.Blockly.Toolbox &&
          typeof targetFrame.Blockly.Toolbox.position_ === 'function' &&
          targetFrame.Blockly.Toolbox.HtmlDiv) {
        targetFrame.Blockly.Toolbox.position_();
      }
      if (targetFrame.Blockly && typeof targetFrame.Blockly.svgResize === 'function') {
        targetFrame.Blockly.svgResize();
        resized = true;
      }
      if (typeof targetFrame.dispatchEvent === 'function' && typeof targetFrame.Event === 'function') {
        targetFrame.dispatchEvent(new targetFrame.Event('resize'));
        resized = true;
      } else if (targetFrame.Blockly && typeof targetFrame.Blockly.fireUiEvent === 'function') {
        targetFrame.Blockly.fireUiEvent(targetFrame, 'resize');
        resized = true;
      }
    } catch (e) {
      resized = false;
    }
    return resized;
  }

  function notifyEditorResize() {
    if (activeFrame) {
      triggerFrameResize(activeFrame);
      if (typeof host.setTimeout === 'function') {
        host.setTimeout(function () { triggerFrameResize(activeFrame); }, 0);
      }
      return;
    }
    var iframe = byId('blockly-editor');
    var target = iframe && iframe.contentWindow;
    if (!target) return;
    if (!triggerFrameResize(target) && typeof target.postMessage === 'function') {
      try {
        target.postMessage({type: 'avr-bridge-resize'}, '*');
      } catch (e) {}
    }
    if (typeof host.setTimeout === 'function') {
      host.setTimeout(function () {
        if (!triggerFrameResize(target) && typeof target.postMessage === 'function') {
          try {
            target.postMessage({type: 'avr-bridge-resize'}, '*');
          } catch (e2) {}
        }
      }, 0);
    }
  }

  function notifyRevealSelected() {
    if (activeFrame && activeFrame.Blockly && activeFrame.Blockly.mainWorkspace) {
      var ws = activeFrame.Blockly.mainWorkspace;
      var sel = activeFrame.Blockly.selected;
      if (sel && sel.workspace === ws) {
        revealInWorkspace(ws, sel, false);
        if (typeof host.setTimeout === 'function') {
          host.setTimeout(function () {
            if (activeFrame && activeFrame.Blockly && activeFrame.Blockly.selected === sel) {
              revealInWorkspace(ws, sel, false);
            }
          }, 0);
        }
      }
      return;
    }
    var iframe = byId('blockly-editor');
    var target = iframe && iframe.contentWindow;
    if (!target || typeof target.postMessage !== 'function') return;
    try {
      target.postMessage({type: 'avr-bridge-reveal-selected'}, '*');
    } catch (e) {}
    if (typeof host.setTimeout === 'function') {
      host.setTimeout(function () {
        try {
          target.postMessage({type: 'avr-bridge-reveal-selected'}, '*');
        } catch (e2) {}
      }, 0);
    }
  }

  function setupMobileLayout() {
    var main = byId('studio-main');
    var viewBar = byId('mobile-view-bar');
    if (!main || !viewBar) return null;
    if (main.avrMobileLayoutBound) return mobileController;
    main.avrMobileLayoutBound = true;

    var viewButtons = [
      {id: 'view-split', view: 'split'},
      {id: 'view-blocks', view: 'blocks'},
      {id: 'view-assembly', view: 'assembly'},
      {id: 'view-details', view: 'details'}
    ];
    var tabButtons = [
      {id: 'tab-assembly', tab: 'assembly'},
      {id: 'tab-details', tab: 'details'}
    ];
    var currentView = 'split';
    var currentTab = 'assembly';

    function setInspectorTab(tab) {
      currentTab = tab === 'details' ? 'details' : 'assembly';
      if (typeof main.setAttribute === 'function') {
        main.setAttribute('data-inspector-tab', currentTab);
      }
      for (var i = 0; i < tabButtons.length; i++) {
        var item = tabButtons[i];
        var button = byId(item.id);
        var active = item.tab === currentTab;
        if (!button) continue;
        if (button.classList && typeof button.classList.toggle === 'function') {
          button.classList.toggle('is-active', active);
        }
        if (typeof button.setAttribute === 'function') {
          button.setAttribute('aria-selected', active ? 'true' : 'false');
        }
      }
    }

    function setMobileView(view, shouldResize) {
      if (view !== 'split' && view !== 'blocks' && view !== 'assembly' && view !== 'details') {
        view = 'split';
      }
      currentView = view;
      if (typeof main.setAttribute === 'function') {
        main.setAttribute('data-mobile-view', currentView);
      }
      for (var i = 0; i < viewButtons.length; i++) {
        var item = viewButtons[i];
        var button = byId(item.id);
        var active = item.view === currentView;
        if (!button) continue;
        if (button.classList && typeof button.classList.toggle === 'function') {
          button.classList.toggle('is-active', active);
        }
        if (typeof button.setAttribute === 'function') {
          button.setAttribute('aria-pressed', active ? 'true' : 'false');
        }
      }
      if (currentView === 'assembly' || currentView === 'details') {
        setInspectorTab(currentView);
      }
      if (shouldResize && (currentView === 'split' || currentView === 'blocks')) {
        notifyEditorResize();
        notifyRevealSelected();
      }
    }

    function onLineSelected() {
      if (currentView === 'split') {
        setInspectorTab('details');
      } else if (currentView === 'assembly') {
        setMobileView('details', false);
      }
    }

    function setDiagnosticsState(count) {
      var errorCount = Number(count) || 0;
      var hasError = errorCount > 0;
      var badgeIds = ['view-assembly-badge', 'tab-assembly-badge', 'assembly-error-badge'];
      var i;
      for (i = 0; i < badgeIds.length; i++) {
        var badge = byId(badgeIds[i]);
        if (!badge) continue;
        badge.hidden = !hasError;
        badge.textContent = hasError ? String(errorCount) : '';
      }
      var targetIds = ['view-assembly', 'tab-assembly', 'panel-assembly'];
      for (i = 0; i < targetIds.length; i++) {
        var target = byId(targetIds[i]);
        if (target && target.classList && typeof target.classList.toggle === 'function') {
          target.classList.toggle('has-error', hasError);
        }
      }
      if (hasError) {
        setInspectorTab('assembly');
        if (currentView === 'details') {
          setMobileView('assembly', false);
        }
      }
    }

    setInspectorTab(currentTab);
    setMobileView(currentView, false);

    for (var i = 0; i < viewButtons.length; i++) {
      (function (entry) {
        var button = byId(entry.id);
        if (button && typeof button.addEventListener === 'function') {
          button.addEventListener('click', function () {
            setMobileView(entry.view, true);
          });
        }
      }(viewButtons[i]));
    }
    for (var j = 0; j < tabButtons.length; j++) {
      (function (entry) {
        var button = byId(entry.id);
        if (button && typeof button.addEventListener === 'function') {
          button.addEventListener('click', function () {
            setInspectorTab(entry.tab);
          });
        }
      }(tabButtons[j]));
    }

    mobileController = {
      getView: function () { return currentView; },
      getInspectorTab: function () { return currentTab; },
      setView: setMobileView,
      setInspectorTab: setInspectorTab,
      onLineSelected: onLineSelected,
      setDiagnosticsState: setDiagnosticsState
    };
    return mobileController;
  }

  // The vendored workspace also signals pointer drags and unchanged imports.
  // Compare the plain model trees without serializing their nesting on the JS stack.
  function sameModel(previous, current) {
    var pending = [{before: previous, after: current}];
    while (pending.length) {
      var pair = pending.pop();
      var before = pair.before;
      var after = pair.after;
      if (before === after) continue;
      if (!before || !after || typeof before !== 'object' || typeof after !== 'object' ||
          Array.isArray(before) !== Array.isArray(after)) return false;
      var keys = Object.keys(before);
      if (keys.length !== Object.keys(after).length) return false;
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (!Object.prototype.hasOwnProperty.call(after, key)) return false;
        pending.push({before: before[key], after: after[key]});
      }
    }
    return true;
  }

  function blockTitle(block) {
    // Blockly.Block.toString(64) recursively reads every descendant before truncating.
    var pending = [{inputs: block.inputList, index: 0}];
    var title = '';
    while (pending.length && title.length <= 64) {
      var frame = pending[pending.length - 1];
      if (frame.index === frame.inputs.length) {
        pending.pop();
        continue;
      }
      var input = frame.inputs[frame.index++];
      for (var i = 0; i < input.fieldRow.length; i++) {
        var text = input.fieldRow[i].getText().trim();
        if (text) title += (title ? ' ' : '') + text;
      }
      if (input.connection) {
        var child = input.connection.targetBlock();
        if (child) pending.push({inputs: child.inputList, index: 0});
        else title += (title ? ' ' : '') + '?';
      }
    }
    return title.length > 64 ? title.slice(0, 61) + '...' : title || '???';
  }

  function download(text, name, type) {
    var url = host.URL.createObjectURL(new host.Blob([text], {type: type}));
    var link = doc.createElement('a');
    link.href = url;
    link.download = name;
    doc.body.appendChild(link);
    link.click();
    doc.body.removeChild(link);
    host.setTimeout(function () { host.URL.revokeObjectURL(url); }, 1000);
  }

  function readProject(Blockly, xml) {
    var dom = Blockly.Xml.textToDom(xml);
    if (dom.getAttribute(versionAttribute) !== '1') {
      throw new Error('Selecione um projeto XML do Laboratório AVR, versão 1.');
    }
    var ids = Object.create(null);
    var nodes = dom.getElementsByTagName('*');
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].nodeName.toLowerCase() !== 'block') continue;
      if (nodes[i].getAttribute('disabled') === 'true') {
        throw new Error('O projeto contém um bloco desativado. Ative-o antes de importar o XML.');
      }
      var type = nodes[i].getAttribute('type');
      var id = nodes[i].getAttribute('id');
      if (!/^avr_/.test(type) || !Object.prototype.hasOwnProperty.call(Blockly.Blocks, type)) {
        throw new Error('O projeto contém um tipo de bloco desconhecido.');
      }
      // Blockly increments a numeric counter when it allocates a new block.
      if (!id || ids[id] || (/^\d+$/.test(id) && Number(id) >= 9007199254740991)) {
        throw new Error('O projeto contém um identificador de bloco inválido ou repetido.');
      }
      ids[id] = true;
    }
    return dom;
  }

  function restoreWorkspace(Blockly, workspace, dom) {
    workspace.clear();
    Blockly.Xml.domToWorkspace(workspace, dom);
    // This version of Blockly allocates new IDs on import. Match by connection so
    // labels generated from block IDs and variable mutation XML survive a round trip.
    var actual = workspace.getTopBlocks(false);
    var pending = [];
    var index = 0;
    for (var root = dom.firstElementChild; root; root = root.nextElementSibling) {
      if (root.localName === 'block') pending.push({node: root, block: actual[index++]});
    }
    var counter = Blockly.getUidCounter();
    while (pending.length) {
      var entry = pending.pop();
      var node = entry.node;
      var block = entry.block;
      block.id = node.getAttribute('id');
      if (/^\d+$/.test(block.id)) counter = Math.max(counter, Number(block.id));
      for (var input = node.firstElementChild; input; input = input.nextElementSibling) {
        var child = input.firstElementChild;
        if (!child || child.localName !== 'block') continue;
        var target = input.localName === 'next' ? block.getNextBlock() :
          block.getInputTargetBlock(input.getAttribute('name'));
        pending.push({node: child, block: target});
      }
    }
    Blockly.setUidCounter(counter);
  }

  function attach(frame) {
    if (doc.readyState === 'loading') {
      doc.addEventListener('DOMContentLoaded', function ready() {
        doc.removeEventListener('DOMContentLoaded', ready);
        attach(frame);
      });
      return;
    }
    var Blockly = frame.Blockly;
    activeFrame = frame;
    patchLegacyBlockly(Blockly, frame);
    var workspace = Blockly.mainWorkspace;
    var lines = byId('asm-lines');
    var details = byId('explanations');
    var diagnostics = byId('diagnostics');
    var saveAsm = byId('save-asm');
    var saveLib = byId('save-lib');
    setupToolbarMenu();
    setupMobileLayout();
    var fileInput = byId('design-file-input');
    var fileMessage = byId('file-message');
    var previousModel;
    var result = null;
    var selectedId = null;
    var selectedLine = null;
    var clickedWorkspace = false;
    var fileRequest = 0;

    function element(parent, tag, text, className) {
      var node = doc.createElement(tag);
      node.textContent = text;
      if (className) node.className = className;
      parent.appendChild(node);
      return node;
    }

    function showSelection(scroll) {
      details.textContent = '';
      if (!result) return;
      var range = result.lineMap[selectedId];
      for (var i = 0; i < lines.children.length; i++) {
        var owned = selectedId !== null && result.lineBlockIds[i] === selectedId;
        var current = i + 1 === selectedLine;
        lines.children[i].classList.toggle('is-selected', owned || current);
        lines.children[i].classList.toggle('is-current', current);
      }
      var first = selectedLine || (range && range.start);
      if (scroll && first) lines.children[first - 1].scrollIntoView({block: 'nearest'});

      var block = selectedId !== null && workspace.getBlockById(selectedId);
      var instructions = result.explanations.filter(function (item) {
        return block ? item.blockId === selectedId : item.line === selectedLine;
      });
      if (block) element(details, 'h3', blockTitle(block));
      if (!instructions.length) {
        var prompt = selectedLine ? 'Esta linha faz parte da estrutura do arquivo Assembly.' :
          'Selecione um bloco ou uma linha do Assembly para ver as instruções.';
        element(details, 'p', prompt);
      }
      instructions.forEach(function (item) {
        var card = element(details, 'article', '', 'instruction');
        if (item.line === selectedLine) card.className += ' is-current';
        element(card, 'small', 'Linha ' + item.line);
        element(card, 'code', [item.mnemonic, item.operands.join(', ')].join(' ').trim());
        element(card, 'p', item.summary);
        element(card, 'p', item.effects, 'effects');
      });
      var catalog = getDatasheetCatalog(frame);
      var diagrams = getDatasheetDiagrams(frame);
      var topic = resolveHardwareTopic(catalog, extractBlockInfo(block), instructions, selectedLine);
      renderHardwareCard(details, topic, catalog, diagrams);
    }

    function render(generated) {
      result = generated.diagnostics.length ? null : generated;
      lines.textContent = '';
      lines.hidden = !result;
      saveAsm.disabled = !result;
      if (saveLib) saveLib.disabled = !(result && result.usesLibrary);
      diagnostics.textContent = '';
      diagnostics.hidden = !!result;
      selectedLine = null;
      selectedId = result && Blockly.selected ? Blockly.selected.id : null;
      if (result) {
        var sourceLines = result.source.slice(0, -1).split('\n');
        sourceLines.forEach(function (text, index) {
          var row = element(lines, 'button', text, 'asm-line');
          row.type = 'button';
          row.dataset.line = index + 1;
        });
      } else {
        element(diagnostics, 'h3', 'Revise os blocos');
        generated.diagnostics.forEach(function (error) {
          element(diagnostics, 'p', error.message);
        });
      }
      showSelection(false);
      if (mobileController) {
        mobileController.setDiagnosticsState(generated.diagnostics ? generated.diagnostics.length : 0);
      }
    }

    function regenerate() {
      try {
        var model = frame.AvrWorkspaceModel.fromWorkspace(workspace);
        if (sameModel(previousModel, model)) return;
        render(model.program ? frame.AvrAsmGenerator.generate(model.program) : model);
        previousModel = model;
      } catch (error) {
        previousModel = undefined;
        render({diagnostics: [{message: 'Não foi possível gerar o Assembly a partir dos blocos.' +
          (error && error.message ? ' ' + error.message : '')}]});
        if (Blockly.selected && Blockly.selected.workspace === workspace) Blockly.selected.unselect();
      }
    }

    function blockSelection() {
      var block = Blockly.selected;
      var id = block && block.workspace === workspace ? block.id : null;
      // Blockly dispatches select/unselect asynchronously, including after a line click.
      if (id === selectedId && !clickedWorkspace) return;
      clickedWorkspace = false;
      selectedId = id;
      selectedLine = null;
      showSelection(true);
    }

    function revealBlock(block) {
      var collapsed = [];
      for (var parent = block.getSurroundParent(); parent; parent = parent.getSurroundParent()) {
        if (parent.isCollapsed()) collapsed.push(parent);
      }
      // Reveal the outer inputs first so Blockly can lay out each nested block.
      while (collapsed.length) collapsed.pop().setCollapsed(false);
      block.select();
      if (!workspace.scrollbar) return;
      var metrics = workspace.getMetrics();
      var position = block.getRelativeToSurfaceXY();
      var x = position.x;
      var y = position.y;
      if (x < metrics.viewLeft || y < metrics.viewTop || x > metrics.viewLeft + metrics.viewWidth - 40 ||
          y > metrics.viewTop + metrics.viewHeight - 40) {
        workspace.scrollbar.set(x - metrics.contentLeft - 24, y - metrics.contentTop - 24);
      }
    }

    lines.addEventListener('click', function (event) {
      var line = Number(event.target.dataset.line);
      if (!result || !line) return;
      selectedLine = line;
      selectedId = result.lineBlockIds[line - 1];
      var block = selectedId !== null && workspace.getBlockById(selectedId);
      if (block) revealBlock(block);
      else if (Blockly.selected) Blockly.selected.unselect();
      showSelection(false);
      if (mobileController) mobileController.onLineSelected();
    });

    saveAsm.addEventListener('click', function () {
      regenerate();
      if (result) download(result.source, 'programa.asm', 'text/plain;charset=utf-8');
    });
    if (saveLib) {
      saveLib.addEventListener('click', function () {
        regenerate();
        if (result && result.usesLibrary && result.librarySource) {
          download(result.librarySource, result.libraryFileName || 'lib328Pv03.inc', 'text/plain;charset=utf-8');
        }
      });
    }
    byId('save-design').addEventListener('click', function () {
      var dom = Blockly.Xml.workspaceToDom(workspace);
      dom.setAttribute(versionAttribute, '1');
      download(Blockly.Xml.domToText(dom), 'projeto-avr.xml', 'application/xml;charset=utf-8');
    });
    byId('load-design').addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', function () {
      var file = fileInput.files[0];
      if (!file) return;
      var request = ++fileRequest;
      var reader = new host.FileReader();
      fileInput.value = '';
      fileMessage.hidden = true;

      function showFileError(message) {
        if (request !== fileRequest) return;
        fileMessage.textContent = 'Não foi possível abrir o projeto. ' + message;
        fileMessage.hidden = false;
      }

      reader.onload = function () {
        if (request !== fileRequest) return;
        try {
          var dom = readProject(Blockly, reader.result);
          var previous = Blockly.Xml.workspaceToDom(workspace);
          try {
            restoreWorkspace(Blockly, workspace, dom);
          } catch (error) {
            restoreWorkspace(Blockly, workspace, previous);
            throw error;
          }
          previousModel = undefined;
          regenerate();
        } catch (error) {
          showFileError(error && error.message || 'Confira o conteúdo do arquivo XML.');
        }
      };
      reader.onerror = reader.onabort = function () {
        showFileError('Confira se o arquivo XML pode ser lido.');
      };
      reader.readAsText(file);
    });

    if (!workspace.getTopBlocks(false).length) {
      var start = Blockly.Block.obtain(workspace, 'avr_start');
      start.initSvg();
      start.render();
      start.moveBy(36, 44);
    }
    var canvas = workspace.getCanvas();
    canvas.addEventListener('mousedown', function () { clickedWorkspace = true; }, true);
    canvas.addEventListener('touchstart', function () { clickedWorkspace = true; }, true);
    canvas.addEventListener('blocklyWorkspaceChange', regenerate);
    canvas.addEventListener('blocklySelectChange', blockSelection);
    byId('save-design').disabled = false;
    byId('load-design').disabled = false;
    var centerStart = byId('center-start');
    if (centerStart) {
      centerStart.disabled = false;
      centerStart.addEventListener('click', function () {
        focusBlockInWorkspace(Blockly, workspace);
      });
    }
    regenerate();
  }

  function patchLegacyBlockly(Blockly, targetFrame) {
    if (!Blockly) return;
    var touchHelper = (targetFrame && targetFrame.AvrMobileTouch) || host.AvrMobileTouch;
    if (touchHelper && typeof touchHelper.patchBlockly === 'function') {
      touchHelper.patchBlockly(Blockly, targetFrame || host);
    }
    if (!Blockly.Flyout || !Blockly.Flyout.prototype || Blockly.Flyout.prototype.avrPatched_) {
      return;
    }
    var originalMove = Blockly.Flyout.prototype.onMouseMove_;
    Blockly.Flyout.prototype.onMouseMove_ = function (event) {
      if (!this.getMetrics_()) {
        Blockly.Flyout.terminateDrag_();
        return;
      }
      return originalMove.call(this, event);
    };
    Blockly.Flyout.prototype.avrPatched_ = true;
  }

  function ensureStartBlock(Blockly, workspace) {
    if (!workspace.getTopBlocks(false).length) {
      var start = Blockly.Block.obtain(workspace, 'avr_start');
      start.initSvg();
      start.render();
      start.moveBy(36, 44);
    }
  }

  function revealInWorkspace(workspace, block, shouldSelect) {
    if (!workspace || !block) return;
    var collapsed = [];
    if (typeof block.getSurroundParent === 'function') {
      for (var parent = block.getSurroundParent(); parent; parent = parent.getSurroundParent()) {
        if (typeof parent.isCollapsed === 'function' && parent.isCollapsed()) collapsed.push(parent);
      }
    }
    while (collapsed.length) collapsed.pop().setCollapsed(false);
    if (shouldSelect !== false && typeof block.select === 'function') {
      block.select();
    }
    if (!workspace.scrollbar || typeof workspace.scrollbar.set !== 'function' ||
        typeof workspace.getMetrics !== 'function' || typeof block.getRelativeToSurfaceXY !== 'function') {
      return;
    }
    var metrics = workspace.getMetrics();
    var position = block.getRelativeToSurfaceXY();
    if (!metrics || !position) return;
    var x = position.x;
    var y = position.y;
    if (x < metrics.viewLeft || y < metrics.viewTop || x > metrics.viewLeft + metrics.viewWidth - 40 ||
        y > metrics.viewTop + metrics.viewHeight - 40) {
      workspace.scrollbar.set(x - metrics.contentLeft - 24, y - metrics.contentTop - 24);
    }
  }

  function focusBlockInWorkspace(Blockly, workspace) {
    if (!Blockly || !workspace) return false;
    var target = Blockly.selected && Blockly.selected.workspace === workspace ? Blockly.selected : null;
    if (!target && typeof workspace.getTopBlocks === 'function') {
      var tops = workspace.getTopBlocks(false);
      for (var i = 0; i < tops.length; i++) {
        if (tops[i] && tops[i].type === 'avr_start') {
          target = tops[i];
          break;
        }
      }
      if (!target && tops.length) target = tops[0];
    }
    if (!target) {
      if (workspace.scrollbar && typeof workspace.scrollbar.set === 'function') {
        workspace.scrollbar.set(0, 0);
      }
      return false;
    }
    var collapsed = [];
    if (typeof target.getSurroundParent === 'function') {
      for (var parent = target.getSurroundParent(); parent; parent = parent.getSurroundParent()) {
        if (typeof parent.isCollapsed === 'function' && parent.isCollapsed()) collapsed.push(parent);
      }
    }
    while (collapsed.length) collapsed.pop().setCollapsed(false);
    if (typeof target.select === 'function') target.select();
    if (workspace.scrollbar && typeof workspace.scrollbar.set === 'function' &&
        typeof workspace.getMetrics === 'function' && typeof target.getRelativeToSurfaceXY === 'function') {
      var metrics = workspace.getMetrics();
      var position = target.getRelativeToSurfaceXY();
      if (metrics && position) {
        var targetX = Math.max(0, position.x - (metrics.contentLeft || 0) - 24);
        var targetY = Math.max(0, position.y - (metrics.contentTop || 0) - 24);
        workspace.scrollbar.set(targetX, targetY);
      }
    }
    return true;
  }

  function getDatasheetCatalog(targetFrame) {
    return host.AvrDatasheetCatalog || (targetFrame && targetFrame.AvrDatasheetCatalog) || null;
  }

  function getDatasheetDiagrams(targetFrame) {
    return host.AvrDatasheetDiagrams || (targetFrame && targetFrame.AvrDatasheetDiagrams) || null;
  }

  function extractBlockInfo(block) {
    if (!block) return null;
    var pinId = '';
    if (typeof block.getFieldValue === 'function') {
      try {
        pinId = block.getFieldValue('PIN') || '';
      } catch (e) {
        pinId = '';
      }
    }
    return {
      type: block.type || '',
      pinId: String(pinId)
    };
  }

  function resolveHardwareTopic(catalog, blockInfo, instructions, selectedLine) {
    if (!catalog) return null;
    var list = instructions || [];
    var currentItem = null;
    var opTokens = [];
    var i;
    for (i = 0; i < list.length; i++) {
      var item = list[i];
      if (!item) continue;
      if (selectedLine && item.line === selectedLine) {
        currentItem = item;
      }
      if (item.operands && item.operands.length) {
        opTokens.push(item.operands.join(' '));
      }
    }
    if (blockInfo && blockInfo.type && typeof catalog.getTopicForBlockType === 'function') {
      var byBlock = catalog.getTopicForBlockType(blockInfo.type, {
        pinId: blockInfo.pinId || '',
        operands: opTokens.join(' ')
      });
      if (byBlock) return byBlock;
    }
    if (typeof catalog.getTopicForInstruction === 'function') {
      if (currentItem) {
        return catalog.getTopicForInstruction(currentItem.mnemonic, currentItem.operands);
      }
      if (list.length && list[0]) {
        return catalog.getTopicForInstruction(list[0].mnemonic, list[0].operands);
      }
    }
    return null;
  }

  function renderHardwareCard(container, topic, catalog, diagrams) {
    if (!container || !topic || !doc) return;

    function createChild(parent, tag, text, className) {
      var node = doc.createElement(tag);
      if (text !== null && text !== undefined) {
        node.textContent = text;
      }
      if (className) node.className = className;
      parent.appendChild(node);
      return node;
    }

    var card = doc.createElement('details');
    card.className = 'hardware-card';
    if (typeof card.setAttribute === 'function') {
      card.setAttribute('data-topic-id', topic.id);
    }
    var isDesktop = !host.innerWidth || host.innerWidth > 760;
    card.open = isDesktop;
    if (isDesktop && typeof card.setAttribute === 'function') {
      card.setAttribute('open', '');
    }

    createChild(card, 'summary', 'Hardware no ATmega328P · ' + (topic.shortTitle || topic.title) + ' (circuito e datasheet)');

    var body = createChild(card, 'div', null, 'hardware-card-body');
    if (topic.summary) {
      createChild(body, 'p', topic.summary, 'hardware-summary');
    }
    if (topic.externalNote) {
      createChild(body, 'p', topic.externalNote, 'hardware-external-note');
    }

    if (topic.registers && topic.registers.length) {
      var regList = createChild(body, 'ul', null, 'hardware-registers');
      for (var i = 0; i < topic.registers.length; i++) {
        var reg = topic.registers[i];
        var item = createChild(regList, 'li', null);
        var addr = reg.ioAddress && reg.ioAddress !== '—'
          ? 'I/O ' + reg.ioAddress + ' / SRAM ' + reg.sramAddress
          : 'SRAM ' + reg.sramAddress;
        createChild(item, 'code', reg.name + ' (' + addr + ')');
        createChild(item, 'span', ' — ' + reg.description);
      }
    }

    var diagramBox = null;
    if (diagrams && topic.diagramId &&
        typeof diagrams.hasDiagram === 'function' && diagrams.hasDiagram(topic.diagramId) &&
        typeof diagrams.renderSvg === 'function') {
      diagramBox = createChild(body, 'div', null, 'hardware-diagram');
      diagramBox.innerHTML = diagrams.renderSvg(topic.diagramId);
      if (typeof diagrams.getCaption === 'function') {
        var caption = diagrams.getCaption(topic.diagramId);
        if (caption) {
          createChild(body, 'p', caption, 'hardware-caption');
        }
      }
    }

    var refText = '';
    if (catalog && typeof catalog.formatReference === 'function') {
      refText = catalog.formatReference(topic);
    } else if (topic.datasheetDoc) {
      refText = 'Referência: Microchip ' + topic.datasheetDoc + ' · ' + topic.datasheetSection + ' · ' + topic.datasheetPage;
    }
    if (refText) {
      createChild(body, 'p', refText, 'hardware-reference');
    }

    var actions = createChild(body, 'div', null, 'hardware-actions');
    if (diagramBox) {
      var zoomBtn = createChild(actions, 'button', 'Ampliar diagrama', 'hardware-zoom-toggle');
      zoomBtn.type = 'button';
      if (typeof zoomBtn.setAttribute === 'function') {
        zoomBtn.setAttribute('aria-pressed', 'false');
      }
      var expanded = false;
      if (typeof zoomBtn.addEventListener === 'function') {
        zoomBtn.addEventListener('click', function () {
          expanded = !expanded;
          if (diagramBox.classList && typeof diagramBox.classList.toggle === 'function') {
            diagramBox.classList.toggle('is-expanded', expanded);
          }
          zoomBtn.textContent = expanded ? 'Reduzir diagrama' : 'Ampliar diagrama';
          if (typeof zoomBtn.setAttribute === 'function') {
            zoomBtn.setAttribute('aria-pressed', expanded ? 'true' : 'false');
          }
        });
      }
    }

    var guideHref = 'guia-didatico.html#' + topic.id;
    var guideLink = createChild(actions, 'a', 'Abrir capítulo no Livro Didático', 'hardware-guide-link');
    guideLink.href = guideHref;
    guideLink.target = '_blank';
    guideLink.rel = 'noopener';
    if (typeof guideLink.setAttribute === 'function') {
      guideLink.setAttribute('href', guideHref);
      guideLink.setAttribute('target', '_blank');
      guideLink.setAttribute('rel', 'noopener');
    }

    container.appendChild(card);
  }

  // Fallback bridge for file:// protocol where direct cross-frame access is blocked by browser SOP.
  function attachFrameBridge(frame) {
    var Blockly = frame.Blockly;
    patchLegacyBlockly(Blockly, frame);
    var workspace = Blockly.mainWorkspace;
    ensureStartBlock(Blockly, workspace);
    if (!frame.parent || frame.parent === frame || typeof frame.parent.postMessage !== 'function') {
      return;
    }
    var previousModel;
    var clickedWorkspace = false;

    function collectWorkspaceBlocks() {
      var queue = workspace.getAllBlocks().slice();
      var seen = Object.create(null);
      var collected = [];
      while (queue.length) {
        var block = queue.shift();
        if (!block || !block.id || seen[block.id]) continue;
        seen[block.id] = true;
        collected.push(block);
        if (typeof block.getChildren === 'function') {
          var children = block.getChildren();
          for (var i = 0; i < children.length; i++) {
            if (children[i]) queue.push(children[i]);
          }
        }
      }
      return collected;
    }

    function collectTitles() {
      var titles = Object.create(null);
      var all = collectWorkspaceBlocks();
      for (var i = 0; i < all.length; i++) {
        titles[all[i].id] = blockTitle(all[i]);
      }
      return titles;
    }

    function collectBlockMeta() {
      var meta = Object.create(null);
      var all = collectWorkspaceBlocks();
      for (var i = 0; i < all.length; i++) {
        meta[all[i].id] = extractBlockInfo(all[i]);
      }
      return meta;
    }

    function postState(force) {
      try {
        var model = frame.AvrWorkspaceModel.fromWorkspace(workspace);
        var changed = force || !sameModel(previousModel, model);
        if (changed) {
          previousModel = model;
        }
        var generated = model.program ? frame.AvrAsmGenerator.generate(model.program) : model;
        var selected = Blockly.selected && Blockly.selected.workspace === workspace ? Blockly.selected.id : null;
        frame.parent.postMessage({
          type: 'avr-bridge-state',
          generated: generated,
          selectedId: selected,
          clickedWorkspace: clickedWorkspace,
          titles: collectTitles(),
          blockMeta: collectBlockMeta()
        }, '*');
        clickedWorkspace = false;
      } catch (error) {
        previousModel = undefined;
        frame.parent.postMessage({
          type: 'avr-bridge-state',
          generated: {diagnostics: [{message: 'Não foi possível gerar o Assembly a partir dos blocos.' +
            (error && error.message ? ' ' + error.message : '')}]},
          selectedId: null,
          clickedWorkspace: false,
          titles: Object.create(null),
          blockMeta: Object.create(null)
        }, '*');
      }
    }

    var canvas = workspace.getCanvas();
    canvas.addEventListener('mousedown', function () { clickedWorkspace = true; }, true);
    canvas.addEventListener('touchstart', function () { clickedWorkspace = true; }, true);
    canvas.addEventListener('blocklyWorkspaceChange', function () { postState(false); });
    canvas.addEventListener('blocklySelectChange', function () { postState(false); });

    if (typeof frame.addEventListener === 'function') {
      frame.addEventListener('message', function (event) {
        var data = event && event.data;
        if (!data || typeof data !== 'object') return;
        if (data.type === 'avr-bridge-ping') {
          postState(true);
        } else if (data.type === 'avr-bridge-select-block') {
          var block = data.blockId !== null && workspace.getBlockById(data.blockId);
          if (block) revealInWorkspace(workspace, block);
          else if (Blockly.selected) Blockly.selected.unselect();
        } else if (data.type === 'avr-bridge-request-save-design') {
          var dom = Blockly.Xml.workspaceToDom(workspace);
          dom.setAttribute(versionAttribute, '1');
          frame.parent.postMessage({
            type: 'avr-bridge-save-design-data',
            xml: Blockly.Xml.domToText(dom)
          }, '*');
        } else if (data.type === 'avr-bridge-load-design') {
          try {
            var newDom = readProject(Blockly, data.xml);
            var previous = Blockly.Xml.workspaceToDom(workspace);
            try {
              restoreWorkspace(Blockly, workspace, newDom);
            } catch (err) {
              restoreWorkspace(Blockly, workspace, previous);
              throw err;
            }
            previousModel = undefined;
            postState(true);
            frame.parent.postMessage({type: 'avr-bridge-load-result', request: data.request, ok: true}, '*');
          } catch (err) {
            frame.parent.postMessage({
              type: 'avr-bridge-load-result',
              request: data.request,
              ok: false,
              message: err && err.message || 'Confira o conteúdo do arquivo XML.'
            }, '*');
          }
        } else if (data.type === 'avr-bridge-resize') {
          triggerFrameResize(frame);
        } else if (data.type === 'avr-bridge-center-start') {
          focusBlockInWorkspace(Blockly, workspace);
          postState(false);
        } else if (data.type === 'avr-bridge-reveal-selected') {
          if (Blockly.selected && Blockly.selected.workspace === workspace) {
            revealInWorkspace(workspace, Blockly.selected, false);
          }
        }
      });
    }
    postState(true);
  }

  function setupParentBridge() {
    if (!doc || typeof host.addEventListener !== 'function') return;
    var bridgeActive = false;
    var result = null;
    var titles = Object.create(null);
    var blockMeta = Object.create(null);
    var selectedId = null;
    var selectedLine = null;
    var fileRequest = 0;

    function element(parent, tag, text, className) {
      var node = doc.createElement(tag);
      node.textContent = text;
      if (className) node.className = className;
      parent.appendChild(node);
      return node;
    }

    function showBridgeSelection(scroll) {
      var lines = byId('asm-lines');
      var details = byId('explanations');
      if (!lines || !details) return;
      details.textContent = '';
      if (!result) return;
      var range = result.lineMap[selectedId];
      for (var i = 0; i < lines.children.length; i++) {
        var owned = selectedId !== null && result.lineBlockIds[i] === selectedId;
        var current = i + 1 === selectedLine;
        lines.children[i].classList.toggle('is-selected', owned || current);
        lines.children[i].classList.toggle('is-current', current);
      }
      var first = selectedLine || (range && range.start);
      if (scroll && first && lines.children[first - 1]) {
        lines.children[first - 1].scrollIntoView({block: 'nearest'});
      }
      var hasBlock = selectedId !== null && titles[selectedId];
      var instructions = result.explanations.filter(function (item) {
        return hasBlock ? item.blockId === selectedId : item.line === selectedLine;
      });
      if (hasBlock) element(details, 'h3', titles[selectedId]);
      if (!instructions.length) {
        var prompt = selectedLine ? 'Esta linha faz parte da estrutura do arquivo Assembly.' :
          'Selecione um bloco ou uma linha do Assembly para ver as instruções.';
        element(details, 'p', prompt);
      }
      instructions.forEach(function (item) {
        var card = element(details, 'article', '', 'instruction');
        if (item.line === selectedLine) card.className += ' is-current';
        element(card, 'small', 'Linha ' + item.line);
        element(card, 'code', [item.mnemonic, item.operands.join(', ')].join(' ').trim());
        element(card, 'p', item.summary);
        element(card, 'p', item.effects, 'effects');
      });
      var info = selectedId !== null && blockMeta[selectedId] ? blockMeta[selectedId] : null;
      var catalog = getDatasheetCatalog(null);
      var diagrams = getDatasheetDiagrams(null);
      var topic = resolveHardwareTopic(catalog, info, instructions, selectedLine);
      renderHardwareCard(details, topic, catalog, diagrams);
    }

    function bindParentControls() {
      if (bridgeActive) return;
      var lines = byId('asm-lines');
      var saveAsm = byId('save-asm');
      var saveLib = byId('save-lib');
      var saveDesign = byId('save-design');
      var loadDesign = byId('load-design');
      var fileInput = byId('design-file-input');
      var fileMessage = byId('file-message');
      var iframe = byId('blockly-editor');
      if (!lines || !saveAsm || !saveDesign || !loadDesign || !fileInput || !iframe) return;
      bridgeActive = true;
      setupToolbarMenu();
      setupMobileLayout();
      saveDesign.disabled = false;
      loadDesign.disabled = false;
      var centerStart = byId('center-start');
      if (centerStart) {
        centerStart.disabled = false;
        centerStart.addEventListener('click', function () {
          if (iframe.contentWindow) {
            iframe.contentWindow.postMessage({type: 'avr-bridge-center-start'}, '*');
          }
        });
      }

      lines.addEventListener('click', function (event) {
        var line = Number(event.target.dataset.line);
        if (!result || !line) return;
        selectedLine = line;
        selectedId = result.lineBlockIds[line - 1];
        if (iframe.contentWindow) {
          iframe.contentWindow.postMessage({type: 'avr-bridge-select-block', blockId: selectedId}, '*');
        }
        showBridgeSelection(false);
        if (mobileController) mobileController.onLineSelected();
      });
      saveAsm.addEventListener('click', function () {
        if (result) download(result.source, 'programa.asm', 'text/plain;charset=utf-8');
      });
      if (saveLib) {
        saveLib.addEventListener('click', function () {
          if (result && result.usesLibrary && result.librarySource) {
            download(result.librarySource, result.libraryFileName || 'lib328Pv03.inc', 'text/plain;charset=utf-8');
          }
        });
      }
      saveDesign.addEventListener('click', function () {
        if (iframe.contentWindow) {
          iframe.contentWindow.postMessage({type: 'avr-bridge-request-save-design'}, '*');
        }
      });
      loadDesign.addEventListener('click', function () { fileInput.click(); });
      fileInput.addEventListener('change', function () {
        var file = fileInput.files[0];
        if (!file) return;
        var request = ++fileRequest;
        var reader = new host.FileReader();
        fileInput.value = '';
        fileMessage.hidden = true;
        reader.onload = function () {
          if (request !== fileRequest || !iframe.contentWindow) return;
          iframe.contentWindow.postMessage({
            type: 'avr-bridge-load-design',
            xml: reader.result,
            request: request
          }, '*');
        };
        reader.onerror = reader.onabort = function () {
          if (request !== fileRequest) return;
          fileMessage.textContent = 'Não foi possível abrir o projeto. Confira se o arquivo XML pode ser lido.';
          fileMessage.hidden = false;
        };
        reader.readAsText(file);
      });
    }

    host.addEventListener('message', function (event) {
      var data = event && event.data;
      if (!data || typeof data !== 'object') return;
      if (data.type === 'avr-bridge-state') {
        bindParentControls();
        var lines = byId('asm-lines');
        var diagnostics = byId('diagnostics');
        var saveAsm = byId('save-asm');
        var saveLib = byId('save-lib');
        if (!lines || !diagnostics || !saveAsm) return;
        var generated = data.generated;
        titles = data.titles || Object.create(null);
        blockMeta = data.blockMeta || Object.create(null);
        result = generated.diagnostics && generated.diagnostics.length ? null : generated;
        lines.textContent = '';
        lines.hidden = !result;
        saveAsm.disabled = !result;
        if (saveLib) saveLib.disabled = !(result && result.usesLibrary);
        diagnostics.textContent = '';
        diagnostics.hidden = !!result;
        selectedLine = null;
        selectedId = result ? data.selectedId : null;
        if (result) {
          var sourceLines = result.source.slice(0, -1).split('\n');
          sourceLines.forEach(function (text, index) {
            var row = element(lines, 'button', text, 'asm-line');
            row.type = 'button';
            row.dataset.line = index + 1;
          });
        } else {
          element(diagnostics, 'h3', 'Revise os blocos');
          generated.diagnostics.forEach(function (error) {
            element(diagnostics, 'p', error.message);
          });
        }
        showBridgeSelection(Boolean(data.clickedWorkspace));
        if (mobileController) {
          mobileController.setDiagnosticsState(generated.diagnostics ? generated.diagnostics.length : 0);
        }
      } else if (data.type === 'avr-bridge-save-design-data') {
        download(data.xml, 'projeto-avr.xml', 'application/xml;charset=utf-8');
      } else if (data.type === 'avr-bridge-load-result') {
        if (data.request !== fileRequest) return;
        var fileMessage = byId('file-message');
        if (!fileMessage) return;
        if (data.ok) {
          fileMessage.hidden = true;
        } else {
          fileMessage.textContent = 'Não foi possível abrir o projeto. ' + data.message;
          fileMessage.hidden = false;
        }
      }
    });

    function pingFrame() {
      var iframe = byId('blockly-editor');
      if (iframe && iframe.contentWindow && typeof iframe.contentWindow.postMessage === 'function') {
        iframe.contentWindow.postMessage({type: 'avr-bridge-ping'}, '*');
      }
    }
    function initParentUi() {
      setupToolbarMenu();
      setupMobileLayout();
      pingFrame();
    }
    if (doc.readyState === 'loading' && typeof doc.addEventListener === 'function') {
      doc.addEventListener('DOMContentLoaded', initParentUi);
    } else {
      initParentUi();
    }
  }

  setupParentBridge();
  host.AvrEditor = {attach: attach, attachFrameBridge: attachFrameBridge};
}(window));
