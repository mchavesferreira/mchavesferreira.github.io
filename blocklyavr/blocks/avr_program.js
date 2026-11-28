'use strict';

Blockly.Blocks['avr_start'] = {
  init: function () {
    this.appendDummyInput().appendField('Ao iniciar ATmega328P');
    this.setNextStatement(true);
    this.setColour(40);
    this.setTooltip('Os blocos conectados abaixo começam a executar após o reset.');
  },
  initSvg: function () {
    Blockly.Block.prototype.initSvg.call(this);
    // The legacy renderer has no hat option. Draw the cap only on this SVG.
    this.svg_.renderDrawTop_ = function (steps, highlights, connectionsXY, rightEdge) {
      var corner = Blockly.BlockSvg.CORNER_RADIUS;
      steps.push('M 0,' + corner + ' C 0,-8 24,-12 40,0 H', rightEdge);
      highlights.push('M 1,' + corner + ' C 1,-7 24,-11 40,1 H',
          rightEdge + (Blockly.RTL ? -1 : 0));
      this.width = rightEdge;
    };
  }
};

Blockly.Blocks['avr_forever'] = {
  init: function () {
    this.appendDummyInput().appendField('Repita para sempre');
    this.appendStatementInput('DO');
    this.setPreviousStatement(true);
    this.setColour(120);
    this.setTooltip('Repete os blocos dentro deste laço após a configuração inicial.');
  }
};
