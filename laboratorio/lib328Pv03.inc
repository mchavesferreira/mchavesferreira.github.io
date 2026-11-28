; ============================================================================
; Biblioteca didatica de sub-rotinas de perifericos para o ATmega328P (AVRASM2)
; Arquivo: lib328Pv03.inc
; Baseada na lib328Pv02 (revisao Marcos Chaves 19/11/2026)
; Harmonizada com as convencoes de registradores do gerador Blockly AVRASM2:
;   - R16 (aux): acumulador principal de expressoes do gerador
;   - R17: reservado ao segundo operando aritmetico/comparacao do gerador
;   - R18: reservado ao contador de repeticao contada (repeatCount) do gerador
;   - R27 (lcd_col) e R28 (lcd_number): realocados para evitar conflito com R17/R18
;   - Suporte a numeros de 8 bits (0 a 255) no LCD e na USART
;   - Suporte a selecao de canal analogico ADC0 a ADC5 (PC0 a PC5)
; ============================================================================

.def delay_time        = r25
.def display_number    = r24
.def eeprom_address    = r23
.def eeprom_number     = r22
.def transmit_caracter = r21
.def pwm_value         = r20
.def lcd_caracter      = r19
; r18 reservado ao contador de laco finito do gerador
; r17 reservado ao segundo operando de expressoes do gerador
.def aux               = r16
.def receive_caracter  = r15
.def adc_value         = r14
.def lcd_col           = r27
.def lcd_number        = r28

.def unidades          = r0
.def dezenas           = r1
.def centenas          = r2

.equ rs_lcd            = pd2
.equ enable_lcd        = pd3

    rjmp lib328p_after_subroutines

; ### Sub-rotina de atraso em segundos (16 MHz) ###
delay_seconds:
    ldi r31, 82
    ldi r30, 0
    ldi r29, 0
loop_delay:
    dec r29
    brne loop_delay
    dec r30
    brne loop_delay
    dec r31
    brne loop_delay
    dec delay_time
    brne delay_seconds
    ret

; ### Sub-rotina de atraso em milissegundos (16 MHz) ###
delay_miliseconds:
    ldi r30, 22
    ldi r29, 0
loop_delayms:
    dec r29
    brne loop_delayms
    dec r30
    brne loop_delayms
    dec delay_time
    brne delay_miliseconds
    ret

; ### Sub-rotina de atraso de 1 microssegundo (16 ciclos a 16 MHz) ###
delay_1microsecond:
    nop
    nop
    nop
    nop
    nop
    nop
    nop
    nop
    nop
    nop
    nop
    nop
    nop
    nop
    nop
    nop
    ret

; ### Sub-rotina para mostrar dezena e unidade em dois displays de 7 segmentos ###
; Dezena: PD7..PD4 | Unidade: PD3..PD0
display_write:
    ldi aux, 0b11111111
    out DDRD, aux
    ldi r30, 0
    mov r31, display_number
    cpi r31, 10
    brlo display_show
display_loop:
    subi r31, 10
    inc r30
    cpi r31, 10
    brlo display_show
    rjmp display_loop
display_show:
    mov r29, r30
    swap r29
    or r29, r31
    out PORTD, r29
    ret

; ### Sub-rotina para apagar o display de 7 segmentos ###
display_off:
    ldi aux, 0b11111111
    out DDRD, aux
    ldi r30, 0b11111111
    out PORTD, r30
    ret

; ### Sub-rotina para escrita na EEPROM ###
eeprom_write:
    sbic EECR, EEPE
    rjmp eeprom_write
    out EEARL, eeprom_address
    out EEDR, eeprom_number
    sbi EECR, EEMPE
    sbi EECR, EEPE
    ret

; ### Sub-rotina para leitura na EEPROM ###
eeprom_read:
    sbic EECR, EEPE
    rjmp eeprom_read
    out EEARL, eeprom_address
    sbi EECR, EERE
    in eeprom_number, EEDR
    ret

