// Dá apelidos aos campos e botões da página para usar mais facilmente abaixo.
const campoTermo = document.getElementById('termo');
const botaoBuscar = document.getElementById('buscar');
const botaoLimpar = document.getElementById('limpar');
const listaLivros = document.getElementById('lista-livros');
const mensagem = document.getElementById('mensagem');
 
// Prepara um texto antes de mostrá-lo na página.
// Assim, um texto digitado por alguém não é confundido com um comando do site.
function seguro(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, caractere => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;',
    '"': '&quot;', "'": '&#39;'
  }[caractere]));
}
 
// Esta função busca no banco os livros que combinam com a palavra digitada.
async function carregarCatalogo(termo = '') {
  mensagem.textContent = 'Buscando livros...';
  listaLivros.innerHTML = '';
 
// Pede ao Supabase para executar a consulta que criamos no banco.
// Espera o banco responder. data guarda o resultado; error guarda uma possível mensagem de erro.
  const { data, error } = await db.rpc('catalogo_publico', {
    p_termo: termo
  });
 
  if (error) {
    mensagem.textContent = 'Não foi possível carregar o catálogo: ' + error.message;
    return;
  }
 
  if (!data || data.length === 0) {
    mensagem.textContent = 'Nenhum livro encontrado.';
    return;
  }
 
  mensagem.textContent = data.length + ' livro(s) encontrado(s).';
 
// Para cada livro encontrado, monta um cartão na tela.
// Repete o mesmo passo para cada livro que veio do banco.
  data.forEach(livro => {
    const cartao = document.createElement('article');
    cartao.className = 'cartao';
    cartao.innerHTML = `
      <h3>${seguro(livro.title)}</h3>
      <p><strong>Autor:</strong> ${seguro(livro.author_name)}</p>
      <p><strong>Assunto:</strong> ${seguro(livro.subject_name)}</p>
      <p>${seguro(livro.description)}</p>
      <p><strong>Ano:</strong> ${seguro(livro.publication_year || 'Não informado')}</p>
      <p><strong>Disponíveis:</strong> ${livro.available_copies}</p>
      <p><strong>Total no acervo:</strong> ${livro.total_copies}</p>
    `;
    listaLivros.appendChild(cartao);
  });
}
 
botaoBuscar.addEventListener('click', () => carregarCatalogo(campoTermo.value.trim()));
botaoLimpar.addEventListener('click', () => {
  campoTermo.value = '';
  carregarCatalogo();
});
 
// Também dá para pesquisar apertando Enter no teclado.
campoTermo.addEventListener('keydown', evento => {
  if (evento.key === 'Enter') carregarCatalogo(campoTermo.value.trim());
});
 
// Assim que a página abre, carrega a lista completa de livros.
carregarCatalogo();
