if (typeof importScripts === 'function') importScripts('ibge-municipios.js');

const HEADERS = ['mcmv_fgts_01_dt_referencia','mcmv_fgts_02_dt_geracao','mcmv_fgts_03_cod_agrupamento_snh','mcmv_fgts_04_cod_ibge','mcmv_fgts_05_nome_municipio','mcmv_fgts_06_txt_programa_fed','mcmv_fgts_07_txt_modalidade','mcmv_fgts_08_txt_programa_fgts','mcmv_fgts_09_txt_dt_contratacao','mcmv_fgts_10_val_compra','mcmv_fgts_11_val_financiamento','mcmv_fgts_12_val_subsidio_fgts','mcmv_fgts_13_val_subsidio_ogu','mcmv_fgts_14_qtd_contratos','mcmv_fgts_15_txt_faixa','mcmv_fgts_16_txt_tipo_imovel','mcmv_fgts_17_txt_sigla_uf','mcmv_fgts_18_txt_uf','mcmv_fgts_19_txt_regiao','mcmv_fgts_20_txt_ano_contratacao','mcmv_fgts_21_txt_mes_contratacao','mcmv_fgts_22_txt_sigla_regiao','mcmv_fgts_23_txt_fonte_recurso'];
const STATES = {'ACRE':['AC','N','Norte'],'ALAGOAS':['AL','NE','Nordeste'],'AMAPA':['AP','N','Norte'],'AMAZONAS':['AM','N','Norte'],'BAHIA':['BA','NE','Nordeste'],'CEARA':['CE','NE','Nordeste'],'DISTRITO FEDERAL':['DF','CO','Centro-Oeste'],'ESPIRITO SANTO':['ES','SE','Sudeste'],'GOIAS':['GO','CO','Centro-Oeste'],'MARANHAO':['MA','NE','Nordeste'],'MATO GROSSO':['MT','CO','Centro-Oeste'],'MATO GROSSO DO SUL':['MS','CO','Centro-Oeste'],'MINAS GERAIS':['MG','SE','Sudeste'],'PARA':['PA','N','Norte'],'PARAIBA':['PB','NE','Nordeste'],'PARANA':['PR','S','Sul'],'PERNAMBUCO':['PE','NE','Nordeste'],'PIAUI':['PI','NE','Nordeste'],'RIO DE JANEIRO':['RJ','SE','Sudeste'],'RIO GRANDE DO NORTE':['RN','NE','Nordeste'],'RIO GRANDE DO SUL':['RS','S','Sul'],'RONDONIA':['RO','N','Norte'],'RORAIMA':['RR','N','Norte'],'SANTA CATARINA':['SC','S','Sul'],'SAO PAULO':['SP','SE','Sudeste'],'SERGIPE':['SE','NE','Nordeste'],'TOCANTINS':['TO','N','Norte']};
const PROGRAMAS_FED = ['CVA','FORA MCMV/CVA','MCMV'];
const PROGRAMAS_FGTS = ['APOIO A PRODUCAO','CARTA DE CREDITO ASSOCIATIVO','CARTA DE CREDITO INDIVIDUAL','CLASSE MEDIA','FAIXA 3 - FUNDO SOCIAL','FAIXA ESTENDIDA','PRO-COTISTA'];
const FAIXAS = ['FAIXA 1','FAIXA 2','FAIXA 3','FAIXA 3 FS','FORA MCMV','FORA MCMV/CVA','CLASSE MEDIA'];
const FONTES = ['FGTS','FUNDO SOCIAL','SBPE'];
const clean = value => String(value ?? '').trim();
const norm = value => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
const municipalityNorm = value => norm(value).replace(/[^A-Z0-9]+/g, ' ').trim();
const valid = (value, options) => options.includes(norm(value));