; ### Sub-rotina de configuracao da USART em 9600 bps (16 MHz) ###
usart_init:
    ldi r30, 0
    sts UBRR0H, r30
    ldi r30, 103
    sts UBRR0L, r30
    ldi r30, 0b00011000
    sts UCSR0B, r30
    ret

; ### Sub-rotina para transmissao de caractere pela USART ###
usart_transmit:
    lds r30, UCSR0A
    sbrs r30, UDRE0
    rjmp usart_transmit
    sts UDR0, transmit_caracter
    ret

; ### Sub-rotina para recepcao de caractere pela USART ###
usart_receive:
    lds r30, UCSR0A
    sbrs r30, RXC0
    rjmp usart_receive
    lds receive_caracter, UDR0
    ret

; ### Sub-rotina para transmissao de numero decimal (0 a 255) pela USART ###
; Entrada: transmit_caracter (r21) -> Saida: 3 digitos ASCII pela USART
usart_transmit_number:
    clr centenas
    clr dezenas
converter_centenas:
    cpi transmit_caracter, 100
    brlo converter_dezenas
    subi transmit_caracter, 100
    inc centenas
    rjmp converter_centenas
converter_dezenas:
    cpi transmit_caracter, 10
    brlo converter_unidades
    subi transmit_caracter, 10
    inc dezenas
    rjmp converter_dezenas
converter_unidades:
    mov unidades, transmit_caracter
    mov transmit_caracter, centenas
    subi transmit_caracter, -48
    rcall usart_transmit
    mov transmit_caracter, dezenas
    subi transmit_caracter, -48
    rcall usart_transmit
    mov transmit_caracter, unidades
    subi transmit_caracter, -48
    rcall usart_transmit
    ret

; ### Sub-rotina ADC de 8 bits no canal ADC0 (PC0 / A0) ###
analog_read:
    ldi r16, 0
; ### Sub-rotina ADC de 8 bits com selecao de canal (0 a 5 em R16) ###
analog_read_channel:
    andi r16, 0x07
    ori r16, 0b01100000
    sts ADMUX, r16
    ldi r30, 0b11000111
    sts ADCSRA, r30
loop_ad:
    lds r30, ADCSRA
    sbrc r30, ADSC
    rjmp loop_ad
    lds adc_value, ADCH
    ret

; ### Sub-rotina PWM de 8 bits (~976 Hz) no pino PD6 (D6 / OC0A - Timer0) ###
pwm_write_pd6:
    sbi DDRD, PD6
    in r30, TCCR0A
    andi r30, 0b00110000
    ori r30, 0b10000011
    out TCCR0A, r30
    out OCR0A, pwm_value
    ldi r30, 0b00000011
    out TCCR0B, r30
    ret

; ### Sub-rotina PWM de 8 bits (~976 Hz) no pino PD5 (D5 / OC0B - Timer0) ###
pwm_write_pd5:
    sbi DDRD, PD5
    in r30, TCCR0A
    andi r30, 0b11000000
    ori r30, 0b00100011
    out TCCR0A, r30
    out OCR0B, pwm_value
    ldi r30, 0b00000011
    out TCCR0B, r30
    ret

; ### Sub-rotina PWM de 8 bits (~976 Hz) no pino PB1 (D9 / OC1A - Timer1) ###
pwm_write_pb1:
    sbi DDRB, PB1
    lds r30, TCCR1A
    andi r30, 0b00110000
    ori r30, 0b10000001
    sts TCCR1A, r30
    ldi r30, 0
    sts OCR1AH, r30
    mov r30, pwm_value
    sts OCR1AL, r30
    ldi r30, 0b00001011
    sts TCCR1B, r30
    ret

; ### Sub-rotina PWM de 8 bits (~976 Hz) no pino PB2 (D10 / OC1B - Timer1) ###
pwm_write:
pwm_write_pb2:
    sbi DDRB, PB2
    lds r30, TCCR1A
    andi r30, 0b11000000
    ori r30, 0b00100001
    sts TCCR1A, r30
    ldi r30, 0
    sts OCR1BH, r30
    mov r30, pwm_value
    sts OCR1BL, r30
    ldi r30, 0b00001011
    sts TCCR1B, r30
    ret

