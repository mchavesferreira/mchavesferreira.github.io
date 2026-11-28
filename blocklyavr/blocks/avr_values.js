'use strict';

(function () {
  var valueColour = 230;
  var variableColour = 330;
  var createOption = '+';
  var renameOption = '=';

  function workspaceVariables(workspace) {
    var variables = Object.create(null);
    workspace.getAllBlocks().forEach(function (block) {
      var variable = block.getAvrVariable && block.getAvrVariable();
      if (variable) {
        variables[variable.id] = variable;
      }
    });
    return variables;
  }

  function setVariable(block, variable) {
    var field = block.avrVariableField_;
    var previousValue = field.getValue();
    var previousText = field.getText();
    block.avrVariable_ = variable;
    field.setValue(variable ? variable.id : '');
    if (block.rendered && field.getValue() !== previousValue && field.getText() === previousText) {
      block.workspace.fireChangeEvent();
    }
  }

  function variableField(block) {
    block.avrVariable_ = null;
    var field = new Blockly.FieldDropdown(function () {
      var variables = workspaceVariables(block.workspace);
      var current = block.getAvrVariable();
      if (current) {
        variables[current.id] = current;
      }
      var options = [['selecione', '']];
      Object.keys(variables).sort().forEach(function (id) {
        options.push([variables[id].label, id]);
      });
      options.push(['Criar variável…', createOption]);
      if (current) {
        options.push(['Renomear variável…', renameOption]);
      }
      return options;
    }, function (choice) {
      var variables = workspaceVariables(block.workspace);
      var current = block.getAvrVariable();
      if (choice === createOption || choice === renameOption) {
        var rename = choice === renameOption;
        var name = window.prompt(rename ? 'Novo nome da variável' : 'Nome da variável',
          rename ? current.label : '');
        if (name === null || name === undefined) {
          return null;
        }
        var trimmed = String(name).trim();
        if (!trimmed) {
          return null;
        }
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(trimmed)) {
          window.alert('Nome inválido para label Assembly. Use apenas letras sem acento (A-Z), números e sublinhado (_), começando por letra ou _, sem espaços.');
          return null;
        }
        var label = trimmed.toUpperCase();
        var isReserved = typeof AvrWorkspaceModel === 'object' && AvrWorkspaceModel &&
          typeof AvrWorkspaceModel.isReservedSymbol === 'function' ?
          AvrWorkspaceModel.isReservedSymbol(label) :
          /^(R([0-9]|[12][0-9]|3[01])|X|XL|XH|Y|YL|YH|Z|ZL|ZH|SP|SPL|SPH|SREG|RAMEND|F_CPU|RESET|SETUP|MAIN_LOOP|HALT|AVR_DELAY_MS|__VECTORS|DDR[BCD]|PORT[BCD]|PIN[BCD]|(DDR|PORT|PIN|DD|P)[BCD][0-7])$/.test(label);
        if (isReserved) {
          window.alert('Este nome é reservado na programação Assembly AVR.');
          return null;
        }
        if (Object.keys(variables).some(function (id) {
          return (!rename || id !== current.id) && variables[id].label.toUpperCase() === label;
        })) {
          window.alert('Já existe uma variável AVR com esse nome.');
          return null;
        }
        if (rename) {
          var renamed = {id: current.id, label: label};
          block.workspace.getAllBlocks().forEach(function (reference) {
            var variable = reference.getAvrVariable && reference.getAvrVariable();
            if (variable && variable.id === current.id) {
              setVariable(reference, renamed);
            }
          });
        } else {
          // Keep IDs distinct across projects that may exchange copied blocks.
          var id = 'v' + Math.random().toString(36).slice(2) + '_' + Blockly.genUid();
          setVariable(block, {id: id, label: label});
        }
      } else {
        setVariable(block, variables[choice] || null);
      }
      return null;
    });
    block.avrVariableField_ = field;
    return field;
  }

  function getAvrVariable() {
    return this.avrVariable_;
  }

  // This Blockly version stores only variable names in FieldVariable. Carry
  // the AVR ID and its current label with each reference in the project XML.
  function mutationToDom() {
    var variable = this.getAvrVariable();
    if (!variable) {
      return null;
    }
    var mutation = document.createElement('mutation');
    mutation.setAttribute('variable-id', variable.id);
    mutation.setAttribute('variable-label', variable.label);
    return mutation;
  }

  function domToMutation(mutation) {
    var id = mutation.getAttribute('variable-id');
    var label = mutation.getAttribute('variable-label');
    if (id && label && id !== createOption && id !== renameOption) {
      var known = workspaceVariables(this.workspace)[id];
      setVariable(this, known || {id: id, label: label});
    }
  }

  Blockly.Blocks.avr_literal = {
    init: function () {
      var value = new Blockly.FieldTextInput('0', function (text) {
        return /^[0-9]+$/.test(text) && Number(text) <= 255 ? text : null;
      });
      this.appendDummyInput().appendField(value, 'VALUE');
      this.setOutput(true, 'Number');
      this.setColour(valueColour);
      this.setTooltip('Fornece um inteiro sem sinal de 8 bits, de 0 a 255.');
    }
  };

  Blockly.Blocks.avr_variable_read = {
    init: function () {
      this.appendDummyInput().appendField('Ler variável').appendField(variableField(this));
      this.setOutput(true, 'Number');
      this.setColour(variableColour);
      this.setTooltip('Lê uma variável de 8 bits na SRAM. A variável começa em zero após o reset.');
    },
    getAvrVariable: getAvrVariable,
    mutationToDom: mutationToDom,
    domToMutation: domToMutation
  };

  function arithmeticBlock(operator, description) {
    return {
      init: function () {
        this.appendValueInput('LEFT').setCheck('Number');
        this.appendValueInput('RIGHT').setCheck('Number').appendField(operator);
        this.setInputsInline(true);
        this.setOutput(true, 'Number');
        this.setColour(valueColour);
        this.setTooltip(description + ' O resultado sem sinal fica entre 0 e 255 (módulo 256).');
      }
    };
  }

  Blockly.Blocks.avr_add = arithmeticBlock('+', 'Soma dois valores de 8 bits.');
  Blockly.Blocks.avr_subtract = arithmeticBlock('−', 'Subtrai o segundo valor de 8 bits do primeiro.');

  Blockly.Blocks.avr_assign = {
    init: function () {
      this.appendValueInput('VALUE').setCheck('Number')
        .appendField('Atribuir a').appendField(variableField(this));
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(variableColour);
      this.setTooltip('Guarda o valor de 8 bits na variável selecionada na SRAM.');
    },
    getAvrVariable: getAvrVariable,
    mutationToDom: mutationToDom,
    domToMutation: domToMutation
  };
}());
