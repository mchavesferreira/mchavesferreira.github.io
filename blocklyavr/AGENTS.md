# Guia para agentes

Este arquivo é a entrada obrigatória para qualquer agente que altere este
repositório. O objetivo é continuar o trabalho sem depender da conversa que
originou o projeto e sem carregar documentação desnecessária.

## Leitura mínima

1. Leia este arquivo inteiro.
2. Leia [`docs/project-status.md`](docs/project-status.md) para conhecer o
   estado confirmado e a próxima ação.
3. Leia somente a referência relacionada à tarefa:
   - arquitetura ou novo recurso: [`docs/architecture-and-handoff.md`](docs/architecture-and-handoff.md);
   - processo, testes ou passagem de contexto: [`docs/development-workflow.md`](docs/development-workflow.md);
   - registradores, SRAM e pilha: [`docs/avr-register-conventions.md`](docs/avr-register-conventions.md);
   - exemplos bloco → Assembly: [`docs/block-to-assembly-examples.md`](docs/block-to-assembly-examples.md);
   - XAMPP/Apache: [`docs/apache-deployment.md`](docs/apache-deployment.md).

Não leia nem carregue todos os planos, especificações e relatórios para uma
modificação local. Consulte `docs/superpowers/` apenas quando a tarefa mudar
arquitetura, contratos ou escopo do produto, ou quando os documentos acima não
resolverem uma dúvida.

## Objetivo e limites do produto

- Editor didático Blockly/Scratch-like para gerar fonte GNU AVR do ATmega328P.
- Microcontrolador independente, clock externo fixo de 16 MHz.
- Aliases Arduino Uno aparecem somente na interface; o Assembly usa nomes AVR.
- A saída é somente `.asm`: não adicionar compilação, ELF, HEX ou gravação.
- Não reativar BitZ80, Z80, Sega, ROM, bibliotecas ausentes, CDN ou backend.
- A aplicação deve permanecer estática e funcionar por caminhos relativos.
- O JavaScript executado no navegador deve continuar compatível com ES5 e com
  o Blockly legado incluído no repositório.
- Não alterar `C:\xampp\htdocs\blocklyavrasm` durante desenvolvimento. Trabalhe
  nesta cópia versionada e publique apenas uma distribuição limpa.

## Fontes de verdade

Em caso de divergência, use esta ordem:

1. testes executáveis em `tests/avr/`;
2. contratos e validações em `js/avr/`;
3. estado confirmado em `docs/project-status.md`;
4. arquitetura e documentação especializada;
5. planos e especificações históricos.

Não considere comentário, relatório antigo ou conversa como evidência de que
um comportamento ainda funciona. Execute o teste correspondente.

## Comandos mínimos

Execute a suíte completa a partir da raiz:

```sh
node --test tests/avr/*.test.js
```

Antes de registrar uma mudança:

```sh
git diff --check
git status --short
```

Para mudanças em scripts carregados pelo navegador, confirme também ES5,
recursos locais e o fluxo HTTP descritos em
[`docs/development-workflow.md`](docs/development-workflow.md).

## Regras para mudanças

- Preserve a sequência `Blockly → AvrWorkspaceModel → Program →
  AvrAsmGenerator → interface`.
- Um diagnóstico impede fonte parcial: `source`, mapas e explicações devem ficar
  vazios e o download deve ser desabilitado.
- Cada instrução originada por bloco deve manter `lineMap`, `lineBlockIds` e
  `explanations` coerentes.
- Respeite 2.048 bytes de SRAM e 16.384 palavras de flash.
- Preserve IDs de blocos e variáveis no XML AVR v1.
- Escreva primeiro um teste que reproduza a nova regra ou o defeito.
- Não modifique arquivos legados só porque ainda existem; confirme se são
  carregados pela página ativa.
- Não copie o checkout Git inteiro para o `DocumentRoot`.

## Retomada por outro agente

Ao assumir o trabalho:

1. execute `git status --short`, `git branch --show-current` e
   `git log -5 --oneline`;
2. compare o resultado com `docs/project-status.md`;
3. se houver mudanças não registradas, trate-as como trabalho do usuário ou do
   agente anterior; não descarte nem sobrescreva;
4. execute o teste mais próximo da área antes de editar;
5. continue a partir de **Próxima ação**, não a partir de memória ou conversa.

## Encerramento e troca de contexto

Antes de encerrar uma etapa, atingir o limite de contexto ou transferir para
outro agente, atualize [`docs/project-status.md`](docs/project-status.md) com:

- branch e commit verificados;
- arquivos e comportamento alterados;
- comandos executados e resultados;
- limitações ou decisões ainda abertas;
- trabalho não concluído, sem apresentá-lo como pronto;
- uma próxima ação concreta e pequena.

O status deve ser um retrato curto do presente, não um diário. O histórico
detalhado permanece nos commits, planos e relatórios.