; ### Sub-rotina PWM de 8 bits (~976 Hz) no pino PB3 (D11 / OC2A - Timer2) ###
pwm_write_pb3:
    sbi DDRB, PB3
    lds r30, TCCR2A
    andi r30, 0b00110000
    ori r30, 0b10000011
    sts TCCR2A, r30
    sts OCR2A, pwm_value
    ldi r30, 0b00000100
    sts TCCR2B, r30
    ret

; ### Sub-rotina PWM de 8 bits (~976 Hz) no pino PD3 (D3 / OC2B - Timer2) ###
pwm_write_pd3:
    sbi DDRD, PD3
    lds r30, TCCR2A
    andi r30, 0b11000000
    ori r30, 0b00100011
    sts TCCR2A, r30
    sts OCR2B, pwm_value
    ldi r30, 0b00000100
    sts TCCR2B, r30
    ret

; ### Sub-rotina Start Timer0 (8 bits, modo normal, prescaler 1024, overflow 10 ms) ###
start_timer0:
    ldi r16, 0b01010000
    out TCCR0A, r16
    ldi r16, 0b00000001
    sts TIMSK0, r16
    ldi r16, 0b00000101
    out TCCR0B, r16
    ldi r16, 100
    out TCNT0, r16
    sei
    ret

; ### Sub-rotina Start Timer1 (16 bits, modo normal, prescaler 1024, overflow 1000 ms) ###
start_timer1:
    ldi r16, 0b00000000
    sts TCCR1A, r16
    ldi r16, 0b00000101
    sts TCCR1B, r16
    ldi r16, 0b00000001
    sts TIMSK1, r16
    ldi r16, 0xC2
    sts TCNT1H, r16
    ldi r16, 0xF6
    sts TCNT1L, r16
    sei
    ret

; ### Sub-rotina Start Timer2 (8 bits, modo normal, prescaler 1024, overflow 10 ms) ###
start_timer2:
    ldi r16, 0b00000000
    sts TCCR2A, r16
    ldi r16, 0b00000001
    sts TIMSK2, r16
    ldi r16, 0b00000111
    sts TCCR2B, r16
    ldi r16, 100
    sts TCNT2, r16
    sei
    ret

; ### Sub-rotina para inicializacao do LCD 16x2 no PORTD (modo 4 bits) ###
lcd_init:
    sbi DDRD, 2
    sbi DDRD, 3
    sbi DDRD, 4
    sbi DDRD, 5
    sbi DDRD, 6
    sbi DDRD, 7
    cbi PORTD, rs_lcd
    cbi PORTD, enable_lcd
    cbi PORTD, pd7
    cbi PORTD, pd6
    cbi PORTD, pd5
    cbi PORTD, pd4
    ldi delay_time, 15
    rcall delay_miliseconds
    cbi PORTD, pd7
    cbi PORTD, pd6
    sbi PORTD, pd5
    sbi PORTD, pd4
    rcall pulse_enable
    ldi delay_time, 5
    rcall delay_miliseconds
    cbi PORTD, pd7
    cbi PORTD, pd6
    sbi PORTD, pd5
    sbi PORTD, pd4
    rcall pulse_enable
    ldi delay_time, 5
    rcall delay_miliseconds
    cbi PORTD, pd7
    cbi PORTD, pd6
    sbi PORTD, pd5
    sbi PORTD, pd4
    rcall pulse_enable
    ldi delay_time, 5
    rcall delay_miliseconds
    cbi PORTD, pd7
    cbi PORTD, pd6
    sbi PORTD, pd5
    cbi PORTD, pd4
    rcall pulse_enable
    ldi delay_time, 1
    rcall delay_miliseconds
    ldi lcd_caracter, 0x28
    rcall lcd_write_caracter
    ldi lcd_caracter, 0x0C
    rcall lcd_write_caracter
    ldi lcd_caracter, 0x01
    rcall lcd_write_caracter
    ldi delay_time, 2
    rcall delay_miliseconds
    ldi lcd_caracter, 0x06
    rcall lcd_write_caracter
    sbi PORTD, rs_lcd
    ret

