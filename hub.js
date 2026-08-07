const frame=document.getElementById('rotina');
const originNotice=document.getElementById('arquivo-origem');
function setRoutine(group){
  const routes={ogu:'ogu.html',fgts:'fgts.html',rcb:'rcb.html?v=4'};
  const labels={ogu:'OGU',fgts:'FGTS',rcb:'Reforma Casa Brasil'};
  frame.src=routes[group];
  frame.title=`Rotina de conferência ${labels[group]}`;
  originNotice.innerHTML=group==='fgts'
    ? '<strong>Arquivo esperado:</strong> envie o CSV ou TXT extraído de <code>view_exportar_fgts_casa_civil</code>.'
    : group==='ogu'
      ? '<strong>Arquivo esperado:</strong> envie o CSV ou TXT extraído de <code>view_exportar_ogu_casa_civil</code>.'
      : '<strong>Arquivo esperado:</strong> envie o CSV ou TXT extraído de <code>view_exportar_rcb_casa_civil</code>.';
}
document.querySelectorAll('input[name="grupo"]').forEach(input=>input.addEventListener('change',event=>setRoutine(event.target.value)));
