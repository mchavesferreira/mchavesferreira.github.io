(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AvrDatasheetDiagrams = factory();
  }
}(this, function () {
  'use strict';

  var SVG_WIDTH = 640;
  var SVG_HEIGHT = 270;

  var PALETTE = {
    bg: '#f8fafc',
    border: '#cbd5e1',
    headerBg: '#e2e8f0',
    headerInk: '#0f172a',
    boxBg: '#ffffff',
    boxStroke: '#64748b',
    accentBg: '#dbeafe',
    accentStroke: '#2563eb',
    warnBg: '#fef3c7',
    warnStroke: '#d97706',
    greenBg: '#dcfce7',
    greenStroke: '#16a34a',
    purpleBg: '#ede9fe',
    purpleStroke: '#7c3aed',
    ink: '#1e293b',
    muted: '#475569',
    arrow: '#334155'
  };

  function escapeXml(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function box(x, y, w, h, title, lines, style) {
    var cfg = style || {};
    var fill = cfg.fill || PALETTE.boxBg;
    var stroke = cfg.stroke || PALETTE.boxStroke;
    var titleColor = cfg.titleColor || PALETTE.headerInk;
    var subColor = cfg.subColor || PALETTE.muted;
    var out = [];
    var i;
    var lineY = y + 36;
    out.push('<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="6" ry="6" fill="' + fill + '" stroke="' + stroke + '" stroke-width="1.5"/>');
    out.push('<text x="' + (x + Math.round(w / 2)) + '" y="' + (y + 18) + '" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-size="11.5" font-weight="700" fill="' + titleColor + '">' + escapeXml(title) + '</text>');
    if (lines && lines.length) {
      for (i = 0; i < lines.length; i++) {
        out.push('<text x="' + (x + Math.round(w / 2)) + '" y="' + (lineY + i * 14) + '" text-anchor="middle" font-family="ui-monospace,Consolas,monospace" font-size="10" fill="' + subColor + '">' + escapeXml(lines[i]) + '</text>');
      }
    }
    return out.join('');
  }

  function arrow(diagramId, x1, y1, x2, y2, label, labelDx, labelDy) {
    var markerId = 'avr-arrow-' + diagramId;
    var out = [];
    var mx = Math.round((x1 + x2) / 2) + (labelDx || 0);
    var my = Math.round((y1 + y2) / 2) + (labelDy || -5);
    out.push('<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + PALETTE.arrow + '" stroke-width="1.6" marker-end="url(#' + markerId + ')"/>');
    if (label) {
      out.push('<text x="' + mx + '" y="' + my + '" text-anchor="middle" font-family="ui-monospace,Consolas,monospace" font-size="9.5" font-weight="600" fill="' + PALETTE.ink + '">' + escapeXml(label) + '</text>');
    }
    return out.join('');
  }

  function svgWrap(diagramId, titleText, descText, footerText, body) {
    var titleId = 'avr-svg-title-' + diagramId;
    var descId = 'avr-svg-desc-' + diagramId;
    var markerId = 'avr-arrow-' + diagramId;
    var parts = [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + SVG_WIDTH + ' ' + SVG_HEIGHT + '" width="100%" preserveAspectRatio="xMidYMid meet" style="width:100%;height:auto;display:block;max-width:100%;" role="img" aria-labelledby="' + titleId + ' ' + descId + '">',
      '<title id="' + titleId + '">' + escapeXml(titleText) + '</title>',
      '<desc id="' + descId + '">' + escapeXml(descText) + '</desc>',
      '<defs>',
      '<marker id="' + markerId + '" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">',
      '<path d="M 0 1 L 10 5 L 0 9 z" fill="' + PALETTE.arrow + '"/>',
      '</marker>',
      '</defs>',
      '<rect x="1" y="1" width="' + (SVG_WIDTH - 2) + '" height="' + (SVG_HEIGHT - 2) + '" rx="8" ry="8" fill="' + PALETTE.bg + '" stroke="' + PALETTE.border + '" stroke-width="1.5"/>',
      '<rect x="1" y="1" width="' + (SVG_WIDTH - 2) + '" height="28" rx="8" ry="8" fill="' + PALETTE.headerBg + '"/>',
      '<text x="14" y="19" font-family="system-ui,-apple-system,sans-serif" font-size="12" font-weight="700" fill="' + PALETTE.headerInk + '">' + escapeXml(titleText) + '</text>',
      body,
      '<text x="14" y="' + (SVG_HEIGHT - 10) + '" font-family="system-ui,-apple-system,sans-serif" font-size="9.5" fill="' + PALETTE.muted + '">' + escapeXml(footerText) + '</text>',
      '</svg>'
    ];
    return parts.join('');
  }

  function buildCpuCore() {
    var body = [
      box(20, 44, 155, 62, 'Program Flash + PC', ['32 KB (16K x 16-bit)', 'Reset/Int Vectors'], {fill: PALETTE.accentBg, stroke: PALETTE.accentStroke}),
      box(20, 122, 155, 58, '32 x 8 Reg File', ['R0..R31 (0x0000..0x001F)', 'X(R27:26) Y(29:28) Z(31:30)'], {fill: PALETTE.boxBg, stroke: PALETTE.boxStroke}),
      box(225, 44, 175, 62, 'Instruction Decoder + ALU', ['Harvard 2-stage pipeline', '1 clock R-R / Flags -> SREG'], {fill: PALETTE.purpleBg, stroke: PALETTE.purpleStroke}),
      box(225, 122, 175, 58, 'SREG (0x3F / 0x5F)', ['I T H S V N Z C', 'Branch / SEI / CLI'], {fill: PALETTE.warnBg, stroke: PALETTE.warnStroke}),
      box(445, 44, 175, 62, 'SPH / SPL (0x3E / 0x3D)', ['Stack Pointer -> RAMEND', '0x08FF (CALL/PUSH/RET)'], {fill: PALETTE.greenBg, stroke: PALETTE.greenStroke}),
      box(445, 122, 175, 58, 'Internal SRAM (2 KB)', ['Data Space 0x0100..0x08FF', '64 I/O + 160 Ext I/O'], {fill: PALETTE.boxBg, stroke: PALETTE.boxStroke}),
      box(20, 194, 600, 42, 'System Clock & Reset (Prescaler CLKPR) -> clk_CPU / clk_I/O / clk_ADC / clk_FLASH', ['Arduino Uno 16 MHz -> 1 ciclo = 62,5 ns (delay loops via R18..R25)'], {fill: PALETTE.boxBg, stroke: PALETTE.border}),
      arrow('cpu-core', 175, 74, 225, 74, 'IR', 0, -6),
      arrow('cpu-core', 175, 150, 225, 150, 'Op', 0, -6),
      arrow('cpu-core', 312, 106, 312, 122, 'Z/C', 16, 2),
      arrow('cpu-core', 400, 74, 445, 74, 'PC', 0, -6),
      arrow('cpu-core', 532, 106, 532, 122, 'SP', 14, 2)
    ].join('');
    return svgWrap(
      'cpu-core',
      'CPU AVR 8-bit, Pilha e Memoria (ATmega328P)',
      'Arquitetura Harvard do ATmega328P: Flash, banco R0-R31, ALU, SREG, ponteiro de pilha SPH/SPL e SRAM ate RAMEND 0x08FF.',
      'Ref.: Microchip DS40002061B - Fig. 7-1, Fig. 7-2 e Fig. 8-3 - Folhas 18-23, 28 e 623',
      body
    );
  }

  function buildGpio() {
    var body = [
      box(20, 46, 170, 54, 'DDRx (Direcao)', ['1 = Saida / 0 = Entrada', 'DDRB(0x04) DDRC(0x07) DDRD(0x0A)'], {fill: PALETTE.accentBg, stroke: PALETTE.accentStroke}),
      box(20, 114, 170, 54, 'PORTx (Data / Pull-up)', ['Saida 0/1 ou Pull-up (se DDRx=0)', 'PORTB(0x05) PORTC(0x08) PORTD(0x0B)'], {fill: PALETTE.greenBg, stroke: PALETTE.greenStroke}),
      box(20, 182, 170, 54, 'PINx (Input / Toggle)', ['Le pino fisico apos sincronizador', 'PINB(0x03) PINC(0x06) PIND(0x09)'], {fill: PALETTE.warnBg, stroke: PALETTE.warnStroke}),
      box(245, 46, 175, 122, 'Driver de Saida + Pull-up', ['PUD em MCUCR desabilita pull-up', 'Buffer tri-state controlado por DDRx', 'Sink/Source ate 40 mA max/pino'], {fill: PALETTE.boxBg, stroke: PALETTE.boxStroke}),
      box(245, 182, 175, 54, 'Sincronizador 2 Flip-Flops', ['Amostra pino em clk_I/O', '1 NOP entre escrita e leitura'], {fill: PALETTE.purpleBg, stroke: PALETTE.purpleStroke}),
      box(470, 74, 150, 146, 'Pino Fisico Pxn', ['PB0..PB5 (D8..D13)', 'PC0..PC5 (A0..A5)', 'PD0..PD7 (D0..D7)', 'Diodo clamp VCC/GND'], {fill: PALETTE.accentBg, stroke: PALETTE.accentStroke}),
      arrow('gpio', 190, 73, 245, 73, 'Dir', 0, -6),
      arrow('gpio', 190, 141, 245, 141, 'Out', 0, -6),
      arrow('gpio', 420, 118, 470, 118, 'Pad', 0, -6),
      arrow('gpio', 470, 206, 420, 206, 'In', 0, -6),
      arrow('gpio', 245, 209, 190, 209, 'Sync', 0, -6)
    ].join('');
    return svgWrap(
      'gpio',
      'Porta Digital I/O Sincronizada (DDRx / PORTx / PINx)',
      'Esquema interno de cada pino I/O do ATmega328P: registradores DDRx, PORTx, PINx, driver tri-state, pull-up interno e sincronizador de entrada.',
      'Ref.: Microchip DS40002061B - Fig. 14-1 e Fig. 14-2 (Secao 14.2) - Folhas 84-86, 100-101 e 624',
      body
    );
  }

  function buildAdc() {
    var body = [
      box(20, 48, 130, 108, 'Multiplexador ADC', ['ADC0..ADC5 (PC0..PC5)', 'Temp / 1.1V / GND', 'ADMUX[3:0] = MUX'], {fill: PALETTE.accentBg, stroke: PALETTE.accentStroke}),
      box(20, 172, 130, 62, 'Referencia Vref', ['ADMUX[7:6] REFS1:0', 'AVCC (01) / Int 1.1V (11)'], {fill: PALETTE.warnBg, stroke: PALETTE.warnStroke}),
      box(195, 48, 165, 92, 'Sample & Hold + DAC 10-bit', ['Logica SAR (13 ciclos ADC)', 'Primeira conversao: 25 ciclos'], {fill: PALETTE.purpleBg, stroke: PALETTE.purpleStroke}),
      box(195, 158, 165, 76, 'Prescaler clk_ADC', ['ADCSRA[2:0] ADPS2:0', '16 MHz / 128 = 125 kHz', 'Alvo datasheet: 50..200 kHz'], {fill: PALETTE.greenBg, stroke: PALETTE.greenStroke}),
      box(410, 48, 210, 86, 'ADCH : ADCL (0x79 / 0x78)', ['ADLAR=0 -> ADCL lido antes de ADCH', 'ADLAR=1 -> 8 bits altos em ADCH'], {fill: PALETTE.boxBg, stroke: PALETTE.boxStroke}),
      box(410, 152, 210, 82, 'ADCSRA (0x7A) / ADCSRB (0x7B)', ['ADEN=1 | ADSC=1 inicia | ADIF flag', 'DIDR0 (0x7E) desliga buffer digital'], {fill: PALETTE.boxBg, stroke: PALETTE.boxStroke}),
      arrow('adc', 150, 92, 195, 92, 'Vin', 0, -6),
      arrow('adc', 150, 198, 275, 140, 'Vref', -8, -4),
      arrow('adc', 277, 158, 277, 140, 'clk', 16, 2),
      arrow('adc', 360, 88, 410, 88, '10b', 0, -6),
      arrow('adc', 515, 152, 515, 134, 'Ctrl', 18, 2)
    ].join('');
    return svgWrap(
      'adc',
      'Conversor Analogico-Digital SAR 10-bit (ADC)',
      'Diagrama de blocos do ADC do ATmega328P: multiplexador ADC0-ADC5, referencia ADMUX, Sample-and-Hold, DAC SAR 10 bits, prescaler 125 kHz e registradores ADCL/ADCH.',
      'Ref.: Microchip DS40002061B - Fig. 24-1 (Secoes 24.2 e 24.9) - Folhas 246-247, 257-259 e 622-623',
      body
    );
  }

  function buildTimerSvg(cfg) {
    var body = [
      box(20, 48, 155, 86, cfg.clkTitle, cfg.clkLines, {fill: PALETTE.greenBg, stroke: PALETTE.greenStroke}),
      box(20, 152, 155, 82, cfg.ctrlTitle, cfg.ctrlLines, {fill: PALETTE.warnBg, stroke: PALETTE.warnStroke}),
      box(225, 48, 185, 92, cfg.cntTitle, cfg.cntLines, {fill: PALETTE.accentBg, stroke: PALETTE.accentStroke}),
      box(225, 158, 185, 76, cfg.cmpTitle, cfg.cmpLines, {fill: PALETTE.purpleBg, stroke: PALETTE.purpleStroke}),
      box(460, 48, 160, 86, cfg.irqTitle, cfg.irqLines, {fill: PALETTE.boxBg, stroke: PALETTE.boxStroke}),
      box(460, 152, 160, 82, cfg.outTitle, cfg.outLines, {fill: PALETTE.accentBg, stroke: PALETTE.accentStroke}),
      arrow(cfg.id, 175, 91, 225, 91, 'clk_T', 0, -6),
      arrow(cfg.id, 175, 193, 225, 193, 'WGM', 0, -6),
      arrow(cfg.id, 317, 140, 317, 158, '==', 12, 2),
      arrow(cfg.id, 410, 91, 460, 91, cfg.irqLabel, 0, -6),
      arrow(cfg.id, 410, 193, 460, 193, 'OCx', 0, -6)
    ].join('');
    return svgWrap(cfg.id, cfg.title, cfg.desc, cfg.footer, body);
  }

  function buildTimer0() {
    return buildTimerSvg({
      id: 'timer0',
      title: 'Timer/Counter0 8-bit, PWM e Overflow (TC0)',
      desc: 'Timer0 de 8 bits do ATmega328P com prescaler de 10 bits, TCNT0, comparadores OCR0A/OCR0B, pinos OC0A/OC0B e vetor de overflow 0x0020.',
      footer: 'Ref.: Microchip DS40002061B - Fig. 15-1, Fig. 15-3 e Table 12-6 (0x0020) - Folhas 74, 102, 105, 113-118 e 623',
      clkTitle: 'Prescaler clk_I/O (10-bit)',
      clkLines: ['CS0[2:0] em TCCR0B (0x25)', '/1, /8, /64, /256, /1024', 'Ou clock externo T0 (PD4)'],
      ctrlTitle: 'Modos TCCR0A / TCCR0B',
      ctrlLines: ['Normal / CTC / Fast PWM', 'WGM0[2:0] -> TOP=0xFF ou OCR0A'],
      cntTitle: 'Contador TCNT0 (8-bit)',
      cntLines: ['End. I/O 0x26 (SRAM 0x46)', 'Conta 0..255 (overflow TOV0)'],
      cmpTitle: 'Comparadores OCR0A / OCR0B',
      cmpLines: ['OCR0A (0x27) / OCR0B (0x28)', 'Match gera OCF0A/OCF0B'],
      irqTitle: 'TIMSK0 / TIFR0 (0x6E / 0x15)',
      irqLines: ['TOIE0 -> TIMER0_OVF', 'Vetor 17 = 0x0020'],
      outTitle: 'Saidas PWM OC0A / OC0B',
      outLines: ['OC0A = PD6 (Arduino D6)', 'OC0B = PD5 (Arduino D5)'],
      irqLabel: 'TOV0'
    });
  }

  function buildTimer1() {
    return buildTimerSvg({
      id: 'timer1',
      title: 'Timer/Counter1 16-bit, PWM e Input Capture (TC1)',
      desc: 'Timer1 de 16 bits do ATmega328P com prescaler, TCNT1H/TCNT1L, comparadores OCR1A/OCR1B de 16 bits, ICR1 e vetor de overflow 0x001A.',
      footer: 'Ref.: Microchip DS40002061B - Fig. 16-1, Fig. 16-4 e Table 12-6 (0x001A) - Folhas 74, 120-121, 129, 140-145 e 622-623',
      clkTitle: 'Prescaler clk_I/O (10-bit)',
      clkLines: ['CS1[2:0] em TCCR1B (0x81)', '/1, /8, /64, /256, /1024', 'Ou T1 (PD5) / ICP1 (PB0)'],
      ctrlTitle: 'Modos TCCR1A / TCCR1B',
      ctrlLines: ['TCCR1A(0x80) TCCR1B(0x81)', 'WGM1[3:0]: CTC, PWM 8/9/10/ICR1'],
      cntTitle: 'TCNT1H : TCNT1L (16-bit)',
      cntLines: ['0x85 : 0x84 (Temp Reg 8-bit)', 'Escreva High antes de Low'],
      cmpTitle: 'OCR1A / OCR1B / ICR1 (16b)',
      cmpLines: ['OCR1A(0x89:88) OCR1B(0x8B:8A)', 'ICR1(0x87:86) TOP ou Capture'],
      irqTitle: 'TIMSK1 / TIFR1 (0x6F / 0x16)',
      irqLines: ['TOIE1 -> TIMER1_OVF', 'Vetor 14 = 0x001A'],
      outTitle: 'Saidas PWM OC1A / OC1B',
      outLines: ['OC1A = PB1 (Arduino D9)', 'OC1B = PB2 (Arduino D10)'],
      irqLabel: 'TOV1'
    });
  }

  function buildTimer2() {
    return buildTimerSvg({
      id: 'timer2',
      title: 'Timer/Counter2 8-bit Assincrono e PWM (TC2)',
      desc: 'Timer2 de 8 bits do ATmega328P com prescaler proprio (/1 a /1024 incluindo /32 e /128), ASSR assincrono, TCNT2, OCR2A/OCR2B e vetor 0x0012.',
      footer: 'Ref.: Microchip DS40002061B - Fig. 18-1, Fig. 18-3 e Table 12-6 (0x0012) - Folhas 74, 150, 153, 162-167 e 622-623',
      clkTitle: 'Prescaler TC2 + ASSR (0xB6)',
      clkLines: ['CS2[2:0] em TCCR2B (0xB1)', '/1, /8, /32, /64, /128, /256, /1024', 'Opcional TOSC1/TOSC2 32.768 kHz'],
      ctrlTitle: 'Modos TCCR2A / TCCR2B',
      ctrlLines: ['TCCR2A(0xB0) TCCR2B(0xB1)', 'Normal / CTC / Fast & Phase PWM'],
      cntTitle: 'Contador TCNT2 (8-bit)',
      cntLines: ['End. SRAM 0xB2 (Ext I/O)', 'Conta 0..255 (overflow TOV2)'],
      cmpTitle: 'Comparadores OCR2A / OCR2B',
      cmpLines: ['OCR2A (0xB3) / OCR2B (0xB4)', 'Match gera OCF2A/OCF2B'],
      irqTitle: 'TIMSK2 / TIFR2 (0x70 / 0x17)',
      irqLines: ['TOIE2 -> TIMER2_OVF', 'Vetor 10 = 0x0012'],
      outTitle: 'Saidas PWM OC2A / OC2B',
      outLines: ['OC2A = PB3 (Arduino D11)', 'OC2B = PD3 (Arduino D3)'],
      irqLabel: 'TOV2'
    });
  }

  function buildUsart0() {
    var body = [
      box(20, 48, 170, 74, 'Baud Rate Generator', ['UBRR0H (0xC5) : UBRR0L (0xC4)', '16 MHz, 9600 bps -> UBRR0 = 103', 'U2X0 em UCSR0A (0xC0)'], {fill: PALETTE.greenBg, stroke: PALETTE.greenStroke}),
      box(20, 140, 170, 94, 'Controle UART (UCSR0B/C)', ['UCSR0B (0xC1): RXEN0 / TXEN0', 'UCSR0C (0xC2): 8N1 (UCSZ01:0=11)', 'Status UCSR0A: RXC0 UDRE0 TXC0'], {fill: PALETTE.warnBg, stroke: PALETTE.warnStroke}),
      box(240, 48, 175, 84, 'Transmissor TX (TXD / PD1)', ['UDR0 (0xC6) -> TX Shift Reg', 'Aguarda UDRE0=1 antes de LDS/STS', 'Pino fisico PD1 (Arduino D1)'], {fill: PALETTE.accentBg, stroke: PALETTE.accentStroke}),
      box(240, 150, 175, 84, 'Receptor RX (RXD / PD0)', ['RX Shift Reg -> FIFO RX UDR0', 'Aguarda RXC0=1 para ler UDR0', 'Pino fisico PD0 (Arduino D0)'], {fill: PALETTE.purpleBg, stroke: PALETTE.purpleStroke}),
      box(465, 76, 155, 130, 'Barramento Serial', ['TXD -> PD1 (Saida)', 'RXD <- PD0 (Entrada)', 'Frame 8N1: 1 start,', '8 dados, 1 stop bit'], {fill: PALETTE.boxBg, stroke: PALETTE.boxStroke}),
      arrow('usart0', 190, 84, 240, 84, 'TxClk', 0, -6),
      arrow('usart0', 190, 184, 240, 184, 'Ctrl', 0, -6),
      arrow('usart0', 415, 92, 465, 108, 'TXD', 0, -6),
      arrow('usart0', 465, 176, 415, 188, 'RXD', 0, -6)
    ].join('');
    return svgWrap(
      'usart0',
      'USART0 Serial Assincrona (UBRR0 / UCSR0A..C / UDR0)',
      'Estrutura interna da USART0 do ATmega328P: gerador de baud rate UBRR0, transmissor TXD em PD1, receptor RXD em PD0 e flags RXC0/UDRE0 em UCSR0A.',
      'Ref.: Microchip DS40002061B - Fig. 20-1 e Fig. 20-2 (Secao 20) - Folhas 179-181, 200-204 e 621',
      body
    );
  }

  function buildEeprom() {
    var body = [
      box(20, 48, 175, 82, 'Endereco EEARH : EEARL', ['EEARH (0x22) [0] / EEARL (0x21)', 'Faixa 0x0000..0x03FF (1024 bytes)', 'Aponta byte na EEPROM interna'], {fill: PALETTE.accentBg, stroke: PALETTE.accentStroke}),
      box(20, 148, 175, 86, 'Dados EEDR (0x20)', ['Escreva o byte antes de gravar', 'Recebe o byte lido apos EERE=1', 'Retencao nao volatil'], {fill: PALETTE.boxBg, stroke: PALETTE.boxStroke}),
      box(245, 48, 185, 102, 'Controle EECR (0x1F)', ['EEMPE (bit 2): habilita gravacao', 'EEPE (bit 1): grava em <= 4 ciclos', 'EERE (bit 0): leitura imediata', 'Aguardar EEPE=0 antes de iniciar'], {fill: PALETTE.warnBg, stroke: PALETTE.warnStroke}),
      box(245, 168, 185, 66, 'Oscilador / Carga EEPROM', ['Auto-temporizado (~3,4 ms)', 'Desligar IRQ global (CLI) na seq.'], {fill: PALETTE.purpleBg, stroke: PALETTE.purpleStroke}),
      box(475, 66, 145, 150, 'Matriz EEPROM 1 KB', ['1024 x 8 bits nao volatil', 'Enderecos 0..1023', 'Leitura: 4 ciclos CPU', 'Escrita/Erase: ~3,4 ms'], {fill: PALETTE.greenBg, stroke: PALETTE.greenStroke}),
      arrow('eeprom', 195, 89, 245, 89, 'Addr', 0, -6),
      arrow('eeprom', 195, 191, 475, 191, 'Data 8b', 0, -6),
      arrow('eeprom', 430, 99, 475, 99, 'Wr/Rd', 0, -6),
      arrow('eeprom', 337, 168, 337, 150, 'Tmr', 15, 2)
    ].join('');
    return svgWrap(
      'eeprom',
      'EEPROM Interna Nao Volatil de 1 KB (EEAR / EEDR / EECR)',
      'Fluxo de leitura e escrita da EEPROM interna do ATmega328P usando EEARH/EEARL, EEDR e sequencia atomica EEMPE seguido de EEPE em EECR.',
      'Ref.: Microchip DS40002061B - Secao 8.4, Secao 8.6 e Fig. 2-1 - Folhas 15, 29-34 e 623',
      body
    );
  }

  function buildPortdDisplays() {
    var body = [
      box(20, 48, 175, 88, 'PORTD / DDRD (0x0B / 0x0A)', ['PD0..PD7 = Arduino D0..D7', 'Saida paralela de 8 bits / nibbles', 'Atencao: PD0=RXD e PD1=TXD'], {fill: PALETTE.accentBg, stroke: PALETTE.accentStroke}),
      box(20, 152, 175, 82, 'Biblioteca lib328Pv03.inc', ['Macros e subrotinas do curso', 'Display 7-seg e LCD HD44780', 'Rotinas de delay por R18..R25'], {fill: PALETTE.warnBg, stroke: PALETTE.warnStroke}),
      box(250, 48, 175, 88, 'Display 7 Segmentos (a..g,dp)', ['PD0..PD7 -> segmentos + resistores', 'Conversao BCD/nibble para mapa', 'Exibe 0..9 ou A..F (catodo comum)'], {fill: PALETTE.greenBg, stroke: PALETTE.greenStroke}),
      box(250, 152, 175, 82, 'LCD 16x2 HD44780 (4 bits)', ['PD4..PD7 -> D4..D7 (nibble alto)', 'PD2 -> RS | PD3 -> E (Enable)', 'Pulso E + espera busy/delay'], {fill: PALETTE.purpleBg, stroke: PALETTE.purpleStroke}),
      box(465, 64, 155, 154, 'Hardware Externo', ['Modulos conectados aos', 'pinos digitais D0..D7.', 'O controlador HD44780 e o', '7-seg ficam fora do chip', 'ATmega328P (interface via', 'GPIO PORTD).'], {fill: PALETTE.boxBg, stroke: PALETTE.boxStroke}),
      arrow('portd-displays', 195, 92, 250, 92, '8 bits', 0, -6),
      arrow('portd-displays', 195, 193, 250, 193, 'Nib+Ctrl', 0, -6),
      arrow('portd-displays', 425, 92, 465, 112, 'Pins', 0, -6),
      arrow('portd-displays', 425, 193, 465, 174, 'Pins', 0, -6)
    ].join('');
    return svgWrap(
      'portd-displays',
      'PORTD (PD0..PD7) para Displays Externos 7-Seg e LCD 16x2',
      'Conexao do PORTD do ATmega328P aos modulos externos de display de 7 segmentos e LCD HD44780 16x2 em modo 4 bits via macros de lib328Pv03.inc.',
      'Ref.: Microchip DS40002061B - Fig. 14-2 (PORTD/DDRD) - Folhas 85, 97, 101 e 624 - lib328Pv03.inc',
      body
    );
  }

  var DIAGRAM_BUILDERS = {
    'cpu-core': {
      caption: 'Ref.: Microchip DS40002061B · Fig. 7-1, 7-2 e 8-3 · Folhas 18–23, 28 e 623',
      render: buildCpuCore
    },
    'gpio': {
      caption: 'Ref.: Microchip DS40002061B · Fig. 14-1 e 14-2 (Seção 14.2) · Folhas 84–86, 100–101 e 624',
      render: buildGpio
    },
    'adc': {
      caption: 'Ref.: Microchip DS40002061B · Fig. 24-1 (Seção 24.2 e 24.9) · Folhas 246–247, 257–259 e 622–623',
      render: buildAdc
    },
    'timer0': {
      caption: 'Ref.: Microchip DS40002061B · Fig. 15-1 e 15-3 · Table 12-6 (0x0020) · Folhas 74, 102, 105, 113–118 e 623',
      render: buildTimer0
    },
    'timer1': {
      caption: 'Ref.: Microchip DS40002061B · Fig. 16-1 e 16-4 · Table 12-6 (0x001A) · Folhas 74, 120–121, 129, 140–145 e 622–623',
      render: buildTimer1
    },
    'timer2': {
      caption: 'Ref.: Microchip DS40002061B · Fig. 18-1 e 18-3 · Table 12-6 (0x0012) · Folhas 74, 150, 153, 162–167 e 622–623',
      render: buildTimer2
    },
    'usart0': {
      caption: 'Ref.: Microchip DS40002061B · Fig. 20-1 e 20-2 (Seção 20) · Folhas 179–181, 200–204 e 621',
      render: buildUsart0
    },
    'eeprom': {
      caption: 'Ref.: Microchip DS40002061B · Seção 8.4 e 8.6 (Fig. 2-1) · Folhas 15, 29–34 e 623',
      render: buildEeprom
    },
    'portd-displays': {
      caption: 'Ref.: Microchip DS40002061B · Fig. 14-2 (PORTD/DDRD) · Folhas 85, 97, 101 e 624 · lib328Pv03.inc',
      render: buildPortdDisplays
    }
  };

  function listDiagramIds() {
    var ids = [];
    var key;
    for (key in DIAGRAM_BUILDERS) {
      if (Object.prototype.hasOwnProperty.call(DIAGRAM_BUILDERS, key)) {
        ids.push(key);
      }
    }
    return ids;
  }

  function hasDiagram(diagramId) {
    return Object.prototype.hasOwnProperty.call(DIAGRAM_BUILDERS, diagramId);
  }

  function renderSvg(diagramId) {
    if (!hasDiagram(diagramId)) {
      return '';
    }
    return DIAGRAM_BUILDERS[diagramId].render();
  }

  function getCaption(diagramId) {
    if (!hasDiagram(diagramId)) {
      return '';
    }
    return DIAGRAM_BUILDERS[diagramId].caption;
  }

  return {
    listDiagramIds: listDiagramIds,
    hasDiagram: hasDiagram,
    renderSvg: renderSvg,
    getCaption: getCaption
  };
}));
