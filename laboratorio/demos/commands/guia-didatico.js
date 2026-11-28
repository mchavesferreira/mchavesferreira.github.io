(function (host) {
  'use strict';

  var doc = host.document;

  function byId(id) {
    return doc ? doc.getElementById(id) : null;
  }

  function normalizeText(value) {
    var text = value == null ? '' : String(value);
    if (typeof text.normalize === 'function') {
      text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }
    return text.toLowerCase().trim();
  }

  function appendEl(parent, tag, text, className) {
    var node = doc.createElement(tag);
    if (text !== null && text !== undefined) {
      node.textContent = text;
    }
    if (className) node.className = className;
    if (parent) parent.appendChild(node);
    return node;
  }

  function buildSearchCorpus(topic) {
    var parts = [
      topic.id || '',
      topic.title || '',
      topic.shortTitle || '',
      topic.summary || '',
      topic.didacticIntro || '',
      topic.externalNote || '',
      topic.datasheetDoc || '',
      topic.datasheetSection || '',
      topic.datasheetFigure || '',
      topic.datasheetPage || ''
    ];
    var i;
    var regs = topic.registers || [];
    for (i = 0; i < regs.length; i++) {
      parts.push(regs[i].name || '');
      parts.push(regs[i].ioAddress || '');
      parts.push(regs[i].sramAddress || '');
      parts.push(regs[i].bits || '');
      parts.push(regs[i].description || '');
      parts.push(regs[i].page || '');
    }
    var blocks = topic.blockTypes || [];
    for (i = 0; i < blocks.length; i++) {
      parts.push(blocks[i]);
    }
    var routines = topic.libraryRoutines || [];
    for (i = 0; i < routines.length; i++) {
      parts.push(routines[i]);
    }
    var mnemonics = topic.mnemonics || [];
    for (i = 0; i < mnemonics.length; i++) {
      parts.push(mnemonics[i]);
    }
    var examples = topic.blockToAsmExamples || [];
    for (i = 0; i < examples.length; i++) {
      parts.push(examples[i].block || '');
      parts.push(examples[i].asm || '');
    }
    return normalizeText(parts.join(' '));
  }

  function topicMatchesQuery(topic, query) {
    var needle = normalizeText(query);
    if (!needle) return true;
    var corpus = buildSearchCorpus(topic);
    var terms = needle.split(/\s+/);
    for (var i = 0; i < terms.length; i++) {
      if (terms[i] && corpus.indexOf(terms[i]) === -1) {
        return false;
      }
    }
    return true;
  }

  function renderChapter(chapterNumber, topic, catalog, diagrams) {
    var section = doc.createElement('section');
    section.id = topic.id;
    section.className = 'chapter';
    if (typeof section.setAttribute === 'function') {
      section.setAttribute('id', topic.id);
      section.setAttribute('data-topic-id', topic.id);
    }

    var header = appendEl(section, 'header', null, 'chapter-header');
    appendEl(header, 'span', 'Capítulo ' + chapterNumber, 'chapter-eyebrow');
    appendEl(header, 'h2', topic.title, 'chapter-title');
    appendEl(header, 'p', topic.summary, 'chapter-summary');

    appendEl(section, 'h3', 'Como funciona no ATmega328P');
    appendEl(section, 'p', topic.didacticIntro, 'chapter-intro');

    if (topic.externalNote) {
      var noteBox = appendEl(section, 'div', null, 'chapter-external-note');
      appendEl(noteBox, 'strong', 'Observação de hardware externo: ');
      appendEl(noteBox, 'span', topic.externalNote);
    }

    if (diagrams && topic.diagramId &&
        typeof diagrams.hasDiagram === 'function' && diagrams.hasDiagram(topic.diagramId) &&
        typeof diagrams.renderSvg === 'function') {
      appendEl(section, 'h3', 'Circuito interno (diagrama esquemático)');
      var figure = appendEl(section, 'figure', null, 'chapter-diagram');
      var frame = appendEl(figure, 'div', null, 'diagram-frame');
      frame.innerHTML = diagrams.renderSvg(topic.diagramId);
      if (typeof diagrams.getCaption === 'function') {
        var caption = diagrams.getCaption(topic.diagramId);
        if (caption) {
          appendEl(figure, 'figcaption', caption);
        }
      }
    }

    if (topic.registers && topic.registers.length) {
      appendEl(section, 'h3', 'Registradores e bits principais');
      var tableWrap = appendEl(section, 'div', null, 'table-wrap');
      var table = appendEl(tableWrap, 'table', null, 'register-table');
      var thead = appendEl(table, 'thead', null);
      var headRow = appendEl(thead, 'tr', null);
      appendEl(headRow, 'th', 'Registrador');
      appendEl(headRow, 'th', 'I/O / SRAM');
      appendEl(headRow, 'th', 'Bits principais');
      appendEl(headRow, 'th', 'Função');
      appendEl(headRow, 'th', 'Folha');

      var tbody = appendEl(table, 'tbody', null);
      for (var i = 0; i < topic.registers.length; i++) {
        var reg = topic.registers[i];
        var row = appendEl(tbody, 'tr', null);
        var nameCell = appendEl(row, 'td', null);
        appendEl(nameCell, 'code', reg.name);
        var addrText = reg.ioAddress && reg.ioAddress !== '—'
          ? 'I/O ' + reg.ioAddress + ' / SRAM ' + reg.sramAddress
          : 'SRAM ' + reg.sramAddress;
        var addrCell = appendEl(row, 'td', null);
        appendEl(addrCell, 'code', addrText);
        var bitsCell = appendEl(row, 'td', null);
        appendEl(bitsCell, 'code', reg.bits);
        appendEl(row, 'td', reg.description);
        appendEl(row, 'td', reg.page);
      }
    }

    appendEl(section, 'h3', 'Relação Bloco Blockly → Instruções AVRASM2');
    if (topic.blockToAsmExamples && topic.blockToAsmExamples.length) {
      var exList = appendEl(section, 'ul', null, 'block-asm-list');
      for (var j = 0; j < topic.blockToAsmExamples.length; j++) {
        var ex = topic.blockToAsmExamples[j];
        var exItem = appendEl(exList, 'li', null);
        appendEl(exItem, 'strong', ex.block + ': ');
        appendEl(exItem, 'code', ex.asm);
      }
    }

    var metaChips = appendEl(section, 'div', null, 'chip-groups');
    if (topic.blockTypes && topic.blockTypes.length) {
      var blocksRow = appendEl(metaChips, 'p', null, 'chip-row');
      appendEl(blocksRow, 'span', 'Blocos cobertos: ', 'chip-label');
      for (var b = 0; b < topic.blockTypes.length; b++) {
        appendEl(blocksRow, 'code', topic.blockTypes[b], 'meta-chip');
      }
    }
    if (topic.libraryRoutines && topic.libraryRoutines.length) {
      var routinesRow = appendEl(metaChips, 'p', null, 'chip-row');
      appendEl(routinesRow, 'span', 'Rotinas de lib328Pv03.inc: ', 'chip-label');
      for (var r = 0; r < topic.libraryRoutines.length; r++) {
        appendEl(routinesRow, 'code', topic.libraryRoutines[r], 'meta-chip routine-chip');
      }
    }

    var refBox = appendEl(section, 'aside', null, 'reference-box');
    appendEl(refBox, 'h4', 'Referência Original');
    var docTitle = (catalog && catalog.DATASHEET_TITLE) || topic.datasheetDoc || 'DS40002061B';
    appendEl(refBox, 'p', 'Documento: ' + docTitle + ' (' + (topic.datasheetDoc || 'DS40002061B') + ')');
    appendEl(refBox, 'p', 'Seção: ' + topic.datasheetSection);
    appendEl(refBox, 'p', 'Figura(s): ' + topic.datasheetFigure);
    appendEl(refBox, 'p', 'Indicação da folha/página: ' + topic.datasheetPage);
    if (catalog && typeof catalog.formatReference === 'function') {
      appendEl(refBox, 'p', catalog.formatReference(topic), 'reference-citation');
    }

    return section;
  }

  function init() {
    var catalog = host.AvrDatasheetCatalog || null;
    var diagrams = host.AvrDatasheetDiagrams || null;
    var tocEl = byId('guide-toc');
    var tocToggle = byId('toggle-toc');
    var printBtn = byId('print-guide');
    var tocList = byId('toc-list');
    var chaptersEl = byId('guide-chapters');
    var searchInput = byId('guide-search');
    var clearBtn = byId('clear-search');
    var searchStatus = byId('search-status');
    var emptySearch = byId('empty-search');

    if (!catalog || !tocList || !chaptersEl || typeof catalog.listTopics !== 'function') {
      return false;
    }

    var topics = catalog.listTopics();
    var tocItemsById = Object.create(null);
    var tocLinksById = Object.create(null);
    var chaptersById = Object.create(null);

    tocList.textContent = '';
    chaptersEl.textContent = '';

    for (var i = 0; i < topics.length; i++) {
      var topic = topics[i];
      var li = appendEl(tocList, 'li', null, 'toc-item');
      if (typeof li.setAttribute === 'function') {
        li.setAttribute('data-topic-id', topic.id);
      }
      var link = appendEl(li, 'a', (i + 1) + '. ' + (topic.shortTitle || topic.title), 'toc-link');
      link.href = '#' + topic.id;
      if (typeof link.setAttribute === 'function') {
        link.setAttribute('href', '#' + topic.id);
        link.setAttribute('data-topic-id', topic.id);
      }
      tocItemsById[topic.id] = li;
      tocLinksById[topic.id] = link;

      var chapterNode = renderChapter(i + 1, topic, catalog, diagrams);
      chaptersEl.appendChild(chapterNode);
      chaptersById[topic.id] = chapterNode;
    }

    function setTocOpen(open) {
      var isOpen = Boolean(open);
      if (tocEl && tocEl.classList && typeof tocEl.classList.toggle === 'function') {
        tocEl.classList.toggle('is-open', isOpen);
      }
      if (tocToggle && typeof tocToggle.setAttribute === 'function') {
        tocToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      }
    }

    function applyFilter(query) {
      var visibleCount = 0;
      var q = query == null ? '' : String(query);
      for (var k = 0; k < topics.length; k++) {
        var t = topics[k];
        var matched = topicMatchesQuery(t, q);
        if (matched) visibleCount++;
        if (chaptersById[t.id]) chaptersById[t.id].hidden = !matched;
        if (tocItemsById[t.id]) tocItemsById[t.id].hidden = !matched;
      }
      if (clearBtn) clearBtn.hidden = !normalizeText(q);
      if (emptySearch) emptySearch.hidden = visibleCount > 0;
      if (searchStatus) {
        searchStatus.textContent = normalizeText(q)
          ? 'Mostrando ' + visibleCount + ' de ' + topics.length + ' capítulos'
          : topics.length + ' capítulos disponíveis';
      }
    }

    function highlightHash(shouldScroll) {
      var rawHash = host.location && host.location.hash ? String(host.location.hash) : '';
      var targetId = rawHash.replace(/^#/, '');
      if (targetId && chaptersById[targetId]) {
        if (chaptersById[targetId].hidden) {
          if (searchInput) searchInput.value = '';
          applyFilter('');
        }
      }
      for (var k = 0; k < topics.length; k++) {
        var id = topics[k].id;
        var active = Boolean(targetId && id === targetId);
        if (chaptersById[id] && chaptersById[id].classList) {
          chaptersById[id].classList.toggle('is-target', active);
        }
        if (tocLinksById[id] && tocLinksById[id].classList) {
          tocLinksById[id].classList.toggle('is-active', active);
        }
      }
      if (shouldScroll && targetId && chaptersById[targetId] &&
          typeof chaptersById[targetId].scrollIntoView === 'function') {
        chaptersById[targetId].scrollIntoView({block: 'start'});
      }
    }

    setTocOpen(false);
    applyFilter(searchInput ? searchInput.value : '');
    highlightHash(true);

    if (tocToggle && typeof tocToggle.addEventListener === 'function') {
      tocToggle.addEventListener('click', function () {
        var currentlyOpen = tocToggle.getAttribute('aria-expanded') === 'true';
        setTocOpen(!currentlyOpen);
      });
    }

    if (tocList && typeof tocList.addEventListener === 'function') {
      tocList.addEventListener('click', function (event) {
        var target = event && event.target;
        var id = target && typeof target.getAttribute === 'function' ? target.getAttribute('data-topic-id') : '';
        if (id && host.location) {
          host.location.hash = '#' + id;
          highlightHash(true);
        }
        setTocOpen(false);
      });
    }

    if (searchInput && typeof searchInput.addEventListener === 'function') {
      searchInput.addEventListener('input', function () {
        applyFilter(searchInput.value);
      });
    }

    if (clearBtn && typeof clearBtn.addEventListener === 'function') {
      clearBtn.addEventListener('click', function () {
        if (searchInput) {
          searchInput.value = '';
          if (typeof searchInput.focus === 'function') searchInput.focus();
        }
        applyFilter('');
      });
    }

    if (printBtn && typeof printBtn.addEventListener === 'function') {
      printBtn.addEventListener('click', function () {
        if (typeof host.print === 'function') host.print();
      });
    }

    if (typeof host.addEventListener === 'function') {
      host.addEventListener('hashchange', function () {
        highlightHash(true);
      });
    }

    if (typeof doc.addEventListener === 'function') {
      doc.addEventListener('keydown', function (event) {
        if (event && (event.key === 'Escape' || event.keyCode === 27)) {
          setTocOpen(false);
        }
      });
    }

    return true;
  }

  function boot() {
    init();
  }

  if (doc) {
    if (doc.readyState === 'loading' && typeof doc.addEventListener === 'function') {
      doc.addEventListener('DOMContentLoaded', boot);
    } else {
      boot();
    }
  }

  host.AvrDidacticGuide = {
    init: init,
    normalizeText: normalizeText,
    topicMatchesQuery: topicMatchesQuery
  };
}(window));