; ### Sub-rotina para limpar o LCD ###
lcd_clear:
    cbi PORTD, rs_lcd
    ldi lcd_caracter, 1
    rcall lcd_write_caracter
    ldi delay_time, 2
    rcall delay_miliseconds
    sbi PORTD, rs_lcd
    ret

; ### Sub-rotina para escrever um caractere/comando de 8 bits no LCD (4 bits) ###
lcd_write_caracter:
    sbrc lcd_caracter, 7
    sbi PORTD, pd7
    sbrs lcd_caracter, 7
    cbi PORTD, pd7
    sbrc lcd_caracter, 6
    sbi PORTD, pd6
    sbrs lcd_caracter, 6
    cbi PORTD, pd6
    sbrc lcd_caracter, 5
    sbi PORTD, pd5
    sbrs lcd_caracter, 5
    cbi PORTD, pd5
    sbrc lcd_caracter, 4
    sbi PORTD, pd4
    sbrs lcd_caracter, 4
    cbi PORTD, pd4
    rcall pulse_enable
    sbrc lcd_caracter, 3
    sbi PORTD, pd7
    sbrs lcd_caracter, 3
    cbi PORTD, pd7
    sbrc lcd_caracter, 2
    sbi PORTD, pd6
    sbrs lcd_caracter, 2
    cbi PORTD, pd6
    sbrc lcd_caracter, 1
    sbi PORTD, pd5
    sbrs lcd_caracter, 1
    cbi PORTD, pd5
    sbrc lcd_caracter, 0
    sbi PORTD, pd4
    sbrs lcd_caracter, 0
    cbi PORTD, pd4
    rcall pulse_enable
    ret

; ### Sub-rotina para gerar pulso de Enable no LCD e aguardar ~50 us ###
pulse_enable:
    cbi PORTD, enable_lcd
    rcall delay_1microsecond
    sbi PORTD, enable_lcd
    rcall delay_1microsecond
    cbi PORTD, enable_lcd
    ldi r26, 50
loop_pulse:
    rcall delay_1microsecond
    dec r26
    cpi r26, 0
    brne loop_pulse
    ret

; ### Sub-rotina para posicionar cursor na linha 0 do LCD (coluna 0 a 15 em lcd_col) ###
lcd_lin0_col:
    cbi PORTD, rs_lcd
    ldi r30, 0x80
    add lcd_col, r30
    mov lcd_caracter, lcd_col
    rcall lcd_write_caracter
    sbi PORTD, rs_lcd
    ret

; ### Sub-rotina para posicionar cursor na linha 1 do LCD (coluna 0 a 15 em lcd_col) ###
lcd_lin1_col:
    cbi PORTD, rs_lcd
    ldi r30, 0xC0
    add lcd_col, r30
    mov lcd_caracter, lcd_col
    rcall lcd_write_caracter
    sbi PORTD, rs_lcd
    ret

; ### Sub-rotina para escrever um numero de 0 a 255 (3 digitos ASCII) no LCD ###
; Entrada: lcd_number (r28)
lcd_write_number:
    clr centenas
    clr dezenas
    mov r30, lcd_number
lcd_centenas:
    cpi r30, 100
    brlo lcd_dezenas
    subi r30, 100
    inc centenas
    rjmp lcd_centenas
lcd_dezenas:
    cpi r30, 10
    brlo lcd_unidades
    subi r30, 10
    inc dezenas
    rjmp lcd_dezenas
lcd_unidades:
    mov unidades, r30
    ldi r29, 48
    add centenas, r29
    add dezenas, r29
    add unidades, r29
    mov lcd_caracter, centenas
    rcall lcd_write_caracter
    mov lcd_caracter, dezenas
    rcall lcd_write_caracter
    mov lcd_caracter, unidades
    rcall lcd_write_caracter
    ret

lib328p_after_subroutines:
