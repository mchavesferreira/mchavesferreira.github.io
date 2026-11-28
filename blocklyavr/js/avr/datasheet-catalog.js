(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AvrDatasheetCatalog = factory();
  }
}(this, function () {
  'use strict';

  var DATASHEET_DOC = 'DS40002061B';
  var DATASHEET_TITLE = 'ATmega48A/PA/88A/PA/168A/PA/328/P Data Sheet (Microchip)';

  var TOPICS = [
    {
      id: 'cpu-core',
      title: 'Núcleo AVR, Registradores R0–R31, SREG, Pilha e SRAM',
      shortTitle: 'Núcleo AVR & SRAM',
      summary: 'Arquitetura Harvard RISC de 8 bits com 32 registradores de propósito geral ligados diretamente à ULA, registrador de estado SREG, ponteiro de pilha SP (SPH:SPL) e 2 KB de SRAM.',
      didacticIntro: 'No ATmega328P, operações aritméticas, comparações, variáveis e sub-rotinas acontecem em torno do banco R0–R31, do registrador de flags SREG e da SRAM interna (2.048 bytes, onde ficam variáveis .dseg e a pilha gerenciada por SPH:SPL).',
      diagramId: 'cpu-core',
      datasheetDoc: DATASHEET_DOC,
      datasheetSection: 'Seção 7 (AVR CPU Core) e Seção 8.3 (SRAM Data Memory)',
      datasheetFigure: 'Figure 7-1 (Block Diagram of the AVR Architecture), Figure 7-2 (General Purpose Working Registers) e Figure 8-3 (Data Memory Map)',
      datasheetPage: 'Folhas 18–23, 28 e 623',
      externalNote: null,
      registers: [
        {
          name: 'SREG',
          ioAddress: '0x3F',
          sramAddress: '0x5F',
          bits: 'I, T, H, S, V, N, Z, C',
          description: 'Registrador de estado da CPU: guarda as flags atualizadas pela ULA (Z=zero, C=carry/empréstimo, N=negativo, V=overflow, S=sinal, H=meio carry, T=transferência) e I (habilitação global de interrupções).',
          page: 'Folhas 19–20 e 623'
        },
        {
          name: 'SPH',
          ioAddress: '0x3E',
          sramAddress: '0x5E',
          bits: '–, –, –, –, –, SP10, SP9, SP8',
          description: 'Byte alto do Stack Pointer (Ponteiro de Pilha), apontando para o topo da pilha na SRAM usado por PUSH, POP, CALL, RCALL, RET e RETI.',
          page: 'Folhas 22 e 623'
        },
        {
          name: 'SPL',
          ioAddress: '0x3D',
          sramAddress: '0x5D',
          bits: 'SP7, SP6, SP5, SP4, SP3, SP2, SP1, SP0',
          description: 'Byte baixo do Stack Pointer; decrementa automaticamente quando bytes ou endereços de retorno são empilhados na SRAM.',
          page: 'Folhas 22 e 623'
        },
        {
          name: 'R0–R31',
          ioAddress: '—',
          sramAddress: '0x00–0x1F',
          bits: '32 registradores de trabalho de 8 bits (X=R27:R26, Y=R29:R28, Z=R31:R30)',
          description: 'Banco de registradores de propósito geral conectado diretamente à ULA; no gerador AVRASM2, R16 é o acumulador principal, R17 guarda o segundo operando e R18 controla laços contados.',
          page: 'Folhas 20–21'
        }
      ],
      blockTypes: [
        'avr_start', 'avr_literal', 'avr_add', 'avr_subtract',
        'avr_assign', 'avr_variable_read', 'avr_if', 'avr_if_else',
        'avr_compare', 'avr_forever', 'avr_repeat_count',
        'avr_delay_ms', 'avr_delay_s'
      ],
      libraryRoutines: ['delay_seconds', 'delay_miliseconds', 'delay_1microsecond'],
      mnemonics: [
        'ldi', 'mov', 'add', 'sub', 'subi', 'andi', 'ori', 'or', 'clr',
        'inc', 'dec', 'cp', 'cpi', 'tst', 'swap', 'push', 'pop',
        'lds', 'sts', 'rjmp', 'jmp', 'breq', 'brne', 'brlo', 'brsh',
        'call', 'rcall', 'ret', 'reti', 'sbiw', 'nop', 'sei'
      ],
      blockToAsmExamples: [
        {block: 'Somar / Subtrair (avr_add / avr_subtract)', asm: 'push r16 / mov r17, r16 / pop r16 / add r16, r17'},
        {block: 'Atribuir / Ler variável (avr_assign / avr_variable_read)', asm: 'sts VAR, r16 / lds r16, VAR (.dseg .byte 1)'},
        {block: 'Se / Repetir (avr_if / avr_repeat_count)', asm: 'tst r16 / brne ... / jmp ...'}
      ]
    },
    {
      id: 'gpio',
      title: 'Portos Digitais B, C e D (GPIO Bidirecional)',
      shortTitle: 'Portos Digitais (GPIO)',
      summary: 'Cada porto digital (B, C e D) é controlado por três registradores mapeados no espaço I/O direto: DDRx (direção), PORTx (nível de saída ou pull-up) e PINx (leitura física).',
      didacticIntro: 'No ATmega328P, DDRx define se cada pino é saída (1) ou entrada (0). Quando configurado como saída, PORTx define 5 V (1) ou 0 V (0); quando configurado como entrada, PORTx=1 ativa o resistor interno de pull-up. PINx lê o estado real do pino.',
      diagramId: 'gpio',
      datasheetDoc: DATASHEET_DOC,
      datasheetSection: 'Seção 14 (I/O-Ports: 14.2 Ports as General Digital I/O e 14.4 Register Description)',
      datasheetFigure: 'Figure 14-1 (I/O Pin Equivalent Schematic) e Figure 14-2 (General Digital I/O)',
      datasheetPage: 'Folhas 84–86, 100–101 e 624',
      externalNote: null,
      registers: [
        {
          name: 'DDRB',
          ioAddress: '0x04',
          sramAddress: '0x24',
          bits: 'DDB7..DDB0 (1=saída, 0=entrada)',
          description: 'Registrador de direção de dados do Porto B (PB0–PB5 disponíveis; PB6/PB7 reservados ao cristal externo de 16 MHz).',
          page: 'Folhas 100 e 624'
        },
        {
          name: 'PORTB',
          ioAddress: '0x05',
          sramAddress: '0x25',
          bits: 'PORTB7..PORTB0 (nível de saída ou pull-up na entrada)',
          description: 'Define o nível lógico de saída dos pinos do Porto B ou habilita o pull-up interno quando o bit correspondente em DDRB está em 0.',
          page: 'Folhas 100 e 624'
        },
        {
          name: 'PINB',
          ioAddress: '0x03',
          sramAddress: '0x23',
          bits: 'PINB7..PINB0 (leitura do nível lógico físico do pino)',
          description: 'Lê o nível lógico aplicado externamente aos pinos do Porto B após o sincronizador de entrada.',
          page: 'Folhas 100 e 624'
        },
        {
          name: 'DDRC',
          ioAddress: '0x07',
          sramAddress: '0x27',
          bits: '–, DDC6..DDC0 (PC6 reservado ao RESET)',
          description: 'Registrador de direção de dados do Porto C (PC0–PC5 disponíveis como GPIO ou canais analógicos ADC0–ADC5).',
          page: 'Folhas 100 e 624'
        },
        {
          name: 'PORTC',
          ioAddress: '0x08',
          sramAddress: '0x28',
          bits: '–, PORTC6..PORTC0',
          description: 'Registrador de dados/pull-up do Porto C.',
          page: 'Folhas 100 e 624'
        },
        {
          name: 'PINC',
          ioAddress: '0x06',
          sramAddress: '0x26',
          bits: '–, PINC6..PINC0',
          description: 'Registrador de leitura física dos pinos do Porto C.',
          page: 'Folhas 101 e 624'
        },
        {
          name: 'DDRD',
          ioAddress: '0x0A',
          sramAddress: '0x2A',
          bits: 'DDD7..DDD0',
          description: 'Registrador de direção de dados do Porto D (PD0–PD7).',
          page: 'Folhas 101 e 624'
        },
        {
          name: 'PORTD',
          ioAddress: '0x0B',
          sramAddress: '0x2B',
          bits: 'PORTD7..PORTD0',
          description: 'Registrador de dados/pull-up do Porto D.',
          page: 'Folhas 101 e 624'
        },
        {
          name: 'PIND',
          ioAddress: '0x09',
          sramAddress: '0x29',
          bits: 'PIND7..PIND0',
          description: 'Registrador de leitura física dos pinos do Porto D.',
          page: 'Folhas 101 e 624'
        }
      ],
      blockTypes: ['avr_pin_mode', 'avr_digital_write', 'avr_digital_toggle', 'avr_digital_read'],
      libraryRoutines: [],
      mnemonics: ['sbi', 'cbi', 'sbis', 'sbic', 'in', 'out'],
      blockToAsmExamples: [
        {block: 'Configurar pino (avr_pin_mode)', asm: 'sbi DDRB, DDB5 / cbi DDRB, DDB5'},
        {block: 'Escrever saída / Alternar (avr_digital_write / avr_digital_toggle)', asm: 'sbi PORTB, PORTB5 / sbis PORTB, PORTB5'},
        {block: 'Ler entrada digital (avr_digital_read)', asm: 'in r16, PINB / andi r16, (1 << PINB0)'}
      ]
    },
    {
      id: 'adc',
      title: 'Conversor Analógico-Digital (ADC de 10/8 bits)',
      shortTitle: 'Conversor A/D (ADC)',
      summary: 'Conversor A/D de aproximações sucessivas ligado ao multiplexador analógico (ADC0–ADC5 em PC0–PC5). Com ADLAR=1, os 8 bits mais significativos ficam diretamente em ADCH.',
      didacticIntro: 'A biblioteca lib328Pv03.inc configura REFS0=1 (referência AVCC) e ADLAR=1 (ajuste à esquerda) em ADMUX, seleciona o canal MUX3..0 (0 a 5), inicia a conversão com ADSC=1 em ADCSRA, aguarda ADSC voltar a 0 e lê o valor de 0 a 255 em ADCH.',
      diagramId: 'adc',
      datasheetDoc: DATASHEET_DOC,
      datasheetSection: 'Seção 24 (Analog-to-Digital Converter: 24.2 Overview e 24.9 Register Description)',
      datasheetFigure: 'Figure 24-1 (Analog to Digital Converter Block Schematic Operation)',
      datasheetPage: 'Folhas 246–247, 257–259 e 622–623',
      externalNote: null,
      registers: [
        {
          name: 'ADMUX',
          ioAddress: '—',
          sramAddress: '0x7C',
          bits: 'REFS1, REFS0, ADLAR, –, MUX3, MUX2, MUX1, MUX0',
          description: 'Seleciona a tensão de referência (REFS0=1 para AVCC), o alinhamento à esquerda (ADLAR=1 para leitura de 8 bits) e o canal analógico em MUX3..0.',
          page: 'Folhas 257 e 622'
        },
        {
          name: 'ADCSRA',
          ioAddress: '—',
          sramAddress: '0x7A',
          bits: 'ADEN, ADSC, ADATE, ADIF, ADIE, ADPS2, ADPS1, ADPS0',
          description: 'Habilita o ADC (ADEN=1), inicia a conversão (ADSC=1; permanece em 1 até terminar) e define o prescaler de clock (ADPS2:0 = 111 -> divisão por 128 a 16 MHz).',
          page: 'Folhas 258 e 622'
        },
        {
          name: 'ADCH',
          ioAddress: '—',
          sramAddress: '0x79',
          bits: 'ADC9..ADC2 quando ADLAR=1 (leitura de 8 bits em lib328Pv03.inc)',
          description: 'Registrador de dados alto do ADC; quando ADLAR=1, fornece diretamente a conversão em 8 bits (0 a 255).',
          page: 'Folhas 259 e 623'
        },
        {
          name: 'ADCL',
          ioAddress: '—',
          sramAddress: '0x78',
          bits: 'ADC1, ADC0 nos bits 7..6 quando ADLAR=1',
          description: 'Registrador de dados baixo do ADC (contém os 2 bits menos significativos na leitura de 10 bits).',
          page: 'Folhas 259 e 623'
        }
      ],
      blockTypes: ['avr_analog_read'],
      libraryRoutines: ['analog_read', 'analog_read_channel'],
      mnemonics: ['sbrc', 'sbrs'],
      blockToAsmExamples: [
        {block: 'Ler entrada analógica A0 (avr_analog_read)', asm: 'rcall analog_read / mov r16, adc_value'},
        {block: 'Ler canal analógico A1..A5 (avr_analog_read)', asm: 'ldi r16, N / rcall analog_read_channel / mov r16, adc_value'}
      ]
    },
    {
      id: 'timer0',
      title: 'Timer/Counter0 de 8 bits (Overflow 10 ms e PWM em PD6/PD5)',
      shortTitle: 'Timer/Counter0 (8 bits)',
      summary: 'Temporizador/contador de 8 bits (TCNT0: 0–255) com prescaler, interrupção de estouro no vetor 0x0020 (TIMER0_OVF) e dois canais de saída PWM (OC0A em PD6 e OC0B em PD5).',
      didacticIntro: 'No modo de interrupção didática (start_timer0), o Timer0 usa prescaler 1024 e recarga TCNT0 = 100 para disparar TIM0_OVERFLOW a cada ~10 ms a 16 MHz. No modo PWM (PD6/PD5), TCCR0A entra em Fast PWM de 8 bits e OCR0A/OCR0B controlam o ciclo ativo.',
      diagramId: 'timer0',
      datasheetDoc: DATASHEET_DOC,
      datasheetSection: 'Seção 15 (8-bit Timer/Counter0 with PWM) e Seção 12.4 (Table 12-6, vetor 17 · 0x0020)',
      datasheetFigure: 'Figure 15-1 (8-bit Timer/Counter Block Diagram) e Figure 15-3 (Output Compare Unit, Block Diagram)',
      datasheetPage: 'Folhas 74, 102, 105, 113–118 e 623',
      externalNote: null,
      registers: [
        {
          name: 'TCCR0A',
          ioAddress: '0x24',
          sramAddress: '0x44',
          bits: 'COM0A1, COM0A0, COM0B1, COM0B0, –, –, WGM01, WGM00',
          description: 'Configura o modo de geração de onda (Normal ou Fast PWM) e a ação nas saídas de comparação OC0A (PD6) e OC0B (PD5).',
          page: 'Folhas 113 e 623'
        },
        {
          name: 'TCCR0B',
          ioAddress: '0x25',
          sramAddress: '0x45',
          bits: 'FOC0A, FOC0B, –, –, WGM02, CS02, CS01, CS00',
          description: 'Seleciona a fonte de clock e o prescaler do Timer0 através de CS02:0 (101 para /1024 na interrupção de 10 ms; 011 para /64 no PWM ~976 Hz).',
          page: 'Folhas 116 e 623'
        },
        {
          name: 'TCNT0',
          ioAddress: '0x26',
          sramAddress: '0x46',
          bits: 'TCNT0[7:0] (contador de 8 bits · recarga 100 para 10 ms)',
          description: 'Valor corrente do contador de 8 bits do Timer0; recarregado com 100 dentro de TIM0_OVERFLOW para manter o período de 10 ms.',
          page: 'Folhas 117 e 623'
        },
        {
          name: 'OCR0A',
          ioAddress: '0x27',
          sramAddress: '0x47',
          bits: 'OCR0A[7:0] (comparação PWM no pino PD6/OC0A)',
          description: 'Valor de comparação A (0 a 255) que define a razão cíclica do sinal PWM no pino PD6 (D6).',
          page: 'Folhas 117 e 623'
        },
        {
          name: 'OCR0B',
          ioAddress: '0x28',
          sramAddress: '0x48',
          bits: 'OCR0B[7:0] (comparação PWM no pino PD5/OC0B)',
          description: 'Valor de comparação B (0 a 255) que define a razão cíclica do sinal PWM no pino PD5 (D5).',
          page: 'Folhas 117 e 623'
        },
        {
          name: 'TIMSK0',
          ioAddress: '—',
          sramAddress: '0x6E',
          bits: '–, –, –, –, –, OCIE0B, OCIE0A, TOIE0',
          description: 'Habilita interrupções do Timer0; TOIE0=1 habilita a interrupção por estouro (overflow) no vetor 0x0020.',
          page: 'Folhas 118 e 623'
        }
      ],
      blockTypes: ['avr_timer0_start', 'avr_timer0_isr'],
      libraryRoutines: ['start_timer0', 'pwm_write_pd6', 'pwm_write_pd5'],
      mnemonics: [],
      blockToAsmExamples: [
        {block: 'Iniciar Timer0 (avr_timer0_start)', asm: 'rcall start_timer0'},
        {block: 'Interrupção Timer0 (avr_timer0_isr)', asm: '.org 0x0020 / jmp TIM0_OVERFLOW / out TCNT0, r16 / reti'},
        {block: 'PWM em PD6 ou PD5 (avr_pwm_write)', asm: 'mov pwm_value, r16 / rcall pwm_write_pd6 (ou pwm_write_pd5)'}
      ]
    },
    {
      id: 'timer1',
      title: 'Timer/Counter1 de 16 bits (Overflow 1000 ms e PWM em PB1/PB2)',
      shortTitle: 'Timer/Counter1 (16 bits)',
      summary: 'Temporizador/contador de 16 bits (TCNT1H:TCNT1L) com buffer temporário para acesso atômico em 8 bits, interrupção de estouro em 0x001A (TIMER1_OVF) e PWM nos pinos PB1 (OC1A) e PB2 (OC1B).',
      didacticIntro: 'Por ter 16 bits, o Timer1 alcança intervalos longos como 1 segundo (recarga TCNT1 = 0xC2F6 com prescaler 1024 a 16 MHz) e aciona os canais PWM OC1A (PB1/D9) e OC1B (PB2/D10) em Fast PWM de 8 bits.',
      diagramId: 'timer1',
      datasheetDoc: DATASHEET_DOC,
      datasheetSection: 'Seção 16 (16-bit Timer/Counter1 with PWM) e Seção 12.4 (Table 12-6, vetor 14 · 0x001A)',
      datasheetFigure: 'Figure 16-1 (16-bit Timer/Counter Block Diagram) e Figure 16-4 (Output Compare Unit, Block Diagram)',
      datasheetPage: 'Folhas 74, 120–121, 129, 140–145 e 622–623',
      externalNote: null,
      registers: [
        {
          name: 'TCCR1A',
          ioAddress: '—',
          sramAddress: '0x80',
          bits: 'COM1A1, COM1A0, COM1B1, COM1B0, –, –, WGM11, WGM10',
          description: 'Seleciona o modo das saídas OC1A (PB1) e OC1B (PB2) e os bits baixos do modo de geração de onda (WGM11:10).',
          page: 'Folhas 140 e 622'
        },
        {
          name: 'TCCR1B',
          ioAddress: '—',
          sramAddress: '0x81',
          bits: 'ICNC1, ICES1, –, WGM13, WGM12, CS12, CS11, CS10',
          description: 'Define os bits altos de modo (WGM13:12) e o prescaler CS12:0 (101 para /1024 na base de 1 s; 011 para /64 no PWM de 8 bits).',
          page: 'Folhas 142 e 622'
        },
        {
          name: 'TCNT1H:TCNT1L',
          ioAddress: '—',
          sramAddress: '0x85:0x84',
          bits: 'TCNT1[15:0] (contador de 16 bits · recarga 0xC2F6 para 1 s)',
          description: 'Par de contagem de 16 bits do Timer1; grava-se primeiro TCNT1H e depois TCNT1L para transferir os 16 bits atomicamente.',
          page: 'Folhas 143 e 622'
        },
        {
          name: 'OCR1AH:OCR1AL',
          ioAddress: '—',
          sramAddress: '0x89:0x88',
          bits: 'OCR1A[15:0] (comparação PWM no pino PB1/OC1A)',
          description: 'Registrador de comparação A de 16 bits usado no modo Fast PWM de 8 bits para controlar o pino PB1 (D9).',
          page: 'Folhas 144 e 622'
        },
        {
          name: 'OCR1BH:OCR1BL',
          ioAddress: '—',
          sramAddress: '0x8B:0x8A',
          bits: 'OCR1B[15:0] (comparação PWM no pino PB2/OC1B)',
          description: 'Registrador de comparação B de 16 bits usado no modo Fast PWM de 8 bits para controlar o pino PB2 (D10).',
          page: 'Folhas 144 e 622'
        },
        {
          name: 'TIMSK1',
          ioAddress: '—',
          sramAddress: '0x6F',
          bits: '–, –, ICIE1, –, –, OCIE1B, OCIE1A, TOIE1',
          description: 'Habilita interrupções do Timer1; TOIE1=1 habilita o estouro no vetor 0x001A.',
          page: 'Folhas 144 e 623'
        }
      ],
      blockTypes: ['avr_timer1_start', 'avr_timer1_isr', 'avr_pwm_write'],
      libraryRoutines: ['start_timer1', 'pwm_write', 'pwm_write_pb1', 'pwm_write_pb2'],
      mnemonics: [],
      blockToAsmExamples: [
        {block: 'Iniciar Timer1 (avr_timer1_start)', asm: 'rcall start_timer1'},
        {block: 'Interrupção Timer1 (avr_timer1_isr)', asm: '.org 0x001A / jmp TIM1_OVERFLOW / sts TCNT1H, r16 / sts TCNT1L, r16 / reti'},
        {block: 'PWM em PB1 ou PB2 (avr_pwm_write)', asm: 'mov pwm_value, r16 / rcall pwm_write_pb1 (ou pwm_write)'}
      ]
    },
    {
      id: 'timer2',
      title: 'Timer/Counter2 de 8 bits (Overflow 10 ms e PWM em PB3/PD3)',
      shortTitle: 'Timer/Counter2 (8 bits)',
      summary: 'Temporizador/contador de 8 bits (TCNT2: 0–255) com opção assíncrona, interrupção de estouro em 0x0012 (TIMER2_OVF) e canais PWM OC2A (PB3/D11) e OC2B (PD3/D3).',
      didacticIntro: 'O Timer2 opera de forma análoga ao Timer0, mas com tabela própria de prescalers (CS22:0 = 111 para /1024 na interrupção de 10 ms; 100 para /64 no PWM ~976 Hz) e acesso via espaço estendido (LDS/STS).',
      diagramId: 'timer2',
      datasheetDoc: DATASHEET_DOC,
      datasheetSection: 'Seção 18 (8-bit Timer/Counter2 with PWM and Asynchronous Operation) e Seção 12.4 (Table 12-6, vetor 10 · 0x0012)',
      datasheetFigure: 'Figure 18-1 (8-bit Timer/Counter Block Diagram) e Figure 18-3 (Output Compare Unit, Block Diagram)',
      datasheetPage: 'Folhas 74, 150, 153, 162–167 e 622–623',
      externalNote: null,
      registers: [
        {
          name: 'TCCR2A',
          ioAddress: '—',
          sramAddress: '0xB0',
          bits: 'COM2A1, COM2A0, COM2B1, COM2B0, –, –, WGM21, WGM20',
          description: 'Configura a saída de comparação (OC2A em PB3 e OC2B em PD3) e os bits WGM21:20 (Normal ou Fast PWM).',
          page: 'Folhas 162 e 622'
        },
        {
          name: 'TCCR2B',
          ioAddress: '—',
          sramAddress: '0xB1',
          bits: 'FOC2A, FOC2B, –, –, WGM22, CS22, CS21, CS20',
          description: 'Define o prescaler do Timer2 (111 para /1024 em start_timer2; 100 para /64 em pwm_write_pb3/pd3).',
          page: 'Folhas 165 e 622'
        },
        {
          name: 'TCNT2',
          ioAddress: '—',
          sramAddress: '0xB2',
          bits: 'TCNT2[7:0] (contador de 8 bits · recarga 100 para 10 ms)',
          description: 'Registrador de contagem de 8 bits do Timer2; recarregado com 100 dentro de TIM2_OVERFLOW.',
          page: 'Folhas 166 e 622'
        },
        {
          name: 'OCR2A',
          ioAddress: '—',
          sramAddress: '0xB3',
          bits: 'OCR2A[7:0] (comparação PWM no pino PB3/OC2A)',
          description: 'Define a razão cíclica do PWM no pino PB3 (D11).',
          page: 'Folhas 166 e 622'
        },
        {
          name: 'OCR2B',
          ioAddress: '—',
          sramAddress: '0xB4',
          bits: 'OCR2B[7:0] (comparação PWM no pino PD3/OC2B)',
          description: 'Define a razão cíclica do PWM no pino PD3 (D3).',
          page: 'Folhas 166 e 622'
        },
        {
          name: 'TIMSK2',
          ioAddress: '—',
          sramAddress: '0x70',
          bits: '–, –, –, –, –, OCIE2B, OCIE2A, TOIE2',
          description: 'Habilita interrupções do Timer2; TOIE2=1 habilita o estouro no vetor 0x0012.',
          page: 'Folhas 166 e 623'
        }
      ],
      blockTypes: ['avr_timer2_start', 'avr_timer2_isr'],
      libraryRoutines: ['start_timer2', 'pwm_write_pb3', 'pwm_write_pd3'],
      mnemonics: [],
      blockToAsmExamples: [
        {block: 'Iniciar Timer2 (avr_timer2_start)', asm: 'rcall start_timer2'},
        {block: 'Interrupção Timer2 (avr_timer2_isr)', asm: '.org 0x0012 / jmp TIM2_OVERFLOW / sts TCNT2, r16 / reti'},
        {block: 'PWM em PB3 ou PD3 (avr_pwm_write)', asm: 'mov pwm_value, r16 / rcall pwm_write_pb3 (ou pwm_write_pd3)'}
      ]
    },
    {
      id: 'usart0',
      title: 'Porta Serial USART0 (Assíncrona 9600 bps em PD0/PD1)',
      shortTitle: 'Porta Serial (USART0)',
      summary: 'Transmissor e receptor serial universal síncrono/assíncrono (USART0) ligado aos pinos PD0 (RXD) e PD1 (TXD), configurado pela lib328Pv03.inc para 9600 bps, 8N1 a 16 MHz.',
      didacticIntro: 'Com UBRR0 = 103 a 16 MHz (9600 bps, erro de 0,2%) e RXEN0=1 / TXEN0=1 em UCSR0B, o programa envia bytes escrevendo em UDR0 após verificar UDRE0=1 em UCSR0A e lê bytes recebidos de UDR0 quando RXC0=1.',
      diagramId: 'usart0',
      datasheetDoc: DATASHEET_DOC,
      datasheetSection: 'Seção 20 (USART0: 20.2 Overview, 20.3 Clock Generation e 20.11 Register Description)',
      datasheetFigure: 'Figure 20-1 (USART Block Diagram) e Figure 20-2 (Clock Generation Logic, Block Diagram)',
      datasheetPage: 'Folhas 179–181, 200–204 e 621',
      externalNote: null,
      registers: [
        {
          name: 'UBRR0H:UBRR0L',
          ioAddress: '—',
          sramAddress: '0xC5:0xC4',
          bits: 'UBRR0[11:0] (103 para 9600 bps a 16 MHz com U2X0=0)',
          description: 'Define o divisor de taxa de transmissão (Baud Rate Generator); 103 produz 9600 bps com clock de 16 MHz.',
          page: 'Folhas 204 e 621'
        },
        {
          name: 'UCSR0A',
          ioAddress: '—',
          sramAddress: '0xC0',
          bits: 'RXC0, TXC0, UDRE0, FE0, DOR0, UPE0, U2X0, MPCM0',
          description: 'Sinaliza o estado da USART0: UDRE0=1 indica buffer de transmissão pronto; RXC0=1 indica byte recebido pronto em UDR0.',
          page: 'Folhas 200 e 621'
        },
        {
          name: 'UCSR0B',
          ioAddress: '—',
          sramAddress: '0xC1',
          bits: 'RXCIE0, TXCIE0, UDRIE0, RXEN0, TXEN0, UCSZ02, RXB80, TXB80',
          description: 'Habilita o receptor (RXEN0 em PD0) e o transmissor (TXEN0 em PD1), além das interrupções seriais.',
          page: 'Folhas 201 e 621'
        },
        {
          name: 'UCSR0C',
          ioAddress: '—',
          sramAddress: '0xC2',
          bits: 'UMSEL01, UMSEL00, UPM01, UPM00, USBS0, UCSZ01, UCSZ00, UCPOL0 (8N1 padrão)',
          description: 'Configura o formato do quadro serial (modo assíncrono, paridade, bits de parada e 8 bits de dados por padrão após reset).',
          page: 'Folhas 202 e 621'
        },
        {
          name: 'UDR0',
          ioAddress: '—',
          sramAddress: '0xC6',
          bits: 'UDR0[7:0] (buffer de transmissão TX e recepção RX em PD1/PD0)',
          description: 'Registrador compartilhado de dados: escrever envia um byte pelo transmissor; ler obtém o byte recebido no buffer RX.',
          page: 'Folhas 200 e 621'
        }
      ],
      blockTypes: ['avr_usart_init', 'avr_usart_transmit_char', 'avr_usart_transmit_number', 'avr_usart_receive_char'],
      libraryRoutines: ['usart_init', 'usart_transmit', 'usart_transmit_number', 'usart_receive'],
      mnemonics: [],
      blockToAsmExamples: [
        {block: 'Inicializar serial (avr_usart_init)', asm: 'rcall usart_init'},
        {block: 'Enviar caractere / número (avr_usart_transmit_*)', asm: 'rcall usart_transmit / rcall usart_transmit_number'},
        {block: 'Receber caractere (avr_usart_receive_char)', asm: 'rcall usart_receive / mov r16, receive_caracter'}
      ]
    },
    {
      id: 'eeprom',
      title: 'Memória EEPROM Interna Não Volátil (1 KB)',
      shortTitle: 'Memória EEPROM',
      summary: 'Memória não volátil de 1.024 bytes do ATmega328P acessada indiretamente pelos registradores EEARH:EEARL (endereço), EEDR (dado) e EECR (controle temporizado EEMPE/EEPE/EERE).',
      didacticIntro: 'Para gravar sem perda de dados após desligar a alimentação, é obrigatório aguardar EEPE=0, gravar o endereço em EEARL e o byte em EEDR, ativar EEMPE e acionar EEPE dentro de até 4 ciclos de clock. Para ler, define-se EEARL e aciona-se EERE, recuperando o byte em EEDR.',
      diagramId: 'eeprom',
      datasheetDoc: DATASHEET_DOC,
      datasheetSection: 'Seção 8.4 (EEPROM Data Memory) e Seção 8.6 (Register Description: 8.6.1–8.6.3)',
      datasheetFigure: 'Figure 2-1 (Block Diagram) — sem figura de bloco interno exclusiva na Seção 8.4',
      datasheetPage: 'Folhas 15, 29–34 e 623',
      externalNote: null,
      registers: [
        {
          name: 'EEARH:EEARL',
          ioAddress: '0x22:0x21',
          sramAddress: '0x42:0x41',
          bits: 'EEAR[9:0] (lib328Pv03.inc usa EEARL para endereços 0–255)',
          description: 'Define o endereço da célula EEPROM (0 a 1023 no ATmega328P; os blocos da interface trabalham com endereços de 8 bits 0–255 via EEARL).',
          page: 'Folhas 31 e 623'
        },
        {
          name: 'EEDR',
          ioAddress: '0x20',
          sramAddress: '0x40',
          bits: 'EEDR[7:0] (byte de dado lido ou gravado na EEPROM)',
          description: 'Armazena o byte a ser gravado na escrita ou o byte recuperado imediatamente após acionar EERE na leitura.',
          page: 'Folhas 31 e 623'
        },
        {
          name: 'EECR',
          ioAddress: '0x1F',
          sramAddress: '0x3F',
          bits: '–, –, EEPM1, EEPM0, EERIE, EEMPE, EEPE, EERE',
          description: 'Controla a operação da EEPROM: EEMPE habilita a gravação temporizada, EEPE inicia e sinaliza gravação em curso e EERE dispara a leitura.',
          page: 'Folhas 31 e 623'
        }
      ],
      blockTypes: ['avr_eeprom_write', 'avr_eeprom_read'],
      libraryRoutines: ['eeprom_write', 'eeprom_read'],
      mnemonics: [],
      blockToAsmExamples: [
        {block: 'Gravar na EEPROM (avr_eeprom_write)', asm: 'push r16 / mov eeprom_number, r16 / pop eeprom_address / rcall eeprom_write'},
        {block: 'Ler da EEPROM (avr_eeprom_read)', asm: 'mov eeprom_address, r16 / rcall eeprom_read / mov r16, eeprom_number'}
      ]
    },
    {
      id: 'portd-displays',
      title: 'Displays Didáticos no PORTD (LCD 16×2 em 4 bits e 7 Segmentos BCD)',
      shortTitle: 'Displays no PORTD',
      summary: 'Mapeamento do Porto D (DDRD/PORTD) do ATmega328P pela biblioteca lib328Pv03.inc para acionar módulos externos: Display LCD 16×2 (HD44780, 4 bits em PD2..PD7) ou Display de 7 segmentos BCD (PD0..PD7).',
      didacticIntro: 'Diferente de timers ou USART, o LCD 16×2 e o display de 7 segmentos não são periféricos internos do silício do ATmega328P: eles são circuitos externos conectados aos pinos digitais do PORTD e controlados via DDRD e PORTD pelas sub-rotinas de lib328Pv03.inc.',
      diagramId: 'portd-displays',
      datasheetDoc: DATASHEET_DOC,
      datasheetSection: 'Seção 14.3.3 (Alternate Functions of Port D), Seção 14.4.8–14.4.9 (PORTD/DDRD) e biblioteca didática lib328Pv03.inc',
      datasheetFigure: 'Figure 14-2 (General Digital I/O) — LCD HD44780 e 7 segmentos BCD são módulos externos ligados ao PORTD',
      datasheetPage: 'Folhas 85, 97, 101 e 624 (PORTD/DDRD no ATmega328P) · lib328Pv03.inc',
      externalNote: 'Os módulos Display LCD 16×2 (controlador externo HD44780, modo 4 bits em PD2=RS, PD3=ENABLE, PD4..PD7=D4..D7) e Display de 7 segmentos BCD (PD7..PD4=dezena, PD3..PD0=unidade) não fazem parte do silício interno do ATmega328P; o controle é feito pelo PORTD conforme as sub-rotinas de lib328Pv03.inc.',
      registers: [
        {
          name: 'DDRD',
          ioAddress: '0x0A',
          sramAddress: '0x2A',
          bits: 'DDD7..DDD0 (PD2..PD7 em saída no LCD; PD0..PD7 em saída no 7 segmentos)',
          description: 'Configura os pinos do Porto D como saídas digitais para enviar comandos/dados ao LCD ou dígitos BCD ao display de 7 segmentos.',
          page: 'Folhas 101 e 624'
        },
        {
          name: 'PORTD',
          ioAddress: '0x0B',
          sramAddress: '0x2B',
          bits: 'PORTD7..PORTD0 (nibbles de dados/controle do LCD ou dígitos BCD dezena/unidade)',
          description: 'Transporta os nibbles D7..D4 + sinais RS (PD2) e ENABLE (PD3) no LCD, ou os nibbles BCD de dezena (PD7..PD4) e unidade (PD3..PD0) no 7 segmentos.',
          page: 'Folhas 101 e 624'
        }
      ],
      blockTypes: [
        'avr_lcd_init', 'avr_lcd_clear', 'avr_lcd_cursor',
        'avr_lcd_write_char', 'avr_lcd_write_number',
        'avr_display7_write', 'avr_display7_off'
      ],
      libraryRoutines: [
        'lcd_init', 'lcd_clear', 'lcd_lin0_col', 'lcd_lin1_col',
        'lcd_write_caracter', 'lcd_write_number', 'pulse_enable',
        'display_write', 'display_off'
      ],
      mnemonics: [],
      blockToAsmExamples: [
        {block: 'Inicializar / Escrever LCD (avr_lcd_*)', asm: 'rcall lcd_init / rcall lcd_write_caracter / rcall lcd_write_number'},
        {block: 'Display 7 segmentos (avr_display7_write / avr_display7_off)', asm: 'mov display_number, r16 / rcall display_write / rcall display_off'}
      ]
    }
  ];

  var topicsById = Object.create(null);
  var topicsByBlockType = Object.create(null);
  var topicsByMnemonic = Object.create(null);

  (function buildIndexes() {
    for (var i = 0; i < TOPICS.length; i++) {
      var topic = TOPICS[i];
      topicsById[topic.id] = topic;
      for (var b = 0; b < topic.blockTypes.length; b++) {
        topicsByBlockType[topic.blockTypes[b]] = topic;
      }
      for (var m = 0; m < topic.mnemonics.length; m++) {
        topicsByMnemonic[topic.mnemonics[m].toLowerCase()] = topic;
      }
    }
  }());

  function listTopics() {
    return TOPICS.slice();
  }

  function getTopic(id) {
    if (typeof id !== 'string') return null;
    return topicsById[id] || null;
  }

  function joinOperands(operands) {
    if (Array.isArray(operands)) return operands.join(' ');
    return operands == null ? '' : String(operands);
  }

  function getTopicForBlockType(blockType, context) {
    if (typeof blockType !== 'string' || !blockType) return null;
    if (blockType === 'avr_pwm_write') {
      var ctxText = '';
      if (typeof context === 'string') {
        ctxText = context;
      } else if (context && typeof context === 'object') {
        ctxText = [context.pinId || '', context.routine || '', joinOperands(context.operands)].join(' ');
      }
      if (/\b(?:PD6|PD5|pwm_write_pd6|pwm_write_pd5|OCR0A|OCR0B)\b/i.test(ctxText)) {
        return topicsById.timer0;
      }
      if (/\b(?:PB3|PD3|pwm_write_pb3|pwm_write_pd3|OCR2A|OCR2B)\b/i.test(ctxText)) {
        return topicsById.timer2;
      }
      return topicsById.timer1;
    }
    return topicsByBlockType[blockType] || null;
  }

  function getTopicForInstruction(mnemonic, operands) {
    var opText = joinOperands(operands);
    if (/\b(?:lcd_init|lcd_clear|lcd_lin0_col|lcd_lin1_col|lcd_write_caracter|lcd_write_number|pulse_enable|display_write|display_off|lcd_col|lcd_number|lcd_caracter|display_number)\b/i.test(opText)) {
      return topicsById['portd-displays'];
    }
    if (/\b(?:analog_read|analog_read_channel|ADMUX|ADCSRA|ADCH|ADCL|adc_value)\b/i.test(opText)) {
      return topicsById.adc;
    }
    if (/\b(?:usart_init|usart_transmit|usart_transmit_number|usart_receive|UBRR0|UBRR0H|UBRR0L|UCSR0A|UCSR0B|UCSR0C|UDR0|transmit_caracter|receive_caracter)\b/i.test(opText)) {
      return topicsById.usart0;
    }
    if (/\b(?:eeprom_write|eeprom_read|EEAR|EEARH|EEARL|EEDR|EECR|eeprom_address|eeprom_number)\b/i.test(opText)) {
      return topicsById.eeprom;
    }
    if (/\b(?:start_timer0|TIM0_OVERFLOW|pwm_write_pd6|pwm_write_pd5|TCCR0A|TCCR0B|TCNT0|OCR0A|OCR0B|TIMSK0|TIFR0|OVF0)\b/i.test(opText)) {
      return topicsById.timer0;
    }
    if (/\b(?:start_timer2|TIM2_OVERFLOW|pwm_write_pb3|pwm_write_pd3|TCCR2A|TCCR2B|TCNT2|OCR2A|OCR2B|TIMSK2|TIFR2|OVF2)\b/i.test(opText)) {
      return topicsById.timer2;
    }
    if (/\b(?:start_timer1|TIM1_OVERFLOW|pwm_write_pb1|pwm_write_pb2|pwm_write|TCCR1A|TCCR1B|TCNT1H|TCNT1L|OCR1AH|OCR1AL|OCR1BH|OCR1BL|TIMSK1|TIFR1|OVF1|pwm_value)\b/i.test(opText)) {
      return topicsById.timer1;
    }
    if (/\b(?:DDR|PORT|PIN)[BCD]\b/i.test(opText)) {
      return topicsById.gpio;
    }
    var key = typeof mnemonic === 'string' ? mnemonic.trim().toLowerCase() : '';
    if (!key) return null;
    return topicsByMnemonic[key] || topicsById['cpu-core'];
  }

  function formatReference(topic) {
    if (!topic) return '';
    return 'Referência: Microchip ' + topic.datasheetDoc + ' · ' + topic.datasheetSection + ' · ' + topic.datasheetPage;
  }

  return {
    DATASHEET_DOC: DATASHEET_DOC,
    DATASHEET_TITLE: DATASHEET_TITLE,
    listTopics: listTopics,
    getTopic: getTopic,
    getTopicForBlockType: getTopicForBlockType,
    getTopicForInstruction: getTopicForInstruction,
    formatReference: formatReference
  };
}));