function number(value) {
  const text = clean(value).replace(/\s/g, '');
  if (!text) return null;
  const comma = text.lastIndexOf(','), dot = text.lastIndexOf('.');
  let normalized = text;
  if (comma >= 0 && dot >= 0) normalized = comma > dot ? text.replace(/\./g, '').replace(',', '.') : text.replace(/,/g, '');
  else if (comma >= 0) normalized = text.replace(',', '.');
  else if ((text.match(/\./g) || []).length > 1) normalized = text.replace(/\./g, '');
  const result = Number(normalized);
  return Number.isFinite(result) ? result : NaN;
}
function date(value) {
  const match = clean(value).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const result = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  return result.getFullYear() === Number(match[3]) && result.getMonth() === Number(match[2]) - 1 && result.getDate() === Number(match[1]) ? result : null;
}
function monthCode(value) { return /^\d{6}$/.test(clean(value)) ? clean(value) : null; }
function csvParser(onRow) {
  let field = '', row = [], quoted = false;
  return {
    push(chunk) {
      for (let index = 0; index < chunk.length; index++) {
        const char = chunk[index];
        if (char === '"') {
          if (quoted && chunk[index + 1] === '"') { field += '"'; index++; } else quoted = !quoted;
        } else if (char === ';' && !quoted) { row.push(field); field = ''; }
        else if ((char === '\n' || char === '\r') && !quoted) {
          if (char === '\r' && chunk[index + 1] === '\n') index++;
          row.push(field); onRow(row); row = []; field = '';
        } else field += char;
      }
    },
    end() { if (field.length || row.length) { row.push(field); onRow(row); } }
  };
}

