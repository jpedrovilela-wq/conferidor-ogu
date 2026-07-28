# Conferidor OGU

Aplicação web estática para conferir e corrigir planilhas OGU de empreendimentos. Todo o processamento é local, no navegador.

## Publicação no GitHub Pages

1. Crie um repositório no GitHub e envie estes arquivos para a raiz.
2. Em **Settings > Pages**, selecione **Deploy from a branch**, a branch `main` e a pasta `/(root)`.
3. Abra o endereço gerado pelo GitHub Pages.

## Uso

Envie um `.xlsx` ou `.xls` contendo os 50 cabeçalhos oficiais na primeira linha da primeira aba. Ao concluir, baixe o arquivo: os dados são corrigidos quando a regra permitir e são acrescentadas as abas `LOG RESUMO`, `LOG DETALHAMENTO` e `ALTERAÇÕES`.

## Observações

- O arquivo usa a biblioteca SheetJS carregada pelo CDN; por isso, é necessária conexão com a internet para abrir a página.
- Linhas reportadas nos logs correspondem à linha da planilha Excel, incluindo o cabeçalho na linha 1.
- O nº 43 não existe na especificação recebida. Por isso, há 50 cabeçalhos esperados, das colunas 01 a 51, exceto a 43.
