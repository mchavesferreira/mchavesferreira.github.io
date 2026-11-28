'use strict';

Blockly.Blocks.avr_delay_ms = {
  init: function () {
    this.appendDummyInput().appendField('Aguardar')
      .appendField(new Blockly.FieldTextInput('1'), 'MS').appendField('ms');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(120);
    this.setTooltip('Aceita uma constante inteira de 1 a 1000 ms. A espera ocupa a CPU a 16 MHz.');
  }
};

Blockly.Blocks.avr_delay_s = {
  init: function () {
    this.appendDummyInput().appendField('Aguardar')
      .appendField(new Blockly.FieldTextInput('1'), 'SECONDS').appendField('s');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(120);
    this.setTooltip('Aceita uma constante inteira de 1 a 255 s. A espera ocupa a CPU a 16 MHz.');
  }
};
