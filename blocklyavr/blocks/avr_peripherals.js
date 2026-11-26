'use strict';

(function () {
  var adcColour = 290;
  var timerColour = 40;
  var lcdColour = 160;
  var serialColour = 200;
  var display7Colour = 340;
  var eepromColour = 260;

  var analogChannels = [
    ['PC0 (A0)', '0'],
    ['PC1 (A1)', '1'],
    ['PC2 (A2)', '2'],
    ['PC3 (A3)', '3'],
    ['PC4 (A4)', '4'],
    ['PC5 (A5)', '5']
  ];

  var lcdRows = [
    ['linha 0', '0'],
    ['linha 1', '1']
  ];

  var pwmPins = [
    ['PB2 (D10 / OC1B · Timer1)', 'PB2'],
    ['PB1 (D9 / OC1A · Timer1)', 'PB1'],
    ['PD6 (D6 / OC0A · Timer0)', 'PD6'],
    ['PD5 (D5 / OC0B · Timer0)', 'PD5'],
    ['PB3 (D11 / OC2A · Timer2)', 'PB3'],
    ['PD3 (D3 / OC2B · Timer2)', 'PD3']
  ];

  function applyHatCap() {
    Blockly.Block.prototype.initSvg.call(this);
    this.svg_.renderDrawTop_ = function (steps, highlights, connectionsXY, rightEdge) {
      var corner = Blockly.BlockSvg.CORNER_RADIUS;
      steps.push('M 0,' + corner + ' C 0,-8 24,-12 40,0 H', rightEdge);
      highlights.push('M 1,' + corner + ' C 1,-7 24,-11 40,1 H',
        rightEdge + (Blockly.RTL ? -1 : 0));
      this.width = rightEdge;
    };
  }

  function timerIsrBlock(title, tooltip) {
    return {
      init: function () {
        this.appendDummyInput().appendField(title);
        this.setNextStatement(true);
        this.setColour(timerColour);
        this.setTooltip(tooltip);
      },
      initSvg: applyHatCap
    };
  }

  function asciiCharValidator(text) {
    if (typeof text !== 'string' || text.length !== 1) {
      return null;
    }
    var code = text.charCodeAt(0);
    return code >= 32 && code <= 126 ? text : null;
  }

  Blockly.Blocks.avr_analog_read = {
    init: function () {
      this.appendDummyInput()
        .appendField('Ler entrada analógica')
        .appendField(new Blockly.FieldDropdown(analogChannels), 'CHANNEL');
      this.setOutput(true, 'Number');
      this.setColour(adcColour);
      this.setTooltip('Realiza conversão A/D de 8 bits (0 a 255, referência AVCC 5 V) no canal selecionado.');
    }
  };

  Blockly.Blocks.avr_pwm_write = {
    init: function () {
      this.appendValueInput('VALUE')
        .setCheck('Number')
        .appendField('Definir PWM em')
        .appendField(new Blockly.FieldDropdown(pwmPins), 'PIN')
        .appendField('com');
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(adcColour);
      this.setTooltip('Gera sinal PWM de 8 bits no pino selecionado (Timers 0, 1 ou 2) com razão cíclica de 0 a 255.');
    }
  };

  Blockly.Blocks.avr_timer0_start = {
    init: function () {
      this.appendDummyInput()
        .appendField('Iniciar Timer0 (overflow 10 ms)');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(timerColour);
      this.setTooltip('Inicia o Timer0 de 8 bits em modo normal (prescaler 1024, TCNT0 = 100) com interrupção de overflow a cada 10 ms.');
    }
  };

  Blockly.Blocks.avr_timer1_start = {
    init: function () {
      this.appendDummyInput()
        .appendField('Iniciar Timer1 (overflow 1000 ms)');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(timerColour);
      this.setTooltip('Inicia o Timer1 de 16 bits em modo normal (prescaler 1024, TCNT1 = 0xC2F6) com interrupção de overflow a cada 1000 ms (1 s).');
    }
  };

  Blockly.Blocks.avr_timer2_start = {
    init: function () {
      this.appendDummyInput()
        .appendField('Iniciar Timer2 (overflow 10 ms)');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(timerColour);
      this.setTooltip('Inicia o Timer2 de 8 bits em modo normal (prescaler 1024, TCNT2 = 100) com interrupção de overflow a cada 10 ms.');
    }
  };

  Blockly.Blocks.avr_timer0_isr = timerIsrBlock(
    'Quando Timer0 estourar (10 ms) · TIM0_OVERFLOW',
    'Rotina de interrupção executada a cada 10 ms quando o Timer0 estoura (vetor 0x0020). Recarrega TCNT0 = 100 automaticamente.'
  );

  Blockly.Blocks.avr_timer1_isr = timerIsrBlock(
    'Quando Timer1 estourar (1000 ms) · TIM1_OVERFLOW',
    'Rotina de interrupção executada a cada 1000 ms (1 s) quando o Timer1 estoura (vetor 0x001A). Recarrega TCNT1 = 0xC2F6 automaticamente.'
  );

  Blockly.Blocks.avr_timer2_isr = timerIsrBlock(
    'Quando Timer2 estourar (10 ms) · TIM2_OVERFLOW',
    'Rotina de interrupção executada a cada 10 ms quando o Timer2 estoura (vetor 0x0012). Recarrega TCNT2 = 100 automaticamente.'
  );

  Blockly.Blocks.avr_lcd_init = {
    init: function () {
      this.appendDummyInput()
        .appendField('Inicializar display LCD (PORTD)');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(lcdColour);
      this.setTooltip('Inicializa o display LCD 16x2 no PORTD em modo de 4 bits (RS=PD2, EN=PD3, D4..D7=PD4..PD7).');
    }
  };

  Blockly.Blocks.avr_lcd_clear = {
    init: function () {
      this.appendDummyInput()
        .appendField('Limpar display LCD');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(lcdColour);
      this.setTooltip('Limpa o conteúdo do display LCD e retorna o cursor ao início.');
    }
  };

  Blockly.Blocks.avr_lcd_cursor = {
    init: function () {
      this.appendValueInput('COL')
        .setCheck('Number')
        .appendField('Posicionar cursor do LCD na')
        .appendField(new Blockly.FieldDropdown(lcdRows), 'ROW')
        .appendField('coluna');
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(lcdColour);
      this.setTooltip('Posiciona o cursor do display LCD na linha (0 ou 1) e coluna (0 a 15) informadas.');
    }
  };

  Blockly.Blocks.avr_lcd_write_char = {
    init: function () {
      this.appendDummyInput()
        .appendField('Escrever caractere no LCD')
        .appendField(new Blockly.FieldTextInput('A', asciiCharValidator), 'CHAR');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(lcdColour);
      this.setTooltip('Escreve um caractere ASCII imprimível na posição atual do display LCD.');
    }
  };

  Blockly.Blocks.avr_lcd_write_number = {
    init: function () {
      this.appendValueInput('VALUE')
        .setCheck('Number')
        .appendField('Escrever número no LCD');
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(lcdColour);
      this.setTooltip('Converte e escreve um número de 8 bits (0 a 255) com 3 dígitos decimais no display LCD.');
    }
  };

  Blockly.Blocks.avr_usart_init = {
    init: function () {
      this.appendDummyInput()
        .appendField('Inicializar porta serial (9600 bps)');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(serialColour);
      this.setTooltip('Configura a USART0 para comunicação serial a 9600 bps com clock de 16 MHz (TX e RX habilitados).');
    }
  };

  Blockly.Blocks.avr_usart_transmit_char = {
    init: function () {
      this.appendDummyInput()
        .appendField('Enviar caractere pela serial')
        .appendField(new Blockly.FieldTextInput('A', asciiCharValidator), 'CHAR');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(serialColour);
      this.setTooltip('Transmite um caractere ASCII pela porta serial USART0.');
    }
  };

  Blockly.Blocks.avr_usart_transmit_number = {
    init: function () {
      this.appendValueInput('VALUE')
        .setCheck('Number')
        .appendField('Enviar número pela serial');
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(serialColour);
      this.setTooltip('Converte um valor de 8 bits (0 a 255) em 3 caracteres decimais ASCII e transmite pela USART0.');
    }
  };

  Blockly.Blocks.avr_usart_receive_char = {
    init: function () {
      this.appendDummyInput()
        .appendField('Receber caractere da serial');
      this.setOutput(true, 'Number');
      this.setColour(serialColour);
      this.setTooltip('Aguarda e lê um byte recebido pela porta serial USART0 (0 a 255).');
    }
  };

  Blockly.Blocks.avr_display7_write = {
    init: function () {
      this.appendValueInput('VALUE')
        .setCheck('Number')
        .appendField('Mostrar número no display 7 seg (PORTD)');
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(display7Colour);
      this.setTooltip('Converte um número de 0 a 99 em dezena e unidade BCD e exibe nos dois nibbles do PORTD.');
    }
  };

  Blockly.Blocks.avr_display7_off = {
    init: function () {
      this.appendDummyInput()
        .appendField('Apagar display 7 seg (PORTD)');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(display7Colour);
      this.setTooltip('Apaga o display de 7 segmentos colocando 0xFF no PORTD.');
    }
  };

  Blockly.Blocks.avr_eeprom_write = {
    init: function () {
      this.appendValueInput('ADDRESS')
        .setCheck('Number')
        .appendField('Gravar na EEPROM endereço');
      this.appendValueInput('VALUE')
        .setCheck('Number')
        .appendField('valor');
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(eepromColour);
      this.setTooltip('Grava um byte (0 a 255) no endereço de 8 bits (0 a 255) da memória não volátil EEPROM.');
    }
  };

  Blockly.Blocks.avr_eeprom_read = {
    init: function () {
      this.appendValueInput('ADDRESS')
        .setCheck('Number')
        .appendField('Ler da EEPROM endereço');
      this.setInputsInline(true);
      this.setOutput(true, 'Number');
      this.setColour(eepromColour);
      this.setTooltip('Lê o byte (0 a 255) armazenado no endereço de 8 bits (0 a 255) da memória EEPROM.');
    }
  };
}());
