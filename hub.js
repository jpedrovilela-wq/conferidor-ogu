const frame=document.getElementById('rotina');
const originNotice=document.getElementById('arquivo-origem');
function setRoutine(group){
  const fgts=group==='fgts';
  frame.src=fgts?'fgts.html':'ogu.html';
  frame.title=`Rotina de conferência ${fgts?'FGTS':'OGU'}`;
  originNotice.innerHTML=fgts
    ? '<strong>Arquivo esperado:</strong> envie o CSV extraído de <code>arquivo_casa_civil_fgts_contratacao</code>.'
    : '<strong>Arquivo esperado:</strong> envie o CSV extraído de <code>view_exportar_ogu_casa_civil</code>.';
}
document.querySelectorAll('input[name="grupo"]').forEach(input=>input.addEventListener('change',event=>setRoutine(event.target.value)));
