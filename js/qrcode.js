const campoEndereco = document.getElementById('endereco');
const areaCodigo = document.getElementById('codigo');
let gerador = null;
 
document.getElementById('gerar').addEventListener('click', () => {
  const endereco = campoEndereco.value.trim();
// O endereço do site precisa começar com https:// para gerar o QR Code.
  if (!endereco.startsWith('https://')) {
    alert('Cole o endereço público completo, começando por https://');
    return;
  }
  areaCodigo.innerHTML = '';
  gerador = new QRCode(areaCodigo, {
    text: endereco,
    width: 260,
    height: 260
  });
});
 
document.getElementById('baixar').addEventListener('click', () => {
  const imagem = areaCodigo.querySelector('img');
  const canvas = areaCodigo.querySelector('canvas');
  const link = document.createElement('a');
  if (canvas) link.href = canvas.toDataURL('image/png');
  else if (imagem) link.href = imagem.src;
  else { alert('Gere o QR Code primeiro.'); return; }
  link.download = 'qrcode-catalogo.png';
  link.click();
});
