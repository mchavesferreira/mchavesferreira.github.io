# Laboratório AVR

Editor didático em blocos que mostra como um programa vira fonte Assembly
para um ATmega328P independente com clock externo de 16 MHz. O projeto abre
no navegador e usa os recursos locais do Blockly.

## Continuidade e manutenção

Antes de alterar o projeto, leia o guia obrigatório [AGENTS.md](AGENTS.md).
Ele encaminha pequenas modificações somente para o contexto necessário. A
visão técnica completa está em
[`docs/architecture-and-handoff.md`](docs/architecture-and-handoff.md), e o
ponto confirmado de retomada fica em
[`docs/project-status.md`](docs/project-status.md).

## Use o editor

1. Publique a distribuição estática e abra sua URL. Siga o
   [guia de empacotamento e publicação para XAMPP ou Apache](docs/apache-deployment.md).
2. Conecte os blocos abaixo de **Ao iniciar ATmega328P**. Os blocos da
   sequência inicial executam uma vez após cada reset. Para continuar
   repetindo, encaixe **Repita para sempre** como último bloco da sequência
   principal e coloque o corpo dentro dele.
3. Clique em um bloco. O painel **Assembly AVR** destaca suas linhas e rola
   até o trecho. **Instruções do bloco** mostra o mnemônico, os operandos e
   os efeitos de cada instrução. Clique em uma linha mapeada para revelar e
   selecionar o bloco de origem. As instruções da rotina de atraso
   compartilhada também podem ser consultadas linha por linha.
4. Use **Salvar projeto** para baixar o XML AVR v1 e **Abrir projeto** para
   retomá-lo. **Baixar .asm** salva o mesmo fonte exibido no painel em
   `programa.asm`. Projetos em outros formatos exigem migração.
   Ao abrir um XML com um bloco desativado, o editor mostra um aviso e
   conserva o projeto que já estava aberto.

## Dos blocos ao Assembly

1. [O adaptador do workspace](js/avr/workspace-model.js) lê as conexões e
   monta um modelo com a configuração inicial, o laço opcional, os valores
   e as variáveis. Ele exige um único bloco inicial e no máximo um **Repita
   para sempre** na sequência principal. Blocos soltos, um laço infinito
   aninhado ou blocos conectados após ele geram diagnósticos.
2. [O gerador](js/avr/asm-generator.js) valida o modelo e emite Assembly
   determinístico na ordem dos blocos. A saída segue o dialeto GNU AVR para
   `atmega328p` e foi preparada para pré-processamento com
   `assembler-with-cpp`. O fonte contém instruções, diretivas e comentários.
3. O editor usa os intervalos e os identificadores de bloco por linha,
   junto das explicações de cada instrução, para sincronizar os painéis.
   Quando há diagnósticos, o painel pede correções, oculta o fonte e desativa
   o download até o programa voltar a ser válido.

## Alvo e limites

- O programa completo cabe em até 16.384 palavras de flash (32.768 bytes),
  incluindo os vetores, o reset e a rotina de atraso. Se o programa ultrapassar
  a capacidade, o diagnóstico informa o tamanho gerado em palavras.
- Os pinos PB6/XTAL1 e PB7/XTAL2 são reservados ao clock externo. PC6 é
  reservado ao RESET. Os aliases do Arduino Uno, como **PB5 (D13)** e
  **PD2 (D2)**, aparecem na interface. O código usa os registradores e
  símbolos nativos do ATmega328P.
- A interface oferece GPIO digital, literais e variáveis sem sinal de 8 bits,
  soma e subtração módulo 256, comparações sem sinal, condições, repetições e
  atrasos inteiros de 1 a 1000 ms. A contagem de uma repetição vai de 0 a 255
  e é avaliada ao entrar no laço.
- O resultado é fonte `.asm`. Compilação, objeto, ELF, HEX, simulação e
  gravação no microcontrolador ficam fora do escopo. A primeira versão
  também deixa de fora ADC, PWM, timers, interrupções, UART, SPI e I²C.

Consulte as [convenções de registradores, pilha e SRAM](docs/avr-register-conventions.md)
e os [três exemplos de blocos e instruções](docs/block-to-assembly-examples.md).

## Testes AVR

Na raiz do projeto, execute a suíte com Node.js 24. Os testes rodam offline e
usam apenas módulos nativos do Node.js.

```sh
node --test tests/avr/*.test.js
```