self.onmessage = async event => {
  if (event.data.type !== 'process') return;
  try {
    const file = event.data.file;
    let headerMap, firstReference, records = 0, impeditivos = 0, atencoes = 0;
    const seen = new Set(), rows = [], summary = {};
    const add = (cells, rule, level, actual, justification) => {
      const code = headerMap ? clean(cells[headerMap.mcmv_fgts_03_cod_agrupamento_snh]) : '';
      rows.push([code, rule, level, actual, justification, clean(cells[headerMap.mcmv_fgts_05_nome_municipio]), clean(cells[headerMap.mcmv_fgts_17_txt_sigla_uf]), clean(cells[headerMap.mcmv_fgts_09_txt_dt_contratacao])]);
      summary[`${rule}|${level}`] = (summary[`${rule}|${level}`] || 0) + 1;
      if (level === 'IMPEDITIVO') impeditivos++; else atencoes++;
    };
    const check = cells => {
      records++;
      const get = header => cells[headerMap[header]] ?? '';
      const ref = date(get(HEADERS[0])), generation = date(get(HEADERS[1])), code = clean(get(HEADERS[2])), ibge = clean(get(HEADERS[3]));
      const contract = monthCode(get(HEADERS[8])), year = clean(get(HEADERS[19])), month = clean(get(HEADERS[20]));

      if (!ref) add(cells, 'Data de Referência deve estar no formato DD/MM/AAAA.', 'IMPEDITIVO', get(HEADERS[0]), 'Data inválida.');
      else {
        const referenceKey = ref.toISOString().slice(0, 10);
        if (!firstReference) firstReference = referenceKey;
        else if (referenceKey !== firstReference) add(cells, 'Data de Referência deve ser igual em todas as linhas.', 'IMPEDITIVO', get(HEADERS[0]), 'Data de referência divergente.');
      }
      if (!generation) add(cells, 'Data de Geração deve estar no formato DD/MM/AAAA.', 'IMPEDITIVO', get(HEADERS[1]), 'Data inválida.');
      else if (ref && generation < ref) add(cells, 'Data de Geração não pode ser anterior à Data de Referência.', 'IMPEDITIVO', get(HEADERS[1]), 'Data de geração anterior à referência.');

      if (!code) add(cells, 'Código de Agrupamento SNH não pode estar vazio.', 'IMPEDITIVO', '', 'Chave única obrigatória.');
      else if (seen.has(code)) add(cells, 'Código de Agrupamento SNH não pode se repetir.', 'IMPEDITIVO', code, 'Duplicidade de chave identificada.');
      else seen.add(code);

      if (!/^\d{6}$/.test(ibge)) add(cells, 'Código IBGE deve possuir 6 dígitos numéricos.', 'IMPEDITIVO', ibge, 'Código IBGE inválido.');
      else {
        const official = typeof IBGE_MUNICIPIOS !== 'undefined' ? IBGE_MUNICIPIOS[ibge] : null;
        if (!official) add(cells, 'Código IBGE não foi localizado na base territorial DTB 2024.', 'IMPEDITIVO', ibge, 'Código municipal inexistente na base do IBGE.');
        else if (municipalityNorm(get(HEADERS[4])) !== municipalityNorm(official[0])) add(cells, 'Município não corresponde ao Código IBGE.', 'IMPEDITIVO', get(HEADERS[4]), `Município esperado para o código ${ibge}: ${official[0]}.`);
        else if (norm(get(HEADERS[16])) !== official[1]) add(cells, 'Sigla da UF não corresponde ao Código IBGE.', 'IMPEDITIVO', get(HEADERS[16]), `Sigla esperada para o código ${ibge}: ${official[1]}.`);
      }

      if (!valid(get(HEADERS[5]), PROGRAMAS_FED)) add(cells, 'Programa federal fora da lista permitida.', 'IMPEDITIVO', get(HEADERS[5]), 'Valores permitidos: CVA, Fora MCMV/CVA e MCMV.');
      if (norm(get(HEADERS[6])) !== 'FINANCIAMENTO') add(cells, 'Modalidade deve ser Financiamento.', 'IMPEDITIVO', get(HEADERS[6]), 'Modalidade inválida.');
      if (!valid(get(HEADERS[7]), PROGRAMAS_FGTS)) add(cells, 'Programa FGTS fora da lista permitida.', 'IMPEDITIVO', get(HEADERS[7]), 'Programa inválido.');

      if (!contract) add(cells, 'Data da Contratação deve estar no formato AAAAMM.', 'IMPEDITIVO', get(HEADERS[8]), 'Data de contratação inválida.');
      else if (contract !== `${year.padStart(4, '0')}${month.padStart(2, '0')}`) add(cells, 'Data da Contratação deve corresponder ao ano e mês informados.', 'IMPEDITIVO', contract, 'Concatenação de ano e mês divergente.');
      else if (ref && Number(contract) > Number(`${ref.getFullYear()}${String(ref.getMonth() + 1).padStart(2, '0')}`)) add(cells, 'Data da Contratação não pode ser posterior à Data de Referência.', 'IMPEDITIVO', contract, 'Contratação posterior ao período de referência.');

      const compra = number(get(HEADERS[9])), financiamento = number(get(HEADERS[10]));
      [['Valor da Compra', compra, HEADERS[9]], ['Valor do Financiamento', financiamento, HEADERS[10]], ['Subsídio FGTS', number(get(HEADERS[11])), HEADERS[11]], ['Subsídio OGU', number(get(HEADERS[12])), HEADERS[12]]].forEach(([label, value, header]) => {
        if (!Number.isFinite(value) || value < 0) add(cells, `${label} deve ser numérico e não negativo.`, 'IMPEDITIVO', get(header), 'Valor financeiro inválido.');
      });
      if (Number.isFinite(compra) && Number.isFinite(financiamento) && compra < financiamento) add(cells, 'Valor da Compra deve ser maior ou igual ao Valor do Financiamento.', 'IMPEDITIVO', `${get(HEADERS[9])} < ${get(HEADERS[10])}`, 'Financiamento superior ao valor de compra.');

      const quantity = number(get(HEADERS[13]));
      if (!Number.isInteger(quantity) || quantity <= 0) add(cells, 'Quantidade de contratos deve ser inteira e maior que zero.', 'IMPEDITIVO', get(HEADERS[13]), 'Quantidade de contratos inválida.');
      if (!valid(get(HEADERS[14]), FAIXAS)) add(cells, 'Faixa fora da lista permitida.', 'IMPEDITIVO', get(HEADERS[14]), 'Faixa inválida.');
      const propertyType = clean(get(HEADERS[15]));
      if (!propertyType) add(cells, 'Tipo do imóvel está vazio.', 'ATENÇÃO', '', 'Preencher com Novo ou Usado quando disponível.');
      else if (!['NOVO', 'USADO'].includes(norm(propertyType))) add(cells, 'Tipo do imóvel deve ser Novo ou Usado.', 'IMPEDITIVO', propertyType, 'Tipo de imóvel inválido.');

      const state = STATES[norm(get(HEADERS[17]))];
      if (!state) add(cells, 'UF fora da lista de estados permitidos.', 'IMPEDITIVO', get(HEADERS[17]), 'Estado inválido.');
      else {
        if (norm(get(HEADERS[16])) !== state[0]) add(cells, 'Sigla da UF não corresponde ao estado.', 'IMPEDITIVO', get(HEADERS[16]), `Sigla esperada: ${state[0]}.`);
        if (norm(get(HEADERS[18])) !== norm(state[2])) add(cells, 'Região não corresponde ao estado.', 'IMPEDITIVO', get(HEADERS[18]), `Região esperada: ${state[2]}.`);
        if (norm(get(HEADERS[21])) !== state[1]) add(cells, 'Sigla da região não corresponde ao estado.', 'IMPEDITIVO', get(HEADERS[21]), `Sigla esperada: ${state[1]}.`);
      }
      if (!/^\d{4}$/.test(year) || Number(year) < 2009 || (ref && Number(year) > ref.getFullYear())) add(cells, 'Ano da contratação deve ser de 2009 até o ano de referência.', 'IMPEDITIVO', year, 'Ano de contratação inválido.');
      if (!/^\d{1,2}$/.test(month) || Number(month) < 1 || Number(month) > 12) add(cells, 'Mês da contratação deve ser numérico entre 1 e 12.', 'IMPEDITIVO', month, 'Mês de contratação inválido.');
      if (!valid(get(HEADERS[22]), FONTES)) add(cells, 'Fonte de recurso fora da lista permitida.', 'IMPEDITIVO', get(HEADERS[22]), 'Valores permitidos: FGTS, Fundo Social e SBPE.');

      const faixa = norm(get(HEADERS[14])), programa = norm(get(HEADERS[5])), fonte = norm(get(HEADERS[22]));
      if (faixa === 'FAIXA 3 FS' && fonte !== 'FUNDO SOCIAL') add(cells, 'Faixa 3 FS exige fonte de recurso Fundo Social.', 'IMPEDITIVO', get(HEADERS[22]), 'Fonte incompatível com a faixa.');
      if (!['FAIXA 3 FS', 'FORA MCMV', 'FORA MCMV/CVA'].includes(faixa) && !['MCMV', 'CVA'].includes(programa)) add(cells, 'Faixa MCMV exige programa federal MCMV ou CVA.', 'IMPEDITIVO', get(HEADERS[5]), 'Programa federal incompatível com a faixa.');
    };

    let headerRead = false;
    const parser = csvParser(cells => {
      if (!headerRead) {
        const headers = cells.map((value, index) => index === 0 ? clean(value).replace(/^\uFEFF/, '') : clean(value));
        const missing = HEADERS.filter(header => !headers.includes(header));
        if (missing.length) throw new Error(`Cabeçalhos obrigatórios ausentes: ${missing.join(', ')}`);
        headerMap = Object.fromEntries(HEADERS.map(header => [header, headers.indexOf(header)]));
        headerRead = true;
        return;
      }
      if (cells.some(value => clean(value) !== '')) check(cells);
    });

    const reader = file.stream().getReader(), decoder = new TextDecoder('utf-8');
    let read = 0, lastUpdate = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      read += value.byteLength;
      parser.push(decoder.decode(value, { stream: true }));
      const now = Date.now();
      if (now - lastUpdate > 150) {
        lastUpdate = now;
        self.postMessage({ type: 'progress', records, percent: Math.min(99, Math.round(read / file.size * 100)) });
      }
    }
    parser.push(decoder.decode());
    parser.end();
    if (!headerRead) throw new Error('Arquivo CSV ou TXT vazio.');
    self.postMessage({ type: 'complete', records, impeditivos, aceitaveis: atencoes, summary, rows, reference: firstReference || '' });
  } catch (error) {
    self.postMessage({ type: 'error', message: error.message || 'Não foi possível processar o arquivo CSV ou TXT.' });
  }
};
