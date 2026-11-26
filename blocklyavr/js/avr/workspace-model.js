(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./pins'));
  } else {
    root.AvrWorkspaceModel = factory(root.AvrPins);
  }
}(this, function (pins) {
  'use strict';

  var messages = {
    MISSING_START: 'Adicione o bloco Ao iniciar ATmega328P no início do programa.',
    MULTIPLE_STARTS: 'Use apenas um bloco Ao iniciar ATmega328P.',
    NESTED_START: 'O bloco Ao iniciar ATmega328P deve ficar no início do programa.',
    LOOSE_BLOCK: 'Conecte este bloco ao programa iniciado por Ao iniciar ATmega328P.',
    MULTIPLE_FOREVER: 'Use apenas um bloco Repita para sempre.',
    NESTED_FOREVER: 'Conecte Repita para sempre diretamente à sequência de início.',
    AFTER_FOREVER: 'Mova este bloco para antes ou para dentro de Repita para sempre.',
    INVALID_BLOCK_GRAPH: 'Este bloco aparece em mais de uma conexão no programa.',
    INVALID_PIN: 'Selecione um pino AVR válido para este bloco.',
    INVALID_PIN_MODE: 'Selecione entrada, entrada com pull-up ou saída.',
    INVALID_PIN_VALUE: 'Selecione nível alto ou baixo para a saída.',
    INVALID_LITERAL: 'Digite um número inteiro de 0 a 255.',
    INVALID_DELAY: 'Digite um atraso inteiro de 1 a 1000 ms.',
    INVALID_DELAY_SECONDS: 'Digite um atraso inteiro de 1 a 255 s.',
    INVALID_VARIABLE: 'Selecione ou crie uma variável de 8 bits.',
    INVALID_COMPARISON: 'Selecione um operador de comparação válido.',
    INVALID_ANALOG_CHANNEL: 'Selecione um canal analógico válido de PC0 (A0) a PC5 (A5).',
    INVALID_PWM_PIN: 'Selecione um pino PWM válido (PB2, PB1, PD6, PD5, PB3 ou PD3).',
    INVALID_LCD_ROW: 'Selecione a linha 0 ou a linha 1 do display LCD.',
    INVALID_ASCII_CHAR: 'Digite exatamente um caractere ASCII imprimível.',
    MULTIPLE_TIMER_ISR: 'Use apenas um bloco de rotina de interrupção para cada Timer.',
    NESTED_TIMER_ISR: 'O bloco de interrupção do Timer deve ficar separado como bloco inicial.',
    MISSING_EXPRESSION: 'Conecte um valor de 8 bits a esta entrada.',
    INVALID_EXPRESSION: 'Use um bloco AVR que forneça um valor de 8 bits.'
  };

  var pwmPinTimers = {
    PD6: 0,
    PD5: 0,
    PB1: 1,
    PB2: 1,
    PB3: 2,
    PD3: 2
  };

  var timerIsrTypes = {
    avr_timer0_isr: 0,
    avr_timer1_isr: 1,
    avr_timer2_isr: 2
  };

  var expressionTypes = Object.create(null);
  expressionTypes.avr_literal = 'literal';
  expressionTypes.avr_variable_read = 'variableRead';
  expressionTypes.avr_add = 'add';
  expressionTypes.avr_subtract = 'subtract';
  expressionTypes.avr_compare = 'compare';
  expressionTypes.avr_digital_read = 'digitalRead';
  expressionTypes.avr_analog_read = 'analogRead';
  expressionTypes.avr_usart_receive_char = 'usartReceiveChar';
  expressionTypes.avr_eeprom_read = 'eepromRead';

  var valueInputs = {
    assign: [['VALUE', 'value']],
    add: [['LEFT', 'left'], ['RIGHT', 'right']],
    subtract: [['LEFT', 'left'], ['RIGHT', 'right']],
    compare: [['LEFT', 'left'], ['RIGHT', 'right']],
    if: [['IF', 'condition']],
    repeatCount: [['COUNT', 'count']],
    pwmWrite: [['VALUE', 'value']],
    lcdCursor: [['COL', 'col']],
    lcdWriteNumber: [['VALUE', 'value']],
    usartTransmitNumber: [['VALUE', 'value']],
    display7Write: [['VALUE', 'value']],
    eepromWrite: [['ADDRESS', 'address'], ['VALUE', 'value']],
    eepromRead: [['ADDRESS', 'address']]
  };

  var statementInputs = {
    avr_if: [['DO', 'thenBody']],
    avr_if_else: [['DO', 'thenBody'], ['ELSE', 'elseBody']],
    avr_repeat_count: [['DO', 'body']]
  };

  function diagnostic(code, block, message) {
    return {code: code, message: message || messages[code], blockId: block ? block.id : null};
  }

  var reservedSymbols = (function () {
    var words = [
      'X', 'XL', 'XH', 'Y', 'YL', 'YH', 'Z', 'ZL', 'ZH',
      'SP', 'SPL', 'SPH', 'SREG', 'RAMEND', 'F_CPU',
      'RESET', 'SETUP', 'MAIN_LOOP', 'HALT', 'AVR_DELAY_MS', '__VECTORS',
      'DDRB', 'PORTB', 'PINB', 'DDRC', 'PORTC', 'PINC', 'DDRD', 'PORTD', 'PIND',
      'ADC', 'ADD', 'ADIW', 'AND', 'ANDI', 'ASR', 'BCLR', 'BLD', 'BRBC', 'BRBS',
      'BRCC', 'BRCS', 'BREAK', 'BREQ', 'BRGE', 'BRHC', 'BRHS', 'BRID', 'BRIE',
      'BRLO', 'BRLT', 'BRMI', 'BRNE', 'BRPL', 'BRSH', 'BRTC', 'BRTS', 'BRVC',
      'BRVS', 'BSET', 'BST', 'CALL', 'CBI', 'CBR', 'CLC', 'CLH', 'CLI', 'CLN',
      'CLR', 'CLS', 'CLT', 'CLV', 'CLZ', 'COM', 'CP', 'CPC', 'CPI', 'CPSE',
      'DEC', 'DES', 'EICALL', 'EIJMP', 'ELPM', 'EOR', 'FMUL', 'FMULS', 'FMULSU',
      'ICALL', 'IJMP', 'IN', 'INC', 'JMP', 'LAC', 'LAS', 'LAT', 'LD', 'LDD',
      'LDI', 'LDS', 'LPM', 'LSL', 'LSR', 'MOV', 'MOVW', 'MUL', 'MULS', 'MULSU',
      'NEG', 'NOP', 'OR', 'ORI', 'OUT', 'POP', 'PUSH', 'RCALL', 'RET', 'RETI',
      'RJMP', 'ROL', 'ROR', 'SBC', 'SBCI', 'SBI', 'SBIC', 'SBIS', 'SBIW', 'SBR',
      'SBRC', 'SBRS', 'SEC', 'SEH', 'SEI', 'SEN', 'SER', 'SES', 'SET', 'SEV',
      'SEZ', 'SLEEP', 'SPM', 'ST', 'STD', 'STS', 'SUB', 'SUBI', 'SWAP', 'TST',
      'WDR', 'XCH',
      'DELAY_TIME', 'DISPLAY_NUMBER', 'EEPROM_ADDRESS', 'EEPROM_NUMBER',
      'TRANSMIT_CARACTER', 'PWM_VALUE', 'LCD_CARACTER', 'AUX', 'RECEIVE_CARACTER',
      'ADC_VALUE', 'OVERFLOW_COUNTER', 'LCD_COL', 'LCD_NUMBER',
      'UNIDADES', 'DEZENAS', 'CENTENAS', 'RS_LCD', 'ENABLE_LCD',
      'DELAY_SECONDS', 'DELAY_MILISECONDS', 'DELAY_1MICROSECOND',
      'DISPLAY_WRITE', 'DISPLAY_OFF', 'EEPROM_WRITE', 'EEPROM_READ',
      'USART_INIT', 'USART_TRANSMIT', 'USART_RECEIVE', 'USART_TRANSMIT_NUMBER',
      'ANALOG_READ', 'ANALOG_READ_CHANNEL', 'PWM_WRITE',
      'PWM_WRITE_PD6', 'PWM_WRITE_PD5', 'PWM_WRITE_PB1', 'PWM_WRITE_PB2', 'PWM_WRITE_PB3', 'PWM_WRITE_PD3',
      'START_TIMER0', 'START_TIMER1', 'START_TIMER2', 'STOP_TIMER1',
      'TIM0_OVERFLOW', 'TIM1_OVERFLOW', 'TIM2_OVERFLOW',
      'LCD_INIT', 'LCD_CLEAR', 'LCD_WRITE_CARACTER', 'PULSE_ENABLE',
      'LCD_LIN0_COL', 'LCD_LIN1_COL', 'LCD_WRITE_NUMBER',
      'INICIO', 'TIMER1_OVF_ISR', 'OVF0ADDR', 'OVF1ADDR', 'OVF2ADDR', 'LIB328P_AFTER_SUBROUTINES'
    ];
    var map = Object.create(null);
    for (var i = 0; i < words.length; i++) {
      map[words[i]] = true;
    }
    return map;
  }());

  var diacriticPairs = [
    [/[ÁÀÂÃÄÅáàâãäå]/g, 'A'],
    [/[ÉÈÊËéèêë]/g, 'E'],
    [/[ÍÌÎÏíìîï]/g, 'I'],
    [/[ÓÒÔÕÖóòôõö]/g, 'O'],
    [/[ÚÙÛÜúùûü]/g, 'U'],
    [/[Çç]/g, 'C'],
    [/[Ññ]/g, 'N'],
    [/[ÝŸýÿ]/g, 'Y']
  ];

  function isReservedSymbol(symbol) {
    var upper = String(symbol).toUpperCase();
    return Boolean(reservedSymbols[upper] ||
      /^R([0-9]|[12][0-9]|3[01])$/.test(upper) ||
      /^(DDR|PORT|PIN|DD|P)[BCD][0-7]$/.test(upper));
  }

  function normalizeVariableSymbolBase(label) {
    var normalized = String(label);
    for (var i = 0; i < diacriticPairs.length; i++) {
      normalized = normalized.replace(diacriticPairs[i][0], diacriticPairs[i][1]);
    }
    normalized = normalized.toUpperCase().replace(/[^A-Z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
    if (!normalized) {
      normalized = 'VAR';
    } else if (/^[0-9]/.test(normalized) || isReservedSymbol(normalized)) {
      normalized = 'VAR_' + normalized;
    }
    return normalized;
  }

  function readVariable(block, diagnostics, variablesById) {
    var variable = block.getAvrVariable();
    if (!variable || typeof variable.id !== 'string' || !variable.id ||
        typeof variable.label !== 'string' || !variable.label.trim()) {
      diagnostics.push(diagnostic('INVALID_VARIABLE', block));
      return null;
    }
    if (!variablesById[variable.id]) {
      variablesById[variable.id] = {
        id: variable.id, label: variable.label
      };
    }
    return variable.id;
  }

  function readNode(block, diagnostics, variablesById) {
    var node = {kind: block.type, blockId: block.id};
    switch (block.type) {
      case 'avr_delay_ms':
        node.kind = 'delayMs';
        var duration = block.getFieldValue('MS');
        node.milliseconds = Number(duration);
        if (typeof duration !== 'string' || !/^[0-9]+$/.test(duration) ||
            node.milliseconds < 1 || node.milliseconds > 1000) {
          diagnostics.push(diagnostic('INVALID_DELAY', block));
        }
        return node;
      case 'avr_delay_s':
        node.kind = 'delaySeconds';
        var seconds = block.getFieldValue('SECONDS');
        node.seconds = Number(seconds);
        if (typeof seconds !== 'string' || !/^[0-9]+$/.test(seconds) ||
            node.seconds < 1 || node.seconds > 255) {
          diagnostics.push(diagnostic('INVALID_DELAY_SECONDS', block));
        }
        return node;
      case 'avr_literal':
        node.kind = 'literal';
        var literal = block.getFieldValue('VALUE');
        node.value = Number(literal);
        if (typeof literal !== 'string' || !/^[0-9]+$/.test(literal) || node.value > 255) {
          diagnostics.push(diagnostic('INVALID_LITERAL', block));
        }
        return node;
      case 'avr_assign':
      case 'avr_variable_read':
        node.kind = block.type === 'avr_assign' ? 'assign' : 'variableRead';
        node.variableId = readVariable(block, diagnostics, variablesById);
        return node;
      case 'avr_add':
      case 'avr_subtract':
        node.kind = expressionTypes[block.type];
        return node;
      case 'avr_compare':
        node.kind = 'compare';
        node.operator = block.getFieldValue('OP');
        if (['EQ', 'NE', 'LT', 'LTE', 'GT', 'GTE'].indexOf(node.operator) === -1) {
          diagnostics.push(diagnostic('INVALID_COMPARISON', block));
        }
        return node;
      case 'avr_if':
      case 'avr_if_else':
        node.kind = 'if';
        return node;
      case 'avr_repeat_count':
        node.kind = 'repeatCount';
        return node;
      case 'avr_analog_read':
        node.kind = 'analogRead';
        var channel = block.getFieldValue('CHANNEL');
        node.channel = Number(channel);
        if (typeof channel !== 'string' || !/^[0-5]$/.test(channel)) {
          diagnostics.push(diagnostic('INVALID_ANALOG_CHANNEL', block));
        }
        return node;
      case 'avr_pwm_write':
        node.kind = 'pwmWrite';
        var rawPwmPin = block.getFieldValue && block.getFieldValue('PIN');
        node.pinId = (rawPwmPin === null || rawPwmPin === undefined) ? 'PB2' : rawPwmPin;
        if (!Object.prototype.hasOwnProperty.call(pwmPinTimers, node.pinId)) {
          diagnostics.push(diagnostic('INVALID_PWM_PIN', block));
        }
        return node;
      case 'avr_timer0_start':
        node.kind = 'timer0Start';
        return node;
      case 'avr_timer1_start':
        node.kind = 'timer1Start';
        return node;
      case 'avr_timer2_start':
        node.kind = 'timer2Start';
        return node;
      case 'avr_timer0_isr':
      case 'avr_timer1_isr':
      case 'avr_timer2_isr':
        node.kind = 'timerIsr';
        node.timer = timerIsrTypes[block.type];
        return node;
      case 'avr_lcd_init':
        node.kind = 'lcdInit';
        return node;
      case 'avr_lcd_clear':
        node.kind = 'lcdClear';
        return node;
      case 'avr_lcd_cursor':
        node.kind = 'lcdCursor';
        var row = block.getFieldValue('ROW');
        node.row = Number(row);
        if (row !== '0' && row !== '1') {
          diagnostics.push(diagnostic('INVALID_LCD_ROW', block));
        }
        return node;
      case 'avr_lcd_write_char':
      case 'avr_usart_transmit_char':
        node.kind = block.type === 'avr_lcd_write_char' ? 'lcdWriteChar' : 'usartTransmitChar';
        var text = block.getFieldValue('CHAR');
        if (typeof text !== 'string' || text.length !== 1 ||
            text.charCodeAt(0) < 32 || text.charCodeAt(0) > 126) {
          diagnostics.push(diagnostic('INVALID_ASCII_CHAR', block));
          node.value = 0;
        } else {
          node.value = text.charCodeAt(0);
        }
        return node;
      case 'avr_lcd_write_number':
        node.kind = 'lcdWriteNumber';
        return node;
      case 'avr_usart_init':
        node.kind = 'usartInit';
        return node;
      case 'avr_usart_transmit_number':
        node.kind = 'usartTransmitNumber';
        return node;
      case 'avr_usart_receive_char':
        node.kind = 'usartReceiveChar';
        return node;
      case 'avr_display7_write':
        node.kind = 'display7Write';
        return node;
      case 'avr_display7_off':
        node.kind = 'display7Off';
        return node;
      case 'avr_eeprom_write':
        node.kind = 'eepromWrite';
        return node;
      case 'avr_eeprom_read':
        node.kind = 'eepromRead';
        return node;
      case 'avr_pin_mode':
        node.kind = 'pinMode';
        node.mode = block.getFieldValue('MODE');
        if (node.mode !== 'input' && node.mode !== 'inputPullup' && node.mode !== 'output') {
          diagnostics.push(diagnostic('INVALID_PIN_MODE', block));
        }
        break;
      case 'avr_digital_write':
        node.kind = 'digitalWrite';
        var value = block.getFieldValue('VALUE');
        if (value !== '0' && value !== '1') {
          diagnostics.push(diagnostic('INVALID_PIN_VALUE', block));
        }
        node.value = Number(value);
        break;
      case 'avr_digital_toggle':
        node.kind = 'digitalToggle';
        break;
      case 'avr_digital_read':
        node.kind = 'digitalRead';
        break;
      default:
        return node;
    }

    node.pinId = block.getFieldValue('PIN');
    var pin = pins.get(node.pinId);
    if (!pin) {
      diagnostics.push(diagnostic('INVALID_PIN', block));
    } else if (!pin.available) {
      diagnostics.push(diagnostic('RESERVED_PIN', block,
        'O pino ' + pin.id + ' está reservado para ' + pin.reservedReason + '.'));
    }
    return node;
  }

  function readStatements(block, stop, nodesById) {
    var statements = [];
    while (block && block !== stop) {
      statements.push(nodesById[block.id]);
      block = block.getNextBlock();
    }
    return statements;
  }

  function checkResourceConflicts(setup, loop, interrupts, diagnostics) {
    var pwmByTimer = {0: [], 1: [], 2: []};
    var pwmPinsUsed = Object.create(null);
    var pwmPortdNodes = [];
    var timerControls = {0: [], 1: [], 2: []};
    var usesLcd = false;
    var usesUsart = false;
    var adcPins = Object.create(null);
    var display7Nodes = [];
    var gpioNodes = [];
    var pending = [];
    if (interrupts) {
      for (var t = 2; t >= 0; t--) {
        var isr = interrupts['timer' + t];
        if (isr) {
          timerControls[t].push({kind: 'timerIsr', timer: t, blockId: isr.blockId});
          if (isr.body && isr.body.length) pending.push({list: isr.body, index: 0});
        }
      }
    }
    if (loop && loop.length) pending.push({list: loop, index: 0});
    if (setup && setup.length) pending.push({list: setup, index: 0});
    while (pending.length) {
      var frame = pending[pending.length - 1];
      if (frame.index >= frame.list.length) {
        pending.pop();
        continue;
      }
      var node = frame.list[frame.index++];
      if (!node) continue;
      switch (node.kind) {
        case 'pwmWrite':
          var pwmPin = node.pinId || 'PB2';
          var pwmTimer = pwmPinTimers[pwmPin];
          if (pwmTimer !== undefined) {
            pwmByTimer[pwmTimer].push(node);
            pwmPinsUsed[pwmPin] = pwmTimer;
            if (/^PD[0-7]$/.test(pwmPin)) {
              pwmPortdNodes.push(node);
            }
          }
          break;
        case 'timer0Start':
          timerControls[0].push(node);
          break;
        case 'timer1Start':
          timerControls[1].push(node);
          break;
        case 'timer2Start':
          timerControls[2].push(node);
          break;
        case 'lcdInit':
        case 'lcdClear':
        case 'lcdCursor':
        case 'lcdWriteChar':
        case 'lcdWriteNumber':
          usesLcd = true;
          break;
        case 'usartInit':
        case 'usartTransmitChar':
        case 'usartTransmitNumber':
          usesUsart = true;
          break;
        case 'display7Write':
        case 'display7Off':
          display7Nodes.push(node);
          break;
        case 'pinMode':
        case 'digitalWrite':
        case 'digitalToggle':
        case 'digitalRead':
          gpioNodes.push(node);
          break;
      }
      var exprPending = [];
      if (node.value && typeof node.value === 'object') exprPending.push(node.value);
      if (node.address && typeof node.address === 'object') exprPending.push(node.address);
      if (node.col && typeof node.col === 'object') exprPending.push(node.col);
      if (node.condition) exprPending.push(node.condition);
      if (node.count) exprPending.push(node.count);
      while (exprPending.length) {
        var expr = exprPending.pop();
        if (!expr) continue;
        if (expr.kind === 'analogRead' && expr.channel >= 0 && expr.channel <= 5) {
          adcPins['PC' + expr.channel] = true;
        } else if (expr.kind === 'usartReceiveChar') {
          usesUsart = true;
        } else if (expr.kind === 'digitalRead') {
          gpioNodes.push(expr);
        }
        if (expr.address && typeof expr.address === 'object') exprPending.push(expr.address);
        if (expr.right) exprPending.push(expr.right);
        if (expr.left) exprPending.push(expr.left);
      }
      if (node.elseBody && node.elseBody.length) pending.push({list: node.elseBody, index: 0});
      if (node.thenBody && node.thenBody.length) pending.push({list: node.thenBody, index: 0});
      if (node.body && node.body.length) pending.push({list: node.body, index: 0});
    }
    for (var tm = 0; tm <= 2; tm++) {
      if (pwmByTimer[tm].length && timerControls[tm].length) {
        for (var i = 0; i < timerControls[tm].length; i++) {
          diagnostics.push({
            code: 'TIMER' + tm + '_CONFLICT',
            message: 'O PWM no Timer' + tm + ' e a interrupção de overflow do Timer' + tm + ' compartilham o mesmo temporizador e não podem ser usados juntos.',
            blockId: timerControls[tm][i].blockId
          });
        }
      }
    }
    if (display7Nodes.length && (usesLcd || usesUsart)) {
      for (var d = 0; d < display7Nodes.length; d++) {
        diagnostics.push({
          code: 'PORTD_CONFLICT',
          message: 'O display de 7 segmentos ocupa todo o PORTD (PD0 a PD7) e não pode ser usado junto com o display LCD ou a porta serial USART0.',
          blockId: display7Nodes[d].blockId
        });
      }
    }
    for (var p = 0; p < pwmPortdNodes.length; p++) {
      var pwmNode = pwmPortdNodes[p];
      if (display7Nodes.length) {
        diagnostics.push({
          code: 'PIN_CONFLICT',
          message: 'O pino PWM ' + pwmNode.pinId + ' já está em uso pelo display de 7 segmentos no PORTD.',
          blockId: pwmNode.blockId
        });
      } else if (usesLcd && /^PD[2-7]$/.test(pwmNode.pinId)) {
        diagnostics.push({
          code: 'PIN_CONFLICT',
          message: 'O pino PWM ' + pwmNode.pinId + ' já está em uso pelo display LCD no PORTD.',
          blockId: pwmNode.blockId
        });
      }
    }
    for (var j = 0; j < gpioNodes.length; j++) {
      var g = gpioNodes[j];
      var pinId = g.pinId;
      if (Object.prototype.hasOwnProperty.call(pwmPinsUsed, pinId)) {
        diagnostics.push({
          code: 'PIN_CONFLICT',
          message: 'O pino ' + pinId + ' já está em uso pelo PWM (Timer' + pwmPinsUsed[pinId] + ').',
          blockId: g.blockId
        });
      } else if (display7Nodes.length && /^PD[0-7]$/.test(pinId)) {
        diagnostics.push({
          code: 'PIN_CONFLICT',
          message: 'O pino ' + pinId + ' já está em uso pelo display de 7 segmentos no PORTD.',
          blockId: g.blockId
        });
      } else if (usesUsart && (pinId === 'PD0' || pinId === 'PD1')) {
        diagnostics.push({
          code: 'PIN_CONFLICT',
          message: 'O pino ' + pinId + ' já está em uso pela porta serial USART0.',
          blockId: g.blockId
        });
      } else if (usesLcd && /^PD[2-7]$/.test(pinId)) {
        diagnostics.push({
          code: 'PIN_CONFLICT',
          message: 'O pino ' + pinId + ' já está em uso pelo display LCD no PORTD.',
          blockId: g.blockId
        });
      } else if (adcPins[pinId]) {
        diagnostics.push({
          code: 'PIN_CONFLICT',
          message: 'O pino ' + pinId + ' já está em uso pela leitura analógica (ADC).',
          blockId: g.blockId
        });
      }
    }
  }

  function fromWorkspace(workspace) {
    var diagnostics = [];
    var pending = workspace.getTopBlocks(false).slice().reverse().map(function (block) {
      return {block: block, topLevel: true, mainChain: false};
    });
    var nodesById = Object.create(null);
    var variablesById = Object.create(null);
    var expressionLinks = [];
    var statementLinks = [];
    var seenStart = false;
    var seenForever = false;
    var seenTimerIsr = {0: false, 1: false, 2: false};
    var timerIsrBlocks = {0: null, 1: null, 2: null};
    var start = null;
    var forever = null;
    var loopBody = null;

    while (pending.length) {
      var current = pending.pop();
      var block = current.block;
      if (nodesById[block.id]) {
        diagnostics.push(diagnostic('INVALID_BLOCK_GRAPH', block));
        continue;
      }
      var node = readNode(block, diagnostics, variablesById);
      nodesById[block.id] = node;

      var next = block.getNextBlock();
      var isStart = block.type === 'avr_start';
      var isTimerIsr = Object.prototype.hasOwnProperty.call(timerIsrTypes, block.type);
      if (isStart) {
        if (seenStart) {
          diagnostics.push(diagnostic('MULTIPLE_STARTS', block));
        }
        seenStart = true;
        if (current.topLevel) {
          start = start || block;
        } else {
          diagnostics.push(diagnostic('NESTED_START', block));
        }
      } else if (isTimerIsr) {
        var timerIndex = timerIsrTypes[block.type];
        if (seenTimerIsr[timerIndex]) {
          diagnostics.push(diagnostic('MULTIPLE_TIMER_ISR', block));
        }
        seenTimerIsr[timerIndex] = true;
        if (current.topLevel) {
          timerIsrBlocks[timerIndex] = timerIsrBlocks[timerIndex] || block;
        } else {
          diagnostics.push(diagnostic('NESTED_TIMER_ISR', block));
        }
      } else if (current.topLevel) {
        diagnostics.push(diagnostic('LOOSE_BLOCK', block));
      }

      var bodies = [];
      if (block.type === 'avr_forever') {
        var body = block.getInputTargetBlock('DO');
        if (body) {
          bodies.push(body);
        }
        if (seenForever) {
          diagnostics.push(diagnostic('MULTIPLE_FOREVER', block));
        }
        seenForever = true;
        if (current.mainChain) {
          if (!forever) {
            forever = block;
            loopBody = body;
          }
        } else if (!current.topLevel) {
          diagnostics.push(diagnostic('NESTED_FOREVER', block));
        }
        if (next) {
          diagnostics.push(diagnostic('AFTER_FOREVER', next));
        }
      } else if (Object.prototype.hasOwnProperty.call(statementInputs, block.type)) {
        statementInputs[block.type].forEach(function (input) {
          var first = block.getInputTargetBlock(input[0]);
          if (first) {
            bodies.push(first);
          }
          statementLinks.push({node: node, property: input[1], first: first});
        });
      }

      var values = [];
      if (Object.prototype.hasOwnProperty.call(valueInputs, node.kind)) {
        valueInputs[node.kind].forEach(function (input) {
          var child = block.getInputTargetBlock(input[0]);
          if (!child) {
            diagnostics.push(diagnostic('MISSING_EXPRESSION', block));
            return;
          }
          if (!expressionTypes[child.type]) {
            diagnostics.push(diagnostic('INVALID_EXPRESSION', child));
          }
          values.push(child);
          expressionLinks.push({node: node, property: input[1], blockId: child.id});
        });
      }

      // Follow model connections even if an import has an incomplete child list.
      var children = block.getChildren();
      for (var i = children.length - 1; i >= 0; i--) {
        if (children[i] !== next && bodies.indexOf(children[i]) === -1 && values.indexOf(children[i]) === -1) {
          pending.push({block: children[i], topLevel: false, mainChain: false});
        }
      }
      for (var j = values.length - 1; j >= 0; j--) {
        pending.push({block: values[j], topLevel: false, mainChain: false});
      }
      for (var k = bodies.length - 1; k >= 0; k--) {
        pending.push({block: bodies[k], topLevel: false, mainChain: false});
      }
      if (next) {
        pending.push({
          block: next,
          topLevel: false,
          mainChain: current.mainChain || (current.topLevel && isStart)
        });
      }
    }

    if (!start) {
      diagnostics.unshift(diagnostic('MISSING_START', null));
    }
    if (diagnostics.length) {
      return {program: null, diagnostics: diagnostics};
    }

    expressionLinks.forEach(function (link) {
      link.node[link.property] = nodesById[link.blockId];
    });
    statementLinks.forEach(function (link) {
      link.node[link.property] = readStatements(link.first, null, nodesById);
    });

    var setupStatements = readStatements(start.getNextBlock(), forever, nodesById);
    var loopStatements = forever ? readStatements(loopBody, null, nodesById) : null;
    var interrupts = Object.create(null);
    var hasInterrupts = false;
    for (var ti = 0; ti <= 2; ti++) {
      if (timerIsrBlocks[ti]) {
        hasInterrupts = true;
        interrupts['timer' + ti] = {
          blockId: timerIsrBlocks[ti].id,
          body: readStatements(timerIsrBlocks[ti].getNextBlock(), null, nodesById)
        };
      }
    }
    checkResourceConflicts(setupStatements, loopStatements, hasInterrupts ? interrupts : null, diagnostics);
    if (diagnostics.length) {
      return {program: null, diagnostics: diagnostics};
    }

    var usedSymbols = Object.create(null);
    var variables = Object.keys(variablesById).sort().map(function (id) {
      var entry = variablesById[id];
      var base = normalizeVariableSymbolBase(entry.label);
      var symbol = base;
      var suffix = 2;
      while (usedSymbols[symbol] || isReservedSymbol(symbol)) {
        var tag = suffix < 10 ? '0' + suffix : String(suffix);
        symbol = base + '_' + tag;
        suffix++;
      }
      usedSymbols[symbol] = true;
      return {id: entry.id, label: entry.label, symbol: symbol};
    });

    var program = {
      clockHz: 16000000,
      startBlockId: start.id,
      setup: setupStatements,
      loopBlockId: forever ? forever.id : null,
      loop: loopStatements,
      variables: variables
    };
    if (hasInterrupts) {
      program.interrupts = interrupts;
    }

    return {
      program: program,
      diagnostics: diagnostics
    };
  }

  return {fromWorkspace: fromWorkspace, isReservedSymbol: isReservedSymbol};
}));
