'use strict';

(function () {
  var colour = 185;

  function pinOptions() {
    return AvrPins.list().filter(function (pin) {
      return pin.available;
    }).map(function (pin) {
      var label = pin.unoAlias ? pin.id + ' (' + pin.unoAlias + ')' : pin.id;
      return [label, pin.id];
    });
  }

  Blockly.Blocks['avr_pin_mode'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('Configurar')
        .appendField(new Blockly.FieldDropdown(pinOptions), 'PIN')
        .appendField('como')
        .appendField(new Blockly.FieldDropdown([
          ['entrada', 'input'],
          ['entrada com pull-up', 'inputPullup'],
          ['saída', 'output']
        ]), 'MODE');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(colour);
      this.setTooltip('Define a direção do pino e, para uma entrada, se o pull-up interno fica ativo.');
    }
  };

  Blockly.Blocks['avr_digital_write'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('Definir saída')
        .appendField(new Blockly.FieldDropdown(pinOptions), 'PIN')
        .appendField('em nível')
        .appendField(new Blockly.FieldDropdown([['alto', '1'], ['baixo', '0']]), 'VALUE');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(colour);
      this.setTooltip('Coloca o pino em nível alto ou baixo depois que ele foi configurado como saída.');
    }
  };

  Blockly.Blocks['avr_digital_toggle'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('Alternar saída')
        .appendField(new Blockly.FieldDropdown(pinOptions), 'PIN');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(colour);
      this.setTooltip('Inverte o nível do pino depois que ele foi configurado como saída.');
    }
  };

  Blockly.Blocks['avr_digital_read'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('Ler entrada digital')
        .appendField(new Blockly.FieldDropdown(pinOptions), 'PIN');
      this.setOutput(true, 'Number');
      this.setColour(colour);
      this.setTooltip('Lê o nível do pino e fornece 0 para baixo ou 1 para alto.');
    }
  };
}());
