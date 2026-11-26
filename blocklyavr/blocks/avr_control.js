'use strict';

(function () {
  var logicColour = 210;
  var loopColour = 120;

  Blockly.Blocks.avr_compare = {
    init: function () {
      this.appendValueInput('LEFT').setCheck('Number');
      this.appendValueInput('RIGHT').setCheck('Number')
        .appendField(new Blockly.FieldDropdown([
          ['=', 'EQ'], ['≠', 'NE'], ['<', 'LT'], ['≤', 'LTE'], ['>', 'GT'], ['≥', 'GTE']
        ]), 'OP');
      this.setInputsInline(true);
      this.setOutput(true, 'Number');
      this.setColour(logicColour);
      this.setTooltip('Compara dois valores de 8 bits sem sinal. Fornece 1 se a relação for verdadeira e 0 se for falsa.');
    }
  };

  function ifBlock(withElse) {
    return {
      init: function () {
        this.appendValueInput('IF').setCheck('Number').appendField('Se');
        this.appendStatementInput('DO').appendField('então');
        if (withElse) {
          this.appendStatementInput('ELSE').appendField('senão');
        }
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour(logicColour);
        this.setTooltip('Executa o ramo “então” se a condição for diferente de zero.' +
          (withElse ? ' Se for zero, executa o ramo “senão”.' : ''));
      }
    };
  }

  Blockly.Blocks.avr_if = ifBlock(false);
  Blockly.Blocks.avr_if_else = ifBlock(true);

  Blockly.Blocks.avr_repeat_count = {
    init: function () {
      this.appendValueInput('COUNT').setCheck('Number').appendField('Repita');
      this.appendDummyInput().appendField('vezes');
      this.appendStatementInput('DO').appendField('faça');
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(loopColour);
      this.setTooltip('Avalia uma vez a contagem de 0 a 255 e executa o corpo esse número de vezes.');
    }
  };
}());
