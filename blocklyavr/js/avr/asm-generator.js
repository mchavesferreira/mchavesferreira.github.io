(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./pins'));
  } else {
    root.AvrAsmGenerator = factory(root.AvrPins);
  }
}(this, function (pins) {
  'use strict';

  var sramBytes = 2048;
  var flashWords = 16384;
  var instructionWidths = {call: 2, jmp: 2, lds: 2, sts: 2};
  var comparisons = {
    EQ: {symbol: '=', branch: 'breq', flag: 'Z = 1'},
    NE: {symbol: '≠', branch: 'brne', flag: 'Z = 0'},
    LT: {symbol: '<', branch: 'brlo', flag: 'C = 1'},
    LTE: {symbol: '≤', branch: 'brsh', flag: 'C = 0', reversed: true},
    GT: {symbol: '>', branch: 'brlo', flag: 'C = 1', reversed: true},
    GTE: {symbol: '≥', branch: 'brsh', flag: 'C = 0'}
  };

  function validateGpio(node) {
    var code;
    var message;
    if (node.kind !== 'pinMode' && node.kind !== 'digitalWrite' &&
        node.kind !== 'digitalToggle' && node.kind !== 'digitalRead') {
      code = 'UNSUPPORTED_BLOCK';
      message = 'O bloco ' + node.kind + ' ainda não tem instrução Assembly.';
    } else {
      var pin = pins.get(node.pinId);
      if (!pin) {
        code = 'INVALID_PIN';
        message = 'Selecione um pino AVR válido para este bloco.';
      } else if (!pin.available) {
        code = 'RESERVED_PIN';
        message = 'O pino ' + pin.id + ' está reservado para ' + pin.reservedReason + '.';
      } else if (node.kind === 'pinMode' && node.mode !== 'input' &&
          node.mode !== 'inputPullup' && node.mode !== 'output') {
        code = 'INVALID_PIN_MODE';
        message = 'Selecione entrada, entrada com pull-up ou saída.';
      } else if (node.kind === 'digitalWrite' && node.value !== 0 && node.value !== 1) {
        code = 'INVALID_PIN_VALUE';
        message = 'Selecione nível alto ou baixo para a saída.';
      }
    }
    return code ? {code: code, message: message, blockId: node.blockId} : null;
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

  function isReservedSymbol(symbol) {
    var upper = String(symbol).toUpperCase();
    return Boolean(reservedSymbols[upper] ||
      /^R([0-9]|[12][0-9]|3[01])$/.test(upper) ||
      /^(DDR|PORT|PIN|DD|P)[BCD][0-7]$/.test(upper));
  }

  function localLabel(prefix, blockId) {
    var id = String(blockId);
    var encoded = [];
    for (var i = 0; i < id.length; i++) {
      encoded.push(id.charCodeAt(i).toString(16));
    }
    return 'L_' + prefix + '_' + encoded.join('_');
  }

  var pwmPinConfig = {
    PD6: {timer: 0, routine: 'pwm_write_pd6', label: 'PD6 (D6 / OC0A)', register: 'OCR0A'},
    PD5: {timer: 0, routine: 'pwm_write_pd5', label: 'PD5 (D5 / OC0B)', register: 'OCR0B'},
    PB1: {timer: 1, routine: 'pwm_write_pb1', label: 'PB1 (D9 / OC1A)', register: 'OCR1AL'},
    PB2: {timer: 1, routine: 'pwm_write', label: 'PB2 (D10 / OC1B)', register: 'OCR1BL'},
    PB3: {timer: 2, routine: 'pwm_write_pb3', label: 'PB3 (D11 / OC2A)', register: 'OCR2A'},
    PD3: {timer: 2, routine: 'pwm_write_pd3', label: 'PD3 (D3 / OC2B)', register: 'OCR2B'}
  };

  var libraryNodeKinds = {
    delaySeconds: true,
    analogRead: true,
    pwmWrite: true,
    timer0Start: true,
    timer1Start: true,
    timer2Start: true,
    lcdInit: true,
    lcdClear: true,
    lcdCursor: true,
    lcdWriteChar: true,
    lcdWriteNumber: true,
    usartInit: true,
    usartTransmitChar: true,
    usartTransmitNumber: true,
    usartReceiveChar: true,
    display7Write: true,
    display7Off: true,
    eepromWrite: true,
    eepromRead: true
  };

  function scanProgramFeatures(program) {
    var usesPeripheralDefs = false;
    var usesLibrary = false;
    var usesTimerInterrupts = {0: false, 1: false, 2: false};
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
    if (program.interrupts) {
      for (var t = 2; t >= 0; t--) {
        var isr = program.interrupts['timer' + t];
        if (isr) {
          usesPeripheralDefs = true;
          usesTimerInterrupts[t] = true;
          timerControls[t].push({kind: 'timerIsr', timer: t, blockId: isr.blockId});
          if (isr.body && isr.body.length) {
            pending.push({list: isr.body, index: 0});
          }
        }
      }
    }
    if (program.loop && program.loop.length) {
      pending.push({list: program.loop, index: 0});
    }
    if (program.setup && program.setup.length) {
      pending.push({list: program.setup, index: 0});
    }
    while (pending.length) {
      var frame = pending[pending.length - 1];
      if (frame.index >= frame.list.length) {
        pending.pop();
        continue;
      }
      var node = frame.list[frame.index++];
      if (!node) continue;
      if (node.kind === 'pinMode' || node.kind === 'digitalWrite' ||
          node.kind === 'digitalToggle' || node.kind === 'digitalRead') {
        usesPeripheralDefs = true;
        gpioNodes.push(node);
      } else if (libraryNodeKinds[node.kind]) {
        usesPeripheralDefs = true;
        usesLibrary = true;
        if (node.kind === 'timer0Start') {
          usesTimerInterrupts[0] = true;
          timerControls[0].push(node);
        } else if (node.kind === 'timer1Start') {
          usesTimerInterrupts[1] = true;
          timerControls[1].push(node);
        } else if (node.kind === 'timer2Start') {
          usesTimerInterrupts[2] = true;
          timerControls[2].push(node);
        } else if (node.kind === 'pwmWrite') {
          var pwmPin = node.pinId == null ? 'PB2' : node.pinId;
          var cfg = pwmPinConfig[pwmPin];
          if (cfg) {
            pwmByTimer[cfg.timer].push(node);
            pwmPinsUsed[pwmPin] = cfg.timer;
            if (/^PD[0-7]$/.test(pwmPin)) {
              pwmPortdNodes.push(node);
            }
          }
        } else if (node.kind === 'lcdInit' || node.kind === 'lcdClear' ||
            node.kind === 'lcdCursor' || node.kind === 'lcdWriteChar' || node.kind === 'lcdWriteNumber') {
          usesLcd = true;
        } else if (node.kind === 'usartInit' || node.kind === 'usartTransmitChar' ||
            node.kind === 'usartTransmitNumber') {
          usesUsart = true;
        } else if (node.kind === 'display7Write' || node.kind === 'display7Off') {
          display7Nodes.push(node);
        }
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
        if (expr.kind === 'digitalRead') {
          usesPeripheralDefs = true;
          gpioNodes.push(expr);
        } else if (libraryNodeKinds[expr.kind]) {
          usesPeripheralDefs = true;
          usesLibrary = true;
          if (expr.kind === 'analogRead' && expr.channel >= 0 && expr.channel <= 5) {
            adcPins['PC' + expr.channel] = true;
          } else if (expr.kind === 'usartReceiveChar') {
            usesUsart = true;
          }
        }
        if (expr.address && typeof expr.address === 'object') exprPending.push(expr.address);
        if (expr.right) exprPending.push(expr.right);
        if (expr.left) exprPending.push(expr.left);
      }
      if (node.elseBody && node.elseBody.length) pending.push({list: node.elseBody, index: 0});
      if (node.thenBody && node.thenBody.length) pending.push({list: node.thenBody, index: 0});
      if (node.body && node.body.length) pending.push({list: node.body, index: 0});
    }
    var conflicts = [];
    for (var tm = 0; tm <= 2; tm++) {
      if (pwmByTimer[tm].length && timerControls[tm].length) {
        for (var i = 0; i < timerControls[tm].length; i++) {
          conflicts.push({
            code: 'TIMER' + tm + '_CONFLICT',
            message: 'O PWM no Timer' + tm + ' e a interrupção de overflow do Timer' + tm + ' compartilham o mesmo temporizador e não podem ser usados juntos.',
            blockId: timerControls[tm][i].blockId
          });
        }
      }
    }
    if (display7Nodes.length && (usesLcd || usesUsart)) {
      for (var d = 0; d < display7Nodes.length; d++) {
        conflicts.push({
          code: 'PORTD_CONFLICT',
          message: 'O display de 7 segmentos ocupa todo o PORTD (PD0 a PD7) e não pode ser usado junto com o display LCD ou a porta serial USART0.',
          blockId: display7Nodes[d].blockId
        });
      }
    }
    for (var p = 0; p < pwmPortdNodes.length; p++) {
      var pwmNode = pwmPortdNodes[p];
      var pwmPinId = pwmNode.pinId == null ? 'PB2' : pwmNode.pinId;
      if (display7Nodes.length) {
        conflicts.push({
          code: 'PIN_CONFLICT',
          message: 'O pino PWM ' + pwmPinId + ' já está em uso pelo display de 7 segmentos no PORTD.',
          blockId: pwmNode.blockId
        });
      } else if (usesLcd && /^PD[2-7]$/.test(pwmPinId)) {
        conflicts.push({
          code: 'PIN_CONFLICT',
          message: 'O pino PWM ' + pwmPinId + ' já está em uso pelo display LCD no PORTD.',
          blockId: pwmNode.blockId
        });
      }
    }
    for (var j = 0; j < gpioNodes.length; j++) {
      var g = gpioNodes[j];
      var pinId = g.pinId;
      if (Object.prototype.hasOwnProperty.call(pwmPinsUsed, pinId)) {
        conflicts.push({
          code: 'PIN_CONFLICT',
          message: 'O pino ' + pinId + ' já está em uso pelo PWM (Timer' + pwmPinsUsed[pinId] + ').',
          blockId: g.blockId
        });
      } else if (display7Nodes.length && /^PD[0-7]$/.test(pinId)) {
        conflicts.push({
          code: 'PIN_CONFLICT',
          message: 'O pino ' + pinId + ' já está em uso pelo display de 7 segmentos no PORTD.',
          blockId: g.blockId
        });
      } else if (usesUsart && (pinId === 'PD0' || pinId === 'PD1')) {
        conflicts.push({
          code: 'PIN_CONFLICT',
          message: 'O pino ' + pinId + ' já está em uso pela porta serial USART0.',
          blockId: g.blockId
        });
      } else if (usesLcd && /^PD[2-7]$/.test(pinId)) {
        conflicts.push({
          code: 'PIN_CONFLICT',
          message: 'O pino ' + pinId + ' já está em uso pelo display LCD no PORTD.',
          blockId: g.blockId
        });
      } else if (adcPins[pinId]) {
        conflicts.push({
          code: 'PIN_CONFLICT',
          message: 'O pino ' + pinId + ' já está em uso pela leitura analógica (ADC).',
          blockId: g.blockId
        });
      }
    }
    return {
      usesPeripheralDefs: usesPeripheralDefs,
      usesLibrary: usesLibrary,
      usesTimerInterrupts: usesTimerInterrupts,
      usesAnyTimerInterrupt: Boolean(usesTimerInterrupts[0] || usesTimerInterrupts[1] || usesTimerInterrupts[2]),
      conflicts: conflicts
    };
  }

  var LIB328P_V03_SOURCE = "; ============================================================================\n; Biblioteca didatica de sub-rotinas de perifericos para o ATmega328P (AVRASM2)\n; Arquivo: lib328Pv03.inc\n; Baseada na lib328Pv02 (revisao Marcos Chaves 19/11/2026)\n; Harmonizada com as convencoes de registradores do gerador Blockly AVRASM2:\n;   - R16 (aux): acumulador principal de expressoes do gerador\n;   - R17: reservado ao segundo operando aritmetico/comparacao do gerador\n;   - R18: reservado ao contador de repeticao contada (repeatCount) do gerador\n;   - R27 (lcd_col) e R28 (lcd_number): realocados para evitar conflito com R17/R18\n;   - Suporte a numeros de 8 bits (0 a 255) no LCD e na USART\n;   - Suporte a selecao de canal analogico ADC0 a ADC5 (PC0 a PC5)\n; ============================================================================\n\n.def delay_time        = r25\n.def display_number    = r24\n.def eeprom_address    = r23\n.def eeprom_number     = r22\n.def transmit_caracter = r21\n.def pwm_value         = r20\n.def lcd_caracter      = r19\n; r18 reservado ao contador de laco finito do gerador\n; r17 reservado ao segundo operando de expressoes do gerador\n.def aux               = r16\n.def receive_caracter  = r15\n.def adc_value         = r14\n.def lcd_col           = r27\n.def lcd_number        = r28\n\n.def unidades          = r0\n.def dezenas           = r1\n.def centenas          = r2\n\n.equ rs_lcd            = pd2\n.equ enable_lcd        = pd3\n\n    rjmp lib328p_after_subroutines\n\n; ### Sub-rotina de atraso em segundos (16 MHz) ###\ndelay_seconds:\n    ldi r31, 82\n    ldi r30, 0\n    ldi r29, 0\nloop_delay:\n    dec r29\n    brne loop_delay\n    dec r30\n    brne loop_delay\n    dec r31\n    brne loop_delay\n    dec delay_time\n    brne delay_seconds\n    ret\n\n; ### Sub-rotina de atraso em milissegundos (16 MHz) ###\ndelay_miliseconds:\n    ldi r30, 22\n    ldi r29, 0\nloop_delayms:\n    dec r29\n    brne loop_delayms\n    dec r30\n    brne loop_delayms\n    dec delay_time\n    brne delay_miliseconds\n    ret\n\n; ### Sub-rotina de atraso de 1 microssegundo (16 ciclos a 16 MHz) ###\ndelay_1microsecond:\n    nop\n    nop\n    nop\n    nop\n    nop\n    nop\n    nop\n    nop\n    nop\n    nop\n    nop\n    nop\n    nop\n    nop\n    nop\n    nop\n    ret\n\n; ### Sub-rotina para mostrar dezena e unidade em dois displays de 7 segmentos ###\n; Dezena: PD7..PD4 | Unidade: PD3..PD0\ndisplay_write:\n    ldi aux, 0b11111111\n    out DDRD, aux\n    ldi r30, 0\n    mov r31, display_number\n    cpi r31, 10\n    brlo display_show\ndisplay_loop:\n    subi r31, 10\n    inc r30\n    cpi r31, 10\n    brlo display_show\n    rjmp display_loop\ndisplay_show:\n    mov r29, r30\n    swap r29\n    or r29, r31\n    out PORTD, r29\n    ret\n\n; ### Sub-rotina para apagar o display de 7 segmentos ###\ndisplay_off:\n    ldi aux, 0b11111111\n    out DDRD, aux\n    ldi r30, 0b11111111\n    out PORTD, r30\n    ret\n\n; ### Sub-rotina para escrita na EEPROM ###\neeprom_write:\n    sbic EECR, EEPE\n    rjmp eeprom_write\n    out EEARL, eeprom_address\n    out EEDR, eeprom_number\n    sbi EECR, EEMPE\n    sbi EECR, EEPE\n    ret\n\n; ### Sub-rotina para leitura na EEPROM ###\neeprom_read:\n    sbic EECR, EEPE\n    rjmp eeprom_read\n    out EEARL, eeprom_address\n    sbi EECR, EERE\n    in eeprom_number, EEDR\n    ret\n\n; ### Sub-rotina de configuracao da USART em 9600 bps (16 MHz) ###\nusart_init:\n    ldi r30, 0\n    sts UBRR0H, r30\n    ldi r30, 103\n    sts UBRR0L, r30\n    ldi r30, 0b00011000\n    sts UCSR0B, r30\n    ret\n\n; ### Sub-rotina para transmissao de caractere pela USART ###\nusart_transmit:\n    lds r30, UCSR0A\n    sbrs r30, UDRE0\n    rjmp usart_transmit\n    sts UDR0, transmit_caracter\n    ret\n\n; ### Sub-rotina para recepcao de caractere pela USART ###\nusart_receive:\n    lds r30, UCSR0A\n    sbrs r30, RXC0\n    rjmp usart_receive\n    lds receive_caracter, UDR0\n    ret\n\n; ### Sub-rotina para transmissao de numero decimal (0 a 255) pela USART ###\n; Entrada: transmit_caracter (r21) -> Saida: 3 digitos ASCII pela USART\nusart_transmit_number:\n    clr centenas\n    clr dezenas\nconverter_centenas:\n    cpi transmit_caracter, 100\n    brlo converter_dezenas\n    subi transmit_caracter, 100\n    inc centenas\n    rjmp converter_centenas\nconverter_dezenas:\n    cpi transmit_caracter, 10\n    brlo converter_unidades\n    subi transmit_caracter, 10\n    inc dezenas\n    rjmp converter_dezenas\nconverter_unidades:\n    mov unidades, transmit_caracter\n    mov transmit_caracter, centenas\n    subi transmit_caracter, -48\n    rcall usart_transmit\n    mov transmit_caracter, dezenas\n    subi transmit_caracter, -48\n    rcall usart_transmit\n    mov transmit_caracter, unidades\n    subi transmit_caracter, -48\n    rcall usart_transmit\n    ret\n\n; ### Sub-rotina ADC de 8 bits no canal ADC0 (PC0 / A0) ###\nanalog_read:\n    ldi r16, 0\n; ### Sub-rotina ADC de 8 bits com selecao de canal (0 a 5 em R16) ###\nanalog_read_channel:\n    andi r16, 0x07\n    ori r16, 0b01100000\n    sts ADMUX, r16\n    ldi r30, 0b11000111\n    sts ADCSRA, r30\nloop_ad:\n    lds r30, ADCSRA\n    sbrc r30, ADSC\n    rjmp loop_ad\n    lds adc_value, ADCH\n    ret\n\n; ### Sub-rotina PWM de 8 bits (~976 Hz) no pino PD6 (D6 / OC0A - Timer0) ###\npwm_write_pd6:\n    sbi DDRD, PD6\n    in r30, TCCR0A\n    andi r30, 0b00110000\n    ori r30, 0b10000011\n    out TCCR0A, r30\n    out OCR0A, pwm_value\n    ldi r30, 0b00000011\n    out TCCR0B, r30\n    ret\n\n; ### Sub-rotina PWM de 8 bits (~976 Hz) no pino PD5 (D5 / OC0B - Timer0) ###\npwm_write_pd5:\n    sbi DDRD, PD5\n    in r30, TCCR0A\n    andi r30, 0b11000000\n    ori r30, 0b00100011\n    out TCCR0A, r30\n    out OCR0B, pwm_value\n    ldi r30, 0b00000011\n    out TCCR0B, r30\n    ret\n\n; ### Sub-rotina PWM de 8 bits (~976 Hz) no pino PB1 (D9 / OC1A - Timer1) ###\npwm_write_pb1:\n    sbi DDRB, PB1\n    lds r30, TCCR1A\n    andi r30, 0b00110000\n    ori r30, 0b10000001\n    sts TCCR1A, r30\n    ldi r30, 0\n    sts OCR1AH, r30\n    mov r30, pwm_value\n    sts OCR1AL, r30\n    ldi r30, 0b00001011\n    sts TCCR1B, r30\n    ret\n\n; ### Sub-rotina PWM de 8 bits (~976 Hz) no pino PB2 (D10 / OC1B - Timer1) ###\npwm_write:\npwm_write_pb2:\n    sbi DDRB, PB2\n    lds r30, TCCR1A\n    andi r30, 0b11000000\n    ori r30, 0b00100001\n    sts TCCR1A, r30\n    ldi r30, 0\n    sts OCR1BH, r30\n    mov r30, pwm_value\n    sts OCR1BL, r30\n    ldi r30, 0b00001011\n    sts TCCR1B, r30\n    ret\n\n; ### Sub-rotina PWM de 8 bits (~976 Hz) no pino PB3 (D11 / OC2A - Timer2) ###\npwm_write_pb3:\n    sbi DDRB, PB3\n    lds r30, TCCR2A\n    andi r30, 0b00110000\n    ori r30, 0b10000011\n    sts TCCR2A, r30\n    sts OCR2A, pwm_value\n    ldi r30, 0b00000100\n    sts TCCR2B, r30\n    ret\n\n; ### Sub-rotina PWM de 8 bits (~976 Hz) no pino PD3 (D3 / OC2B - Timer2) ###\npwm_write_pd3:\n    sbi DDRD, PD3\n    lds r30, TCCR2A\n    andi r30, 0b11000000\n    ori r30, 0b00100011\n    sts TCCR2A, r30\n    sts OCR2B, pwm_value\n    ldi r30, 0b00000100\n    sts TCCR2B, r30\n    ret\n\n; ### Sub-rotina Start Timer0 (8 bits, modo normal, prescaler 1024, overflow 10 ms) ###\nstart_timer0:\n    ldi r16, 0b01010000\n    out TCCR0A, r16\n    ldi r16, 0b00000001\n    sts TIMSK0, r16\n    ldi r16, 0b00000101\n    out TCCR0B, r16\n    ldi r16, 100\n    out TCNT0, r16\n    sei\n    ret\n\n; ### Sub-rotina Start Timer1 (16 bits, modo normal, prescaler 1024, overflow 1000 ms) ###\nstart_timer1:\n    ldi r16, 0b00000000\n    sts TCCR1A, r16\n    ldi r16, 0b00000101\n    sts TCCR1B, r16\n    ldi r16, 0b00000001\n    sts TIMSK1, r16\n    ldi r16, 0xC2\n    sts TCNT1H, r16\n    ldi r16, 0xF6\n    sts TCNT1L, r16\n    sei\n    ret\n\n; ### Sub-rotina Start Timer2 (8 bits, modo normal, prescaler 1024, overflow 10 ms) ###\nstart_timer2:\n    ldi r16, 0b00000000\n    sts TCCR2A, r16\n    ldi r16, 0b00000001\n    sts TIMSK2, r16\n    ldi r16, 0b00000111\n    sts TCCR2B, r16\n    ldi r16, 100\n    sts TCNT2, r16\n    sei\n    ret\n\n; ### Sub-rotina para inicializacao do LCD 16x2 no PORTD (modo 4 bits) ###\nlcd_init:\n    sbi DDRD, 2\n    sbi DDRD, 3\n    sbi DDRD, 4\n    sbi DDRD, 5\n    sbi DDRD, 6\n    sbi DDRD, 7\n    cbi PORTD, rs_lcd\n    cbi PORTD, enable_lcd\n    cbi PORTD, pd7\n    cbi PORTD, pd6\n    cbi PORTD, pd5\n    cbi PORTD, pd4\n    ldi delay_time, 15\n    rcall delay_miliseconds\n    cbi PORTD, pd7\n    cbi PORTD, pd6\n    sbi PORTD, pd5\n    sbi PORTD, pd4\n    rcall pulse_enable\n    ldi delay_time, 5\n    rcall delay_miliseconds\n    cbi PORTD, pd7\n    cbi PORTD, pd6\n    sbi PORTD, pd5\n    sbi PORTD, pd4\n    rcall pulse_enable\n    ldi delay_time, 5\n    rcall delay_miliseconds\n    cbi PORTD, pd7\n    cbi PORTD, pd6\n    sbi PORTD, pd5\n    sbi PORTD, pd4\n    rcall pulse_enable\n    ldi delay_time, 5\n    rcall delay_miliseconds\n    cbi PORTD, pd7\n    cbi PORTD, pd6\n    sbi PORTD, pd5\n    cbi PORTD, pd4\n    rcall pulse_enable\n    ldi delay_time, 1\n    rcall delay_miliseconds\n    ldi lcd_caracter, 0x28\n    rcall lcd_write_caracter\n    ldi lcd_caracter, 0x0C\n    rcall lcd_write_caracter\n    ldi lcd_caracter, 0x01\n    rcall lcd_write_caracter\n    ldi delay_time, 2\n    rcall delay_miliseconds\n    ldi lcd_caracter, 0x06\n    rcall lcd_write_caracter\n    sbi PORTD, rs_lcd\n    ret\n\n; ### Sub-rotina para limpar o LCD ###\nlcd_clear:\n    cbi PORTD, rs_lcd\n    ldi lcd_caracter, 1\n    rcall lcd_write_caracter\n    ldi delay_time, 2\n    rcall delay_miliseconds\n    sbi PORTD, rs_lcd\n    ret\n\n; ### Sub-rotina para escrever um caractere/comando de 8 bits no LCD (4 bits) ###\nlcd_write_caracter:\n    sbrc lcd_caracter, 7\n    sbi PORTD, pd7\n    sbrs lcd_caracter, 7\n    cbi PORTD, pd7\n    sbrc lcd_caracter, 6\n    sbi PORTD, pd6\n    sbrs lcd_caracter, 6\n    cbi PORTD, pd6\n    sbrc lcd_caracter, 5\n    sbi PORTD, pd5\n    sbrs lcd_caracter, 5\n    cbi PORTD, pd5\n    sbrc lcd_caracter, 4\n    sbi PORTD, pd4\n    sbrs lcd_caracter, 4\n    cbi PORTD, pd4\n    rcall pulse_enable\n    sbrc lcd_caracter, 3\n    sbi PORTD, pd7\n    sbrs lcd_caracter, 3\n    cbi PORTD, pd7\n    sbrc lcd_caracter, 2\n    sbi PORTD, pd6\n    sbrs lcd_caracter, 2\n    cbi PORTD, pd6\n    sbrc lcd_caracter, 1\n    sbi PORTD, pd5\n    sbrs lcd_caracter, 1\n    cbi PORTD, pd5\n    sbrc lcd_caracter, 0\n    sbi PORTD, pd4\n    sbrs lcd_caracter, 0\n    cbi PORTD, pd4\n    rcall pulse_enable\n    ret\n\n; ### Sub-rotina para gerar pulso de Enable no LCD e aguardar ~50 us ###\npulse_enable:\n    cbi PORTD, enable_lcd\n    rcall delay_1microsecond\n    sbi PORTD, enable_lcd\n    rcall delay_1microsecond\n    cbi PORTD, enable_lcd\n    ldi r26, 50\nloop_pulse:\n    rcall delay_1microsecond\n    dec r26\n    cpi r26, 0\n    brne loop_pulse\n    ret\n\n; ### Sub-rotina para posicionar cursor na linha 0 do LCD (coluna 0 a 15 em lcd_col) ###\nlcd_lin0_col:\n    cbi PORTD, rs_lcd\n    ldi r30, 0x80\n    add lcd_col, r30\n    mov lcd_caracter, lcd_col\n    rcall lcd_write_caracter\n    sbi PORTD, rs_lcd\n    ret\n\n; ### Sub-rotina para posicionar cursor na linha 1 do LCD (coluna 0 a 15 em lcd_col) ###\nlcd_lin1_col:\n    cbi PORTD, rs_lcd\n    ldi r30, 0xC0\n    add lcd_col, r30\n    mov lcd_caracter, lcd_col\n    rcall lcd_write_caracter\n    sbi PORTD, rs_lcd\n    ret\n\n; ### Sub-rotina para escrever um numero de 0 a 255 (3 digitos ASCII) no LCD ###\n; Entrada: lcd_number (r28)\nlcd_write_number:\n    clr centenas\n    clr dezenas\n    mov r30, lcd_number\nlcd_centenas:\n    cpi r30, 100\n    brlo lcd_dezenas\n    subi r30, 100\n    inc centenas\n    rjmp lcd_centenas\nlcd_dezenas:\n    cpi r30, 10\n    brlo lcd_unidades\n    subi r30, 10\n    inc dezenas\n    rjmp lcd_dezenas\nlcd_unidades:\n    mov unidades, r30\n    ldi r29, 48\n    add centenas, r29\n    add dezenas, r29\n    add unidades, r29\n    mov lcd_caracter, centenas\n    rcall lcd_write_caracter\n    mov lcd_caracter, dezenas\n    rcall lcd_write_caracter\n    mov lcd_caracter, unidades\n    rcall lcd_write_caracter\n    ret\n\nlib328p_after_subroutines:\n";

  // The bundled include contains instructions, labels, comments and symbol definitions.
  var libraryWords = 0;
  var delaySecondsOffset = 0;
  LIB328P_V03_SOURCE.split('\n').forEach(function (line) {
    if (line === 'delay_seconds:') {
      delaySecondsOffset = libraryWords;
    }
    var mnemonic = /^\s+([a-z][a-z0-9]*)(?:\s|$)/.exec(line);
    if (mnemonic) {
      libraryWords += instructionWidths[mnemonic[1]] || 1;
    }
  });

  function generate(program) {
    var lines = [];
    var instructionWords = 0;
    var delaySecondsWord = 0;
    var usesDelay = false;
    var result = emptyResult();
    var start = program.startBlockId;
    var loop = program.loopBlockId == null ? start : program.loopBlockId;
    var variables = program.variables || [];
    var variablesById = Object.create(null);
    var usedSymbols = Object.create(null);

    function emptyResult() {
      return {
        source: '',
        usesLibrary: false,
        libraryFileName: 'lib328Pv03.inc',
        librarySource: LIB328P_V03_SOURCE,
        lineMap: Object.create(null),
        lineBlockIds: [],
        explanations: [],
        diagnostics: []
      };
    }

    function report(code, message, blockId) {
      result.diagnostics.push({code: code, message: message, blockId: blockId});
    }

    function validateVariableReference(node) {
      if (typeof node.variableId !== 'string' || !variablesById[node.variableId]) {
        report('INVALID_VARIABLE', 'Selecione uma variável de 8 bits válida.', node.blockId);
      }
    }

    function validateExpression(expression, parentId) {
      var peak = 0;
      var pending = [{node: expression, parentId: parentId, saved: 0}];
      while (pending.length) {
        var frame = pending.pop();
        var node = frame.node;
        peak = Math.max(peak, frame.saved);
        if (!node) {
          report('MISSING_EXPRESSION', 'Conecte um valor de 8 bits a esta entrada.', frame.parentId);
          continue;
        }
        var blockId = node.blockId;
        switch (node.kind) {
          case 'literal':
            var value = node.value;
            if (typeof value !== 'number' || value !== Math.floor(value) || value < 0 || value > 255) {
              report('INVALID_LITERAL', 'Digite um número inteiro de 0 a 255.', blockId);
            }
            break;
          case 'variableRead':
            validateVariableReference(node);
            break;
          case 'compare':
          case 'add':
          case 'subtract':
            if (node.kind === 'compare' && (typeof node.operator !== 'string' ||
                !Object.prototype.hasOwnProperty.call(comparisons, node.operator))) {
              report('INVALID_COMPARISON', 'Selecione um operador de comparação válido.', blockId);
            }
            // Visit left first. Only the right subtree runs with a saved byte.
            pending.push({node: node.right, parentId: blockId, saved: frame.saved + 1});
            pending.push({node: node.left, parentId: blockId, saved: frame.saved});
            break;
          case 'digitalRead':
            var invalidRead = validateGpio(node);
            if (invalidRead) result.diagnostics.push(invalidRead);
            break;
          case 'analogRead':
            var ch = node.channel;
            if (typeof ch !== 'number' || ch !== Math.floor(ch) || ch < 0 || ch > 5) {
              report('INVALID_ANALOG_CHANNEL', 'Selecione um canal analógico válido de PC0 (A0) a PC5 (A5).', blockId);
            }
            peak = Math.max(peak, frame.saved + 2);
            break;
          case 'usartReceiveChar':
            peak = Math.max(peak, frame.saved + 2);
            break;
          case 'eepromRead':
            peak = Math.max(peak, frame.saved + 2);
            pending.push({node: node.address, parentId: blockId, saved: frame.saved});
            break;
          default:
            report('INVALID_EXPRESSION', 'Use um bloco AVR que forneça um valor de 8 bits.', blockId);
        }
      }
      return peak;
    }

    function validateStatements(statements) {
      var peak = 0;
      var pending = [];

      function pushBody(body, savedCounters) {
        pending.push({body: body, index: 0, savedCounters: savedCounters});
      }

      pushBody(statements, 0);
      while (pending.length) {
        var frame = pending[pending.length - 1];
        if (frame.index === frame.body.length) {
          pending.pop();
          continue;
        }
        var statement = frame.body[frame.index++];
        var blockId = statement.blockId;
        var savedCounters = frame.savedCounters;
        var spills = 0;
        switch (statement.kind) {
          case 'delayMs':
          case 'delaySeconds':
            var ms = statement.milliseconds;
            var seconds = statement.seconds;
            if (statement.kind === 'delaySeconds') {
              if (typeof seconds !== 'number' || seconds !== Math.floor(seconds) || seconds < 1 || seconds > 255) {
                report('INVALID_DELAY_SECONDS', 'Digite um atraso inteiro de 1 a 255 s.', blockId);
              }
            } else if (typeof ms !== 'number' || ms !== Math.floor(ms) || ms < 1 || ms > 1000) {
              report('INVALID_DELAY', 'Digite um atraso inteiro de 1 a 1000 ms.', blockId);
            }
            if (program.clockHz !== 16000000) {
              report('INVALID_DELAY_CLOCK', 'A rotina de atraso exige um clock de 16 MHz.', blockId);
            }
            spills = 2; // CALL and RCALL save a two-byte return address on the ATmega328P.
            break;
          case 'assign':
            validateVariableReference(statement);
            spills = validateExpression(statement.value, blockId);
            break;
          case 'if':
            spills = validateExpression(statement.condition, blockId);
            if (statement.elseBody) {
              pushBody(statement.elseBody, savedCounters);
            }
            pushBody(statement.thenBody, savedCounters);
            break;
          case 'repeatCount':
            // The saved counter is live during the body, after evaluating the count.
            spills = validateExpression(statement.count, blockId);
            peak = Math.max(peak, savedCounters + 1);
            pushBody(statement.body, savedCounters + 1);
            break;
          case 'pwmWrite':
            var pwmPinVal = statement.pinId == null ? 'PB2' : statement.pinId;
            if (!Object.prototype.hasOwnProperty.call(pwmPinConfig, pwmPinVal)) {
              report('INVALID_PWM_PIN', 'Selecione um pino PWM válido (PB2, PB1, PD6, PD5, PB3 ou PD3).', blockId);
            }
            spills = Math.max(validateExpression(statement.value, blockId), 2);
            break;
          case 'timer0Start':
          case 'timer1Start':
          case 'timer2Start':
          case 'usartInit':
            spills = 2;
            break;
          case 'lcdInit':
          case 'lcdClear':
            spills = 8;
            break;
          case 'lcdCursor':
            if (statement.row !== 0 && statement.row !== 1) {
              report('INVALID_LCD_ROW', 'Selecione a linha 0 ou a linha 1 do display LCD.', blockId);
            }
            spills = Math.max(validateExpression(statement.col, blockId), 8);
            break;
          case 'lcdWriteChar':
          case 'usartTransmitChar':
            var chCode = statement.value;
            if (typeof chCode !== 'number' || chCode !== Math.floor(chCode) || chCode < 32 || chCode > 126) {
              report('INVALID_ASCII_CHAR', 'Digite exatamente um caractere ASCII imprimível.', blockId);
            }
            spills = statement.kind === 'lcdWriteChar' ? 8 : 2;
            break;
          case 'lcdWriteNumber':
            spills = Math.max(validateExpression(statement.value, blockId), 8);
            break;
          case 'usartTransmitNumber':
            spills = Math.max(validateExpression(statement.value, blockId), 4);
            break;
          case 'display7Write':
            spills = Math.max(validateExpression(statement.value, blockId), 2);
            break;
          case 'display7Off':
            spills = 2;
            break;
          case 'eepromWrite':
            spills = Math.max(
              validateExpression(statement.address, blockId),
              1 + validateExpression(statement.value, blockId),
              2
            );
            break;
          default:
            var invalidGpio = validateGpio(statement);
            if (invalidGpio) {
              result.diagnostics.push(invalidGpio);
            }
            break;
        }
        peak = Math.max(peak, savedCounters + spills);
      }
      return peak;
    }

    function emit(text, blockId, explanation) {
      var line = lines.push(text);
      // Ranges can enclose child blocks. Keep the exact owner of comments and labels too.
      result.lineBlockIds.push(blockId == null ? null : blockId);
      if (blockId != null) {
        var range = result.lineMap[blockId];
        if (range) {
          range.end = line;
        } else {
          result.lineMap[blockId] = {start: line, end: line};
        }
      }
      if (explanation) {
        explanation.line = line;
        explanation.blockId = blockId;
        result.explanations.push(explanation);
      }
    }

    function instruction(blockId, mnemonic, operands, summary, effects, repetitions) {
      var args = operands.length ? ' ' + operands.join(', ') : '';
      instructionWords += (instructionWidths[mnemonic] || 1) * (repetitions || 1);
      emit('    ' + mnemonic + args, blockId, {
        mnemonic: mnemonic, operands: operands, summary: summary, effects: effects
      });
    }

    function emitLoopBack(blockId, label, targetWord) {
      // RJMP measures the displacement from the word after the jump.
      var displacement = targetWord - (instructionWords + 1);
      if (displacement >= -2048) {
        instruction(blockId, 'rjmp', [label], 'Volta ao início do laço.',
          'O PC volta a ' + label + ' para iniciar a próxima repetição.');
      } else {
        instruction(blockId, 'jmp', [label], 'Volta ao início do laço com um salto absoluto.',
          'O PC recebe o endereço absoluto de ' + label + ' para iniciar a próxima repetição.');
      }
    }

    function bitInstruction(blockId, set, register, bit, summary, effects) {
      instruction(blockId, set ? 'sbi' : 'cbi', [register, bit],
        summary, effects);
    }

    function emitPinMode(statement, pin) {
      var output = statement.mode === 'output';
      var pullup = statement.mode === 'inputPullup';
      var mode = output ? 'saída' : 'entrada';
      var directionBit = 'DD' + pin.port + pin.bit;
      var portBit = pin.portRegister + pin.bit;
      emit('; Configurar ' + pin.id + ' como ' + mode + (pullup ? ' com pull-up' : ''), statement.blockId);
      bitInstruction(statement.blockId, output, pin.ddr, directionBit,
        'Configura ' + pin.id + ' como ' + mode + ' pelo registrador de direção.',
        pin.ddr + ': o bit ' + directionBit + ' recebe ' + (output ? '1.' : '0.'));
      if (!output) {
        bitInstruction(statement.blockId, pullup, pin.portRegister, portBit,
          (pullup ? 'Ativa' : 'Desativa') + ' o pull-up interno de ' + pin.id + '.',
          pin.portRegister + ': o bit ' + portBit + ' recebe ' + (pullup ? '1.' : '0.'));
      }
    }

    function emitDigitalWrite(statement, pin) {
      var high = statement.value === 1;
      var level = high ? 'alto' : 'baixo';
      var bit = pin.portRegister + pin.bit;
      emit('; Definir saída ' + pin.id + ' em nível ' + level, statement.blockId);
      bitInstruction(statement.blockId, high, pin.portRegister, bit,
        'Define o nível ' + level + ' de ' + pin.id + ' quando o pino está em modo de saída.',
        pin.portRegister + ': o bit ' + bit + ' recebe ' + statement.value + '.');
    }

    function emitDigitalToggle(statement, pin) {
      var id = statement.blockId;
      var outputBit = pin.portRegister + pin.bit;
      var setHigh = localLabel('toggle_high', id);
      var done = localLabel('toggle_done', id);
      emit('; Alternar saída ' + pin.id, id);
      instruction(id, 'sbis', [pin.portRegister, outputBit], 'Testa o estado atual do bit de saída.',
        'Se ' + outputBit + ' em ' + pin.portRegister + ' vale 1, o PC pula o próximo RJMP.');
      instruction(id, 'rjmp', [setHigh], 'Segue para a escrita de nível alto se o bit estava em 0.',
        'O PC salta para ' + setHigh + '.');
      bitInstruction(id, false, pin.portRegister, outputBit,
        'Inverte o nível alto para baixo.', 'Somente ' + outputBit + ' recebe 0.');
      instruction(id, 'rjmp', [done], 'Conclui a alternância depois de escrever 0.',
        'O PC salta para ' + done + '.');
      emit(setHigh + ':', id);
      bitInstruction(id, true, pin.portRegister, outputBit,
        'Inverte o nível baixo para alto.', 'Somente ' + outputBit + ' recebe 1.');
      emit(done + ':', id);
    }

    function emitDigitalRead(expression) {
      var blockId = expression.blockId;
      var pin = pins.get(expression.pinId);
      var bit = pin.pinRegister + pin.bit;
      var done = localLabel('gpio_read', blockId);
      emit('; Ler entrada digital ' + pin.id + ' como 0 ou 1 em R16', blockId);
      instruction(blockId, 'in', ['r16', pin.pinRegister],
        'Lê os níveis dos pinos da porta ' + pin.port + '.',
        'R16 recebe o byte do registrador de entrada ' + pin.pinRegister + '.');
      instruction(blockId, 'andi', ['r16', '(1 << ' + bit + ')'],
        'Isola o bit ' + bit + ' e zera os outros bits.',
        'R16 mantém apenas o bit de ' + pin.id + '. Em SREG, Z indica se o resultado é zero.');
      instruction(blockId, 'breq', [done], 'Pula a conversão para 1 quando a leitura é baixa.',
        'Se Z vale 1, o PC salta para o fim da leitura e R16 mantém 0.');
      instruction(blockId, 'ldi', ['r16', '1'], 'Representa o nível alto como o valor 1.',
        'R16 recebe 1 sem alterar as flags em SREG.');
      emit(done + ':', blockId);
    }

    function saveLeftOperand(blockId) {
      emit('; Preservar o primeiro operando enquanto o segundo usa R16.', blockId);
      instruction(blockId, 'push', ['r16'], 'Guarda o primeiro operando na pilha.',
        'O byte da pilha na SRAM em SP recebe R16. Em seguida, SP diminui em 1.');
    }

    function restoreOperands(blockId) {
      instruction(blockId, 'mov', ['r17', 'r16'], 'Mantém o segundo operando em R17.',
        'R17 recebe R16 sem alterar SREG.');
      emit('; Recuperar o primeiro operando e liberar seu byte na pilha.', blockId);
      instruction(blockId, 'pop', ['r16'], 'Restaura o primeiro operando da pilha.',
        'SP aumenta em 1 e R16 recebe o byte da pilha nesse endereço da SRAM.');
    }

    function emitArithmetic(expression) {
      var blockId = expression.blockId;
      var addition = expression.kind === 'add';
      var operator = addition ? '+' : '−';
      instruction(blockId, addition ? 'add' : 'sub', ['r16', 'r17'],
        addition ? 'Soma os dois operandos.' : 'Subtrai o segundo operando do primeiro.',
        'R16 recebe (R16 ' + operator + ' R17) módulo 256. SREG atualiza H, S, V, N, Z e C.');
    }

    function emitCompare(expression) {
      var blockId = expression.blockId;
      var comparison = comparisons[expression.operator];
      var relation = 'esquerda ' + comparison.symbol + ' direita';
      var done = localLabel('compare_end', blockId);
      instruction(blockId, 'cp', comparison.reversed ? ['r17', 'r16'] : ['r16', 'r17'],
        comparison.reversed ? 'Compara o operando direito com o esquerdo.' :
          'Compara o operando esquerdo com o direito.',
        'Atualiza SREG sem guardar a subtração. Z vale 1 se os operandos são iguais. ' +
          'C vale 1 se o primeiro registrador é menor que o segundo na comparação sem sinal.');
      instruction(blockId, 'ldi', ['r16', '1'], 'Prepara o resultado verdadeiro.',
        'R16 recebe 1 e mantém as flags da comparação em SREG.');
      emit('; ' + comparison.branch.toUpperCase() + ' mantém 1 quando ' + comparison.flag + '.', blockId);
      instruction(blockId, comparison.branch, [done], 'Salta se ' + relation + ' for verdadeiro.',
        'Quando ' + comparison.flag + ', o PC salta para o fim e R16 mantém 1.');
      instruction(blockId, 'ldi', ['r16', '0'], 'Representa a condição falsa como zero.',
        'R16 recebe 0 sem alterar SREG.');
      emit(done + ':', blockId);
    }

    function emitExpression(expression) {
      var pending = [{node: expression, step: 'visit'}];
      while (pending.length) {
        var frame = pending.pop();
        var node = frame.node;
        var blockId = node.blockId;
        if (frame.step === 'save') {
          saveLeftOperand(blockId);
          continue;
        }
        if (frame.step === 'combine') {
          restoreOperands(blockId);
          if (node.kind === 'compare') emitCompare(node);
          else emitArithmetic(node);
          continue;
        }
        if (frame.step === 'finishEepromRead') {
          instruction(blockId, 'mov', ['eeprom_address', 'r16'],
            'Define o endereço de leitura da EEPROM.',
            'eeprom_address (R23) recebe o endereço calculado em R16.');
          instruction(blockId, 'rcall', ['eeprom_read'],
            'Lê o byte armazenado na EEPROM.',
            'Aguarda EEPE=0, configura EEARL com eeprom_address, aciona EERE e carrega EEDR em eeprom_number (R22).');
          instruction(blockId, 'mov', ['r16', 'eeprom_number'],
            'Copia o byte lido da EEPROM para R16.',
            'R16 recebe eeprom_number (R22) sem alterar SREG.');
          continue;
        }
        switch (node.kind) {
          case 'literal':
            emit('; Valor de 8 bits ' + node.value, blockId);
            instruction(blockId, 'ldi', ['r16', String(node.value)], 'Carrega o valor imediato.',
              'R16 recebe ' + node.value + ' sem alterar SREG.');
            break;
          case 'variableRead':
            var variable = variablesById[node.variableId];
            emit('; Ler a variável ' + variable.symbol, blockId);
            instruction(blockId, 'lds', ['r16', variable.symbol], 'Lê a variável ' + variable.label + ' na SRAM.',
              'R16 recebe o byte da SRAM em ' + variable.symbol + ' sem alterar SREG.');
            break;
          case 'add':
          case 'subtract':
          case 'compare':
            if (node.kind === 'compare') {
              emit('; Comparar valores de 8 bits sem sinal: esquerda ' + comparisons[node.operator].symbol +
                ' direita', blockId);
            } else {
              emit('; ' + (node.kind === 'add' ? 'Somar' : 'Subtrair') +
                ' valores de 8 bits sem sinal (módulo 256)', blockId);
            }
            pending.push({node: node, step: 'combine'}, {node: node.right, step: 'visit'},
              {node: node, step: 'save'}, {node: node.left, step: 'visit'});
            break;
          case 'digitalRead':
            emitDigitalRead(node);
            break;
          case 'analogRead':
            var channelLabel = 'PC' + node.channel + ' (A' + node.channel + ')';
            emit('; Ler entrada analógica ' + channelLabel + ' em 8 bits (0 a 255)', blockId);
            if (node.channel === 0) {
              instruction(blockId, 'rcall', ['analog_read'],
                'Converte o canal analógico PC0 (A0) em 8 bits.',
                'Realiza a conversão A/D no canal 0 e guarda o valor de 0 a 255 em adc_value (R14).');
            } else {
              instruction(blockId, 'ldi', ['r16', String(node.channel)],
                'Seleciona o canal analógico ' + channelLabel + '.',
                'R16 recebe o número do canal ' + node.channel + ' sem alterar SREG.');
              instruction(blockId, 'rcall', ['analog_read_channel'],
                'Converte o canal analógico ' + channelLabel + ' em 8 bits.',
                'Realiza a conversão A/D no canal ' + node.channel + ' e guarda o valor de 0 a 255 em adc_value (R14).');
            }
            instruction(blockId, 'mov', ['r16', 'adc_value'],
              'Copia o resultado da conversão A/D para R16.',
              'R16 recebe o byte lido em adc_value (R14) sem alterar SREG.');
            break;
          case 'usartReceiveChar':
            emit('; Receber caractere pela porta serial em R16', blockId);
            instruction(blockId, 'rcall', ['usart_receive'],
              'Aguarda e lê um byte recebido pela USART0.',
              'Espera o bit RXC0 em UCSR0A e carrega o byte de UDR0 em receive_caracter (R15).');
            instruction(blockId, 'mov', ['r16', 'receive_caracter'],
              'Copia o caractere recebido para R16.',
              'R16 recebe o byte de receive_caracter (R15) sem alterar SREG.');
            break;
          case 'eepromRead':
            emit('; Ler byte da EEPROM em R16', blockId);
            pending.push({node: node, step: 'finishEepromRead'}, {node: node.address, step: 'visit'});
            break;
        }
      }
    }

    function emitIf(statement, pushBody) {
      var blockId = statement.blockId;
      var then = localLabel('if_then', blockId);
      var done = localLabel('if_end', blockId);
      var elseBody = statement.elseBody;
      var otherwise = elseBody ? localLabel('if_else', blockId) : done;
      emit('; Se a condição for diferente de zero', blockId);
      emitExpression(statement.condition);
      instruction(blockId, 'tst', ['r16'], 'Testa se o valor da condição é zero.',
        'Em SREG, Z vale 1 quando R16 é zero. R16 conserva o valor da condição.');
      // The conditional branch only skips the jump, regardless of body length.
      instruction(blockId, 'brne', [then], 'Desvia para o ramo “então” se a condição for verdadeira.',
        'Se Z vale 0, o PC salta para o início do ramo “então”.');
      instruction(blockId, 'jmp', [otherwise], 'Segue o caminho da condição falsa.',
        'O PC recebe o endereço absoluto ' + (elseBody ? 'do ramo “senão”.' : 'do fim do bloco.'));
      emit(then + ':', blockId);

      function finishIf() {
        emit(done + ':', blockId);
      }

      pushBody(statement.thenBody, elseBody ? function () {
        instruction(blockId, 'jmp', [done], 'Pula o ramo “senão” após executar o ramo “então”.',
          'O PC recebe o endereço absoluto do fim do bloco.');
        emit(otherwise + ':', blockId);
        pushBody(elseBody, finishIf);
      } : finishIf);
    }

    function emitRepeatCount(statement, pushBody) {
      var blockId = statement.blockId;
      var begin = localLabel('repeat_begin', blockId);
      var body = localLabel('repeat_body', blockId);
      var done = localLabel('repeat_end', blockId);
      emit('; Avaliar a contagem uma vez ao entrar no laço', blockId);
      emitExpression(statement.count);
      instruction(blockId, 'tst', ['r16'], 'Verifica se o corpo deve ser executado.',
        'Em SREG, Z vale 1 quando a contagem em R16 é zero.');
      instruction(blockId, 'brne', [begin], 'Entra no laço se a contagem for maior que zero.',
        'Se Z vale 0, o PC salta sobre o JMP e chega à inicialização do contador.');
      instruction(blockId, 'jmp', [done], 'Pula o corpo quando a contagem é zero.',
        'O PC recebe o endereço absoluto do fim do laço.');
      emit(begin + ':', blockId);
      instruction(blockId, 'mov', ['r18', 'r16'], 'Inicializa o contador de repetições.',
        'R18 recebe a contagem calculada em R16 sem alterar SREG.');
      emit(body + ':', blockId);
      var bodyWord = instructionWords;
      emit('; Salvar o contador deste laço antes de executar o corpo.', blockId);
      instruction(blockId, 'push', ['r18'], 'Preserva o contador enquanto laços internos usam R18.',
        'O byte da pilha na SRAM em SP recebe R18. Em seguida, SP diminui em 1.');
      pushBody(statement.body, function () {
        emit('; Recuperar o contador deste laço antes de decrementá-lo.', blockId);
        instruction(blockId, 'pop', ['r18'], 'Recupera o contador salvo antes da execução do corpo.',
          'SP aumenta em 1 e R18 recebe o byte da pilha nesse endereço da SRAM.');
        instruction(blockId, 'dec', ['r18'], 'Desconta a repetição concluída do contador.',
          'R18 diminui em 1. Em SREG, Z vale 1 quando não restam repetições.');
        instruction(blockId, 'breq', [done], 'Termina o laço quando o contador chega a zero.',
          'Se Z vale 1, o PC salta sobre a instrução que volta ao corpo.');
        emitLoopBack(blockId, body, bodyWord);
        emit(done + ':', blockId);
      });
    }

    function emitDelay(statement) {
      var ms = statement.milliseconds;
      var id = statement.blockId;
      usesDelay = true;
      emit('; Aguardar aproximadamente ' + ms + ' ms a 16 MHz', id);
      instruction(id, 'ldi', ['r24', 'LOW(' + ms + ')'], 'Carrega o byte baixo da duração.',
        'R24 recebe ' + (ms & 255) + ' sem alterar SREG.');
      instruction(id, 'ldi', ['r25', 'HIGH(' + ms + ')'], 'Carrega o byte alto da duração.',
        'R25 recebe ' + (ms >> 8) + '. O par R25:R24 contém a duração em milissegundos.');
      instruction(id, 'call', ['avr_delay_ms'], 'Chama a rotina de espera a 16 MHz.',
        'A pilha recebe os dois bytes do endereço de retorno, SP diminui em 2 e o PC aponta para avr_delay_ms.');
    }

    function emitDelaySeconds(statement) {
      var seconds = statement.seconds;
      var id = statement.blockId;
      emit('; Aguardar aproximadamente ' + seconds + ' s a 16 MHz', id);
      instruction(id, 'ldi', ['delay_time', String(seconds)], 'Carrega a duração da espera em segundos.',
        'delay_time (R25) recebe ' + seconds + ' sem alterar SREG.');
      var displacement = delaySecondsWord - (instructionWords + 1);
      instruction(id, displacement >= -2048 ? 'rcall' : 'call', ['delay_seconds'],
        'Chama a rotina de espera em segundos da biblioteca a 16 MHz.',
        'A chamada empilha dois bytes de retorno. A rotina usa R25 e R29 a R31 como contadores e altera as flags de SREG.');
    }

    function emitDelayHelper() {
      emit('');
      emit('; Espera ocupada para 16 MHz (AVRASM2), com interrupções desativadas.');
      emit('; R25:R24 conta os ms e R27:R26 conta as voltas. Os dois pares terminam em zero.');
      emit('; SBIW altera Z, C, N, V e S em SREG. Os demais registradores são preservados.');
      emit('; Apenas o endereço de retorno ocupa a pilha (2 bytes). RET restaura SP.');
      emit('; Um ms corresponde a 16000 ciclos. As 3999 voltas internas gastam 15995 ciclos.');
      emit('; Com cargas, CALL e RET, o bloco leva 16001 × ms + 9 ciclos. O atraso é aproximado.');
      emit('avr_delay_ms:');
      emit('L_delay_ms_outer:');
      instruction(null, 'ldi', ['r26', 'LOW(3999)'], 'Inicia a contagem interna de um milissegundo.',
        'R26 recebe o byte baixo de 3999 em um ciclo.');
      instruction(null, 'ldi', ['r27', 'HIGH(3999)'], 'Completa a contagem interna.',
        'R27 recebe o byte alto de 3999 em um ciclo. R27:R26 contém 3999.');
      emit('L_delay_ms_inner:');
      instruction(null, 'sbiw', ['r26', '1'], 'Desconta uma volta do laço interno.',
        'R27:R26 diminui em 1 em dois ciclos. Z vale 1 quando o par chega a zero.');
      instruction(null, 'brne', ['L_delay_ms_inner'], 'Repete até o contador interno chegar a zero.',
        'Com Z igual a 0, o salto custa dois ciclos. Na última volta, Z vale 1 e a instrução custa um ciclo.');
      instruction(null, 'sbiw', ['r24', '1'], 'Desconta um milissegundo da duração pedida.',
        'R25:R24 diminui em 1 em dois ciclos. Z indica se a duração restante é zero.');
      instruction(null, 'brne', ['L_delay_ms_outer'], 'Recarrega o contador interno se ainda houver tempo.',
        'Com Z igual a 0, o salto custa dois ciclos. Com Z igual a 1, segue para RET em um ciclo.');
      instruction(null, 'ret', [], 'Continua após a chamada de atraso.',
        'Em quatro ciclos, o PC recupera o endereço de retorno da pilha e SP aumenta em 2.');
    }

    function scanIsrRegisters(statements) {
      var usesR17 = false;
      var usesR18 = false;
      var usesLib = false;
      var usesDelayMs = false;
      var pending = [];
      if (statements && statements.length) {
        pending.push({list: statements, index: 0});
      }
      while (pending.length) {
        var frame = pending[pending.length - 1];
        if (frame.index >= frame.list.length) {
          pending.pop();
          continue;
        }
        var node = frame.list[frame.index++];
        if (!node) continue;
        if (node.kind === 'repeatCount') {
          usesR18 = true;
        }
        if (node.kind === 'delayMs') {
          usesDelayMs = true;
        }
        if (libraryNodeKinds[node.kind]) {
          usesLib = true;
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
          if (expr.kind === 'add' || expr.kind === 'subtract' || expr.kind === 'compare') {
            usesR17 = true;
          }
          if (libraryNodeKinds[expr.kind]) {
            usesLib = true;
          }
          if (expr.address && typeof expr.address === 'object') exprPending.push(expr.address);
          if (expr.right) exprPending.push(expr.right);
          if (expr.left) exprPending.push(expr.left);
        }
        if (node.elseBody && node.elseBody.length) pending.push({list: node.elseBody, index: 0});
        if (node.thenBody && node.thenBody.length) pending.push({list: node.thenBody, index: 0});
        if (node.body && node.body.length) pending.push({list: node.body, index: 0});
      }
      var delayRegisters = usesDelayMs ? ['r24', 'r25', 'r26', 'r27'] : usesLib ? ['delay_time'] : [];
      return {
        usesR17: usesR17,
        usesR18: usesR18,
        usesLib: usesLib,
        delayRegisters: delayRegisters,
        frameBytes: 4 + (usesR17 ? 1 : 0) + (usesR18 ? 1 : 0) + (usesLib ? 3 : 0) + delayRegisters.length
      };
    }

    function emitTimerIsr(timerNum, isrConfig) {
      var blockId = isrConfig && isrConfig.blockId != null ? isrConfig.blockId : null;
      var body = isrConfig && isrConfig.body ? isrConfig.body : [];
      var regs = scanIsrRegisters(body);
      var label = 'TIM' + timerNum + '_OVERFLOW';
      var comment = timerNum === 0 ?
        '; Rotina de interrupção de estouro do Timer0 (10 ms · vetor 0x0020)' :
        timerNum === 1 ?
        '; Rotina de interrupção de estouro do Timer1 (1000 ms · vetor 0x001A)' :
        '; Rotina de interrupção de estouro do Timer2 (10 ms · vetor 0x0012)';
      emit('');
      emit(comment, blockId);
      emit(label + ':', blockId);
      instruction(blockId, 'push', ['r16'],
        'Salva R16 na pilha ao entrar na interrupção.',
        'A pilha recebe R16 e SP diminui em 1.');
      instruction(blockId, 'in', ['r16', 'SREG'],
        'Copia o registrador de status SREG para R16.',
        'R16 recebe as flags atuais de SREG.');
      instruction(blockId, 'push', ['r16'],
        'Preserva SREG na pilha durante a interrupção.',
        'A pilha recebe a cópia de SREG e SP diminui em 1.');
      if (regs.usesR17) {
        instruction(blockId, 'push', ['r17'],
          'Salva R17 na pilha durante a interrupção.',
          'A pilha recebe R17 e SP diminui em 1.');
      }
      if (regs.usesR18) {
        instruction(blockId, 'push', ['r18'],
          'Salva R18 na pilha durante a interrupção.',
          'A pilha recebe R18 e SP diminui em 1.');
      }
      function delayRegisterName(register) {
        return register === 'delay_time' ? 'R25 (delay_time)' : register.toUpperCase();
      }
      regs.delayRegisters.forEach(function (register) {
        var name = delayRegisterName(register);
        instruction(blockId, 'push', [register], 'Salva ' + name + ' na pilha durante a interrupção.',
          'A pilha recebe ' + name + ' e SP diminui em 1.');
      });
      if (regs.usesLib) {
        instruction(blockId, 'push', ['r29'],
          'Salva R29 na pilha durante a interrupção.',
          'A pilha recebe R29 e SP diminui em 1.');
        instruction(blockId, 'push', ['r30'],
          'Salva R30 na pilha durante a interrupção.',
          'A pilha recebe R30 e SP diminui em 1.');
        instruction(blockId, 'push', ['r31'],
          'Salva R31 na pilha durante a interrupção.',
          'A pilha recebe R31 e SP diminui em 1.');
      }
      if (timerNum === 0) {
        instruction(blockId, 'ldi', ['r16', '100'],
          'Carrega o valor inicial 100 para recarga de 10 ms do Timer0.',
          'R16 recebe 100 (256 - 156 contagens a 16 MHz com prescaler 1024).');
        instruction(blockId, 'out', ['TCNT0', 'r16'],
          'Recarrega o contador TCNT0 para o próximo ciclo de 10 ms.',
          'TCNT0 recebe 100.');
      } else if (timerNum === 1) {
        instruction(blockId, 'ldi', ['r16', '0xC2'],
          'Carrega o byte alto (0xC2) da recarga de 1000 ms do Timer1.',
          'R16 recebe 0xC2.');
        instruction(blockId, 'sts', ['TCNT1H', 'r16'],
          'Recarrega o byte alto TCNT1H do Timer1.',
          'TCNT1H recebe 0xC2 no buffer temporário de 16 bits.');
        instruction(blockId, 'ldi', ['r16', '0xF6'],
          'Carrega o byte baixo (0xF6) da recarga de 1000 ms do Timer1.',
          'R16 recebe 0xF6 (65536 - 15625 contagens a 16 MHz com prescaler 1024).');
        instruction(blockId, 'sts', ['TCNT1L', 'r16'],
          'Recarrega o byte baixo TCNT1L etransfere o par de 16 bits para TCNT1.',
          'TCNT1H:TCNT1L recebe 0xC2F6 para o próximo ciclo de 1 segundo.');
      } else {
        instruction(blockId, 'ldi', ['r16', '100'],
          'Carrega o valor inicial 100 para recarga de 10 ms do Timer2.',
          'R16 recebe 100 (256 - 156 contagens a 16 MHz com prescaler 1024).');
        instruction(blockId, 'sts', ['TCNT2', 'r16'],
          'Recarrega o contador TCNT2 para o próximo ciclo de 10 ms.',
          'TCNT2 recebe 100.');
      }
      if (body.length) {
        emitStatements(body);
      }
      if (regs.usesLib) {
        instruction(blockId, 'pop', ['r31'],
          'Restaura R31 da pilha.',
          'SP aumenta em 1 e R31 recupera seu valor anterior.');
        instruction(blockId, 'pop', ['r30'],
          'Restaura R30 da pilha.',
          'SP aumenta em 1 e R30 recupera seu valor anterior.');
        instruction(blockId, 'pop', ['r29'],
          'Restaura R29 da pilha.',
          'SP aumenta em 1 e R29 recupera seu valor anterior.');
      }
      for (var i = regs.delayRegisters.length - 1; i >= 0; i--) {
        var register = regs.delayRegisters[i];
        var name = delayRegisterName(register);
        instruction(blockId, 'pop', [register], 'Restaura ' + name + ' da pilha.',
          'SP aumenta em 1 e ' + name + ' recupera seu valor anterior.');
      }
      if (regs.usesR18) {
        instruction(blockId, 'pop', ['r18'],
          'Restaura R18 da pilha.',
          'SP aumenta em 1 e R18 recupera seu valor anterior.');
      }
      if (regs.usesR17) {
        instruction(blockId, 'pop', ['r17'],
          'Restaura R17 da pilha.',
          'SP aumenta em 1 e R17 recupera seu valor anterior.');
      }
      instruction(blockId, 'pop', ['r16'],
        'Recupera o valor original de SREG da pilha.',
        'SP aumenta em 1 e R16 recebe o byte salvo de SREG.');
      instruction(blockId, 'out', ['SREG', 'r16'],
        'Restaura as flags originais em SREG.',
        'SREG volta ao estado anterior à interrupção.');
      instruction(blockId, 'pop', ['r16'],
        'Restaura o valor original de R16 da pilha.',
        'SP aumenta em 1 e R16 recupera seu valor anterior à interrupção.');
      instruction(blockId, 'reti', [],
        'Retorna da interrupção do Timer' + timerNum + ' e reabilita interrupções globais.',
        'O PC recupera o endereço de retorno da pilha (SP aumenta em 2) e o bit I de SREG volta a 1.');
    }

    function emitStatement(statement, pushBody) {
      switch (statement.kind) {
        case 'delayMs':
          emitDelay(statement);
          break;
        case 'delaySeconds':
          emitDelaySeconds(statement);
          break;
        case 'pinMode':
          emitPinMode(statement, pins.get(statement.pinId));
          break;
        case 'digitalWrite':
          emitDigitalWrite(statement, pins.get(statement.pinId));
          break;
        case 'digitalToggle':
          emitDigitalToggle(statement, pins.get(statement.pinId));
          break;
        case 'digitalRead':
          emitExpression(statement);
          break;
        case 'assign':
          var variable = variablesById[statement.variableId];
          emit('; Atribuir um valor à variável ' + variable.symbol, statement.blockId);
          emitExpression(statement.value);
          instruction(statement.blockId, 'sts', [variable.symbol, 'r16'],
            'Grava o valor na variável ' + variable.label + '.',
            'O byte da SRAM em ' + variable.symbol + ' recebe R16 sem alterar SREG.');
          break;
        case 'if':
          emitIf(statement, pushBody);
          break;
        case 'repeatCount':
          emitRepeatCount(statement, pushBody);
          break;
        case 'pwmWrite':
          var pwmPinKey = statement.pinId == null ? 'PB2' : statement.pinId;
          var pwmCfg = pwmPinConfig[pwmPinKey];
          emit('; Definir PWM de 8 bits em ' + pwmCfg.label, statement.blockId);
          emitExpression(statement.value);
          instruction(statement.blockId, 'mov', ['pwm_value', 'r16'],
            'Prepara o valor de razão cíclica do PWM.',
            'pwm_value (R20) recebe R16 sem alterar SREG.');
          instruction(statement.blockId, 'rcall', [pwmCfg.routine],
            'Atualiza o sinal PWM no pino ' + pwmCfg.label + '.',
            'Configura ' + pwmPinKey + ' como saída e grava pwm_value em ' + pwmCfg.register + ' (Timer' + pwmCfg.timer + ').');
          break;
        case 'timer0Start':
          emit('; Iniciar Timer0 em modo normal (overflow a cada 10 ms)', statement.blockId);
          instruction(statement.blockId, 'rcall', ['start_timer0'],
            'Inicia o Timer0 de 8 bits com overflow a cada 10 ms.',
            'Configura TCCR0A em modo normal, TIMSK0 (TOIE0 = 1), TCCR0B com prescaler 1024, TCNT0 = 100 e ativa SEI.');
          break;
        case 'timer1Start':
          emit('; Iniciar Timer1 em modo normal (overflow a cada 1000 ms)', statement.blockId);
          instruction(statement.blockId, 'rcall', ['start_timer1'],
            'Inicia o Timer1 de 16 bits com overflow a cada 1000 ms (1 s).',
            'Configura TCCR1A = 0, TCCR1B com prescaler 1024, TIMSK1 (TOIE1 = 1), TCNT1 = 0xC2F6 e ativa SEI.');
          break;
        case 'timer2Start':
          emit('; Iniciar Timer2 em modo normal (overflow a cada 10 ms)', statement.blockId);
          instruction(statement.blockId, 'rcall', ['start_timer2'],
            'Inicia o Timer2 de 8 bits com overflow a cada 10 ms.',
            'Configura TCCR2A = 0, TIMSK2 (TOIE2 = 1), TCCR2B com prescaler 1024, TCNT2 = 100 e ativa SEI.');
          break;
        case 'lcdInit':
          emit('; Inicializar display LCD no PORTD (modo 4 bits)', statement.blockId);
          instruction(statement.blockId, 'rcall', ['lcd_init'],
            'Inicializa o display LCD 16x2 no PORTD.',
            'Configura PD2..PD7 como saídas e executa a sequência de inicialização de 4 bits do controlador HD44780.');
          break;
        case 'lcdClear':
          emit('; Limpar display LCD', statement.blockId);
          instruction(statement.blockId, 'rcall', ['lcd_clear'],
            'Limpa o display LCD e reposiciona o cursor no início.',
            'Envia o comando 0x01 ao LCD com RS=0 e aguarda 2 ms.');
          break;
        case 'lcdCursor':
          var lcdRoutine = statement.row === 1 ? 'lcd_lin1_col' : 'lcd_lin0_col';
          emit('; Posicionar cursor do LCD na linha ' + statement.row, statement.blockId);
          emitExpression(statement.col);
          instruction(statement.blockId, 'mov', ['lcd_col', 'r16'],
            'Define a coluna de destino do cursor no LCD.',
            'lcd_col (R27) recebe a coluna calculada em R16.');
          instruction(statement.blockId, 'rcall', [lcdRoutine],
            'Posiciona o cursor do LCD na linha ' + statement.row + '.',
            'Envia o endereço DDRAM da linha ' + statement.row + ' somado a lcd_col para o controlador do LCD.');
          break;
        case 'lcdWriteChar':
          var lcdCh = String.fromCharCode(statement.value);
          emit('; Escrever caractere ASCII ' + statement.value + ' (' + lcdCh + ') no LCD', statement.blockId);
          instruction(statement.blockId, 'ldi', ['lcd_caracter', String(statement.value)],
            'Carrega o código ASCII do caractere "' + lcdCh + '".',
            'lcd_caracter (R19) recebe ' + statement.value + ' sem alterar SREG.');
          instruction(statement.blockId, 'rcall', ['lcd_write_caracter'],
            'Envia o caractere em lcd_caracter ao display LCD.',
            'Transmite os dois nibbles (4 bits) de lcd_caracter pelos pinos PD7..PD4 com pulso em ENABLE (PD3).');
          break;
        case 'lcdWriteNumber':
          emit('; Escrever número de 8 bits (0 a 255) no LCD', statement.blockId);
          emitExpression(statement.value);
          instruction(statement.blockId, 'mov', ['lcd_number', 'r16'],
            'Prepara o número de 8 bits para exibição no LCD.',
            'lcd_number (R28) recebe o valor de R16.');
          instruction(statement.blockId, 'rcall', ['lcd_write_number'],
            'Converte e escreve o número com 3 dígitos decimais no LCD.',
            'Decompõe lcd_number em centenas, dezenas e unidades ASCII e envia cada dígito ao LCD.');
          break;
        case 'usartInit':
          emit('; Inicializar porta serial USART0 em 9600 bps (16 MHz)', statement.blockId);
          instruction(statement.blockId, 'rcall', ['usart_init'],
            'Configura a USART0 para 9600 bps a 16 MHz.',
            'Define UBRR0 = 103 e habilita transmissor (TXEN0) e receptor (RXEN0) em UCSR0B.');
          break;
        case 'usartTransmitChar':
          var serialCh = String.fromCharCode(statement.value);
          emit('; Enviar caractere ASCII ' + statement.value + ' (' + serialCh + ') pela serial', statement.blockId);
          instruction(statement.blockId, 'ldi', ['transmit_caracter', String(statement.value)],
            'Carrega o código ASCII do caractere "' + serialCh + '".',
            'transmit_caracter (R21) recebe ' + statement.value + ' sem alterar SREG.');
          instruction(statement.blockId, 'rcall', ['usart_transmit'],
            'Transmite o caractere pela porta serial USART0.',
            'Aguarda UDRE0=1 em UCSR0A e escreve transmit_caracter em UDR0.');
          break;
        case 'usartTransmitNumber':
          emit('; Enviar número decimal (0 a 255) pela porta serial', statement.blockId);
          emitExpression(statement.value);
          instruction(statement.blockId, 'mov', ['transmit_caracter', 'r16'],
            'Prepara o valor de 8 bits para transmissão decimal pela serial.',
            'transmit_caracter (R21) recebe o valor de R16.');
          instruction(statement.blockId, 'rcall', ['usart_transmit_number'],
            'Converte o número em 3 dígitos ASCII e transmite pela USART0.',
            'Decompõe transmit_caracter em centenas, dezenas e unidades ASCII e transmite cada caractere.');
          break;
        case 'display7Write':
          emit('; Mostrar dezena e unidade em display de 7 segmentos no PORTD', statement.blockId);
          emitExpression(statement.value);
          instruction(statement.blockId, 'mov', ['display_number', 'r16'],
            'Prepara o valor (0 a 99) para o display de 7 segmentos.',
            'display_number (R24) recebe o valor de R16.');
          instruction(statement.blockId, 'rcall', ['display_write'],
            'Converte e exibe dezena e unidade em BCD no PORTD.',
            'Configura DDRD = 0xFF e coloca a dezena em PD7..PD4 e a unidade em PD3..PD0.');
          break;
        case 'display7Off':
          emit('; Apagar display de 7 segmentos no PORTD', statement.blockId);
          instruction(statement.blockId, 'rcall', ['display_off'],
            'Apaga o display de 7 segmentos conectado ao PORTD.',
            'Configura DDRD = 0xFF e escreve 0xFF em PORTD.');
          break;
        case 'eepromWrite':
          emit('; Gravar valor de 8 bits na EEPROM', statement.blockId);
          emitExpression(statement.address);
          emit('; Preservar o endereço da EEPROM na pilha enquanto o valor usa R16.', statement.blockId);
          instruction(statement.blockId, 'push', ['r16'],
            'Salva o endereço da EEPROM na pilha.',
            'A pilha recebe o endereço de R16 e SP diminui em 1.');
          emitExpression(statement.value);
          instruction(statement.blockId, 'mov', ['eeprom_number', 'r16'],
            'Prepara o byte a ser gravado na EEPROM.',
            'eeprom_number (R22) recebe o valor calculado em R16.');
          instruction(statement.blockId, 'pop', ['eeprom_address'],
            'Recupera o endereço de destino da EEPROM da pilha.',
            'SP aumenta em 1 e eeprom_address (R23) recebe o endereço salvo.');
          instruction(statement.blockId, 'rcall', ['eeprom_write'],
            'Grava o byte na memória EEPROM.',
            'Aguarda EEPE=0, define EEARL=eeprom_address e EEDR=eeprom_number, e executa a sequência EEMPE/EEPE com interrupções salvas.');
          break;
      }
    }

    function emitStatements(statements) {
      var pending = [];

      function pushBody(body, finish) {
        pending.push({body: body, index: 0, finish: finish});
      }

      pushBody(statements);
      while (pending.length) {
        var frame = pending[pending.length - 1];
        if (frame.index < frame.body.length) {
          emitStatement(frame.body[frame.index++], pushBody);
        } else {
          pending.pop();
          // Closing a body can enqueue another sequence, such as an else arm.
          if (frame.finish) {
            frame.finish();
          }
        }
      }
    }

    variables.forEach(function (variable) {
      if (!variable || typeof variable.id !== 'string' || !variable.id || variablesById[variable.id] ||
          typeof variable.label !== 'string' || !variable.label.trim() ||
          typeof variable.symbol !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(variable.symbol) ||
          isReservedSymbol(variable.symbol) || usedSymbols[variable.symbol.toUpperCase()]) {
        report('INVALID_VARIABLE', 'A declaração de uma variável de 8 bits é inválida.', start);
        return;
      }
      variablesById[variable.id] = variable;
      usedSymbols[variable.symbol.toUpperCase()] = true;
    });
    var features = scanProgramFeatures(program);
    var mainSpills = Math.max(validateStatements(program.setup), validateStatements(program.loop || []));
    var isrSpills = 0;
    for (var ti = 0; ti <= 2; ti++) {
      var isrEntry = program.interrupts && program.interrupts['timer' + ti];
      var isrBody = isrEntry && isrEntry.body ? isrEntry.body : [];
      var bodySpills = isrBody.length ? validateStatements(isrBody) : 0;
      if (features.usesTimerInterrupts[ti]) {
        var regsInfo = scanIsrRegisters(isrBody);
        isrSpills = Math.max(isrSpills, regsInfo.frameBytes + bodySpills);
      }
    }
    var peakSpills = mainSpills + isrSpills;
    for (var c = 0; c < features.conflicts.length; c++) {
      result.diagnostics.push(features.conflicts[c]);
    }
    if (result.diagnostics.length) {
      return result;
    }
    if (variables.length + peakSpills > sramBytes) {
      report('SRAM_OVERFLOW', 'As variáveis (' + variables.length + ' bytes) e o pico da pilha (' +
        peakSpills + ' bytes) excedem os ' + sramBytes + ' bytes de SRAM do ATmega328P.', start);
      return result;
    }

    emit('; ATmega328P com clock externo de 16 MHz (AVRASM2)');
    if (features.usesPeripheralDefs) {
      emit('.include "m328pdef.inc"');
    }
    if (features.usesAnyTimerInterrupt) {
      emit('.org 0x0000', start);
      instruction(start, 'jmp', ['inicio'],
        'Salta sobre a tabela de vetores e sub-rotinas ao sair do reset.',
        'O contador de programa (PC) salta para o rótulo inicio.');
      if (features.usesTimerInterrupts[2]) {
        var isr2Owner = (program.interrupts && program.interrupts.timer2 && program.interrupts.timer2.blockId) || start;
        emit('.org 0x0012', isr2Owner);
        instructionWords = 0x0012;
        instruction(isr2Owner, 'jmp', ['TIM2_OVERFLOW'],
          'Vetor de interrupção de estouro (overflow) do Timer2 (0x0012 / OVF2addr).',
          'Quando o Timer2 estoura a cada 10 ms, o PC salta para TIM2_OVERFLOW.');
      }
      if (features.usesTimerInterrupts[1]) {
        var isr1Owner = (program.interrupts && program.interrupts.timer1 && program.interrupts.timer1.blockId) || start;
        emit('.org 0x001A', isr1Owner);
        instructionWords = 0x001A;
        instruction(isr1Owner, 'jmp', ['TIM1_OVERFLOW'],
          'Vetor de interrupção de estouro (overflow) do Timer1 (0x001A / OVF1addr).',
          'Quando o Timer1 estoura a cada 1000 ms, o PC salta para TIM1_OVERFLOW.');
      }
      if (features.usesTimerInterrupts[0]) {
        var isr0Owner = (program.interrupts && program.interrupts.timer0 && program.interrupts.timer0.blockId) || start;
        emit('.org 0x0020', isr0Owner);
        instructionWords = 0x0020;
        instruction(isr0Owner, 'jmp', ['TIM0_OVERFLOW'],
          'Vetor de interrupção de estouro (overflow) do Timer0 (0x0020 / OVF0addr).',
          'Quando o Timer0 estoura a cada 10 ms, o PC salta para TIM0_OVERFLOW.');
      }
    }
    if (features.usesLibrary) {
      emit('.include "lib328Pv03.inc"');
      delaySecondsWord = instructionWords + delaySecondsOffset;
      instructionWords += libraryWords;
    }
    emit('');
    emit('; Ao iniciar ATmega328P', start);
    if (features.usesAnyTimerInterrupt) {
      emit('inicio:', start);
    }
    if (variables.length) {
      instruction(start, 'ldi', ['r16', '0'], 'Prepara o valor zero para inicializar as variáveis.',
        'R16 recebe 0 sem alterar SREG.');
      variables.forEach(function (variable) {
        emit('; Inicializar a variável ' + variable.symbol + ' com zero', start);
        instruction(start, 'sts', [variable.symbol, 'r16'], 'Zera a variável ' + variable.label + ' na SRAM.',
          'O byte da SRAM em ' + variable.symbol + ' recebe 0 de R16 sem alterar SREG.');
      });
    }
    emitStatements(program.setup);

    if (program.loop !== null) {
      emit('; Repita para sempre', loop);
      emit('main_loop:', loop);
      var wordsBeforeLoop = instructionWords;
      emitStatements(program.loop);
      emitLoopBack(loop, 'main_loop', wordsBeforeLoop);
    } else {
      emit('; Fim da sequência inicial', start);
      emit('halt:', start);
      instruction(start, 'rjmp', ['halt'], 'Mantém o programa no fim da sequência.',
        'O PC volta a halt e a CPU repete este salto.');
    }

    for (var isrIdx = 0; isrIdx <= 2; isrIdx++) {
      if (features.usesTimerInterrupts[isrIdx]) {
        emitTimerIsr(isrIdx, program.interrupts && program.interrupts['timer' + isrIdx]);
      }
    }
    if (usesDelay) {
      emitDelayHelper();
    }
    if (instructionWords > flashWords) {
      result = emptyResult();
      report('FLASH_OVERFLOW', 'O programa ocupa ' + instructionWords + ' palavras e excede as ' +
        flashWords + ' palavras de memória flash do ATmega328P.', start);
      return result;
    }
    if (variables.length) {
      emit('');
      emit('.dseg');
      variables.forEach(function (variable) {
        emit('; Reservar um byte da SRAM para ' + variable.symbol);
        emit(variable.symbol + ':');
        emit('    .byte 1');
      });
    }

    result.usesLibrary = features.usesLibrary;
    result.source = lines.join('\n') + '\n';
    return result;
  }

  return {
    generate: generate,
    LIB328P_V03_FILENAME: 'lib328Pv03.inc',
    LIB328P_V03_SOURCE: LIB328P_V03_SOURCE
  };
}));
