const frame=document.getElementById('rotina');
document.querySelectorAll('input[name="grupo"]').forEach(input=>input.addEventListener('change',event=>{const fgts=event.target.value==='fgts';frame.src=fgts?'fgts.html':'ogu.html';frame.title=`Rotina de conferência ${fgts?'FGTS':'OGU'}`;}));
