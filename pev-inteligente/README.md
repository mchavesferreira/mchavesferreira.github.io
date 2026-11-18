# PEV Inteligente — painel web demonstrativo (v2.0)

Interface de exemplo para monitoramento IoT de Pontos de Entrega Voluntária (PEVs) de vidro, inspirada no projeto IFSP Catanduva/SAEC. **Todos os níveis, leituras, alertas e pontos da demonstração são fictícios; não são telemetria real.** A localização da Praça da República é uma referência, e as demais coordenadas são aproximadas/ilustrativas.

## O que foi incluído
- Painel responsivo em português, com modo claro/escuro e menu mobile.
- Indicadores, mapa Leaflet/OpenStreetMap, popup de cada unidade, alertas de enchimento (>=80%), vibração, inclinação, bateria baixa (<=40%) e falta de conexão.
- Busca, filtro por criticidade, detalhes, CSV para planilha (com proteção simples contra fórmulas em campos textuais) e gráfico Chart.js **com dados históricos sintetizados somente para demonstração**.
- API PHP 8/PDO opcional e esquema MySQL com três unidades fictícias.
- Busca de dados via `fetch()` e atualização periódica a cada 60 segundos quando a API está ativa.

## Uso rápido sem servidor ou banco de dados
Abra `index.html` no navegador. O modo de demonstração funciona localmente, mas **o mapa e os gráficos dependem de acesso à internet para carregar Leaflet, Chart.js, fontes e tiles do OpenStreetMap**.

## Uso com PHP e MySQL
1. Execute `script.sql` no MySQL 8+.
2. Crie um usuário específico para **leitura** da tabela `smartwaste.containers`.
3. Defina as variáveis de ambiente do processo PHP: `PEV_DB_HOST`, `PEV_DB_PORT` (opcional), `PEV_DB_NAME` (opcional), `PEV_DB_USER`, `PEV_DB_PASSWORD`.
4. Altere, no início de `app.js`: `const API_URL = 'api/containers.php';`
5. Sirva a pasta por um servidor PHP (por exemplo, `php -S localhost:8000` dentro da pasta do projeto) e acesse `http://localhost:8000`.
6. Verifique no navegador o JSON em `http://localhost:8000/api/containers.php`.

Exemplo de criação de usuário (substitua a senha):

```sql
CREATE USER 'pev_reader'@'localhost' IDENTIFIED BY 'SENHA_FORTE_AQUI';
GRANT SELECT ON smartwaste.containers TO 'pev_reader'@'localhost';
```

**Importante:** o gráfico continua explicitamente simulado, mesmo usando a API. Para histórico real, crie uma tabela de leituras e endpoint próprio; não interprete a curva atual como medições. O formato atual da API usa datas `-03:00`, adequado à operação em Catanduva; para operação multirregional, grave e retorne timestamps UTC com timezone real.

## JSON esperado da API

```json
[{"id":1,"name":"PEV Centro","address":"Praça da República, Centro","lat":-21.1355937,"lng":-48.9737280,"level":45,"capacity_l":1000,"battery":92,"signal_dbm":-87,"temperature_c":29.1,"tilt":false,"vibration":false,"online":true,"updated_at":"2026-11-17T20:50:00-03:00"}]
```

## Próxima etapa: telemetria real
ESP32 + sensor de nível + IMU + tensão de bateria → LoRa/LoRaWAN → gateway → ChirpStack/MQTT → Node-RED → MySQL (leituras e eventos) → API PHP → dashboard. Validar calibração, perda de comunicação, autenticação no pipeline de ingestão, posição e integridade dos eventos. Não permitir gravação anônima pela API de leitura.

## Arquivos
- `index.html`: estrutura da interface
- `style.css`: responsividade e temas
- `app.js`: demonstração, mapa, indicadores, filtros, alertas, CSV, gráfico
- `api/containers.php`: endpoint PHP somente leitura
- `script.sql`: esquema e registros de exemplo

Licenças e atribuições: mapa © OpenStreetMap contributors (visualizado via Leaflet); dependências externas sujeitas às respectivas licenças.
