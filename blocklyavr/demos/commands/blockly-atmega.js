(function (host) {
  'use strict';

  var doc = host.document;
  var versionAttribute = 'avr-project-version';

  function byId(id) {
    return doc.getElementById(id);
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
    patchLegacyBlockly(Blockly);
    var workspace = Blockly.mainWorkspace;
    var lines = byId('asm-lines');
    var details = byId('explanations');
    var diagnostics = byId('diagnostics');
    var saveAsm = byId('save-asm');
    var saveLib = byId('save-lib');
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
    canvas.addEventListener('blocklyWorkspaceChange', regenerate);
    canvas.addEventListener('blocklySelectChange', blockSelection);
    byId('save-design').disabled = false;
    byId('load-design').disabled = false;
    regenerate();
  }

  function patchLegacyBlockly(Blockly) {
    if (!Blockly || !Blockly.Flyout || !Blockly.Flyout.prototype || Blockly.Flyout.prototype.avrPatched_) {
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

  function revealInWorkspace(workspace, block) {
    var collapsed = [];
    for (var parent = block.getSurroundParent(); parent; parent = parent.getSurroundParent()) {
      if (parent.isCollapsed()) collapsed.push(parent);
    }
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

  // Fallback bridge for file:// protocol where direct cross-frame access is blocked by browser SOP.
  function attachFrameBridge(frame) {
    var Blockly = frame.Blockly;
    patchLegacyBlockly(Blockly);
    var workspace = Blockly.mainWorkspace;
    ensureStartBlock(Blockly, workspace);
    if (!frame.parent || frame.parent === frame || typeof frame.parent.postMessage !== 'function') {
      return;
    }
    var previousModel;
    var clickedWorkspace = false;

    function collectTitles() {
      var titles = Object.create(null);
      var all = workspace.getAllBlocks();
      for (var i = 0; i < all.length; i++) {
        titles[all[i].id] = blockTitle(all[i]);
      }
      return titles;
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
          titles: collectTitles()
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
          titles: Object.create(null)
        }, '*');
      }
    }

    var canvas = workspace.getCanvas();
    canvas.addEventListener('mousedown', function () { clickedWorkspace = true; }, true);
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
      saveDesign.disabled = false;
      loadDesign.disabled = false;

      lines.addEventListener('click', function (event) {
        var line = Number(event.target.dataset.line);
        if (!result || !line) return;
        selectedLine = line;
        selectedId = result.lineBlockIds[line - 1];
        if (iframe.contentWindow) {
          iframe.contentWindow.postMessage({type: 'avr-bridge-select-block', blockId: selectedId}, '*');
        }
        showBridgeSelection(false);
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
    if (doc.readyState === 'loading' && typeof doc.addEventListener === 'function') {
      doc.addEventListener('DOMContentLoaded', pingFrame);
    } else {
      pingFrame();
    }
  }

  setupParentBridge();
  host.AvrEditor = {attach: attach, attachFrameBridge: attachFrameBridge};
}(window));
