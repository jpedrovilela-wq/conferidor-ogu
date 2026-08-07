# Conferidor de Empreendimentos

Aplicação web estática para conferir arquivos de empreendimentos dos grupos **OGU** e **FGTS**, com processamento local no navegador.

## Uso

Publique os arquivos no GitHub Pages ou abra-os por um servidor HTTP local. Na página inicial, escolha o grupo de dados:

- **OGU:** envie o CSV de empreendimentos. O Excel resultante contém somente os relatórios de conferência, sem reproduzir os dados originais.
- **FGTS:** envie o CSV separado por ponto e vírgula. O relatório é gerado em Excel com as abas `LOG RESUMO`, `LOG DETALHAMENTO` e `REGRAS APLICADAS`.

Os dados enviados não são transferidos para servidor algum. A conferência ocorre no próprio navegador.

## Rotina FGTS

- Leitura incremental do CSV, adequada para arquivos grandes.
- Barra de progresso baseada nos bytes efetivamente lidos.
- Verificações de estrutura, chaves, datas, valores, listas permitidas e coerências de negócio.
- O valor da compra deve ser maior ou igual ao valor financiado.
- A base territorial do **IBGE — DTB 2024** está incorporada ao aplicativo. O sistema valida o código IBGE de seis dígitos usado no CSV, o município e a sigla da UF de forma integrada.
- As ocorrências são classificadas como `IMPEDITIVO` ou `ATENÇÃO`.

O detalhamento do FGTS usa o Código de Agrupamento SNH para localizar o registro correspondente no CSV original.


<!-- redeploy GitHub Pages 2026-08-07 -->
