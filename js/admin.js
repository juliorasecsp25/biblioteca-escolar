// Local onde mostramos avisos para quem está usando o painel.
const aviso = document.getElementById('aviso');
 
// Devolve a data de hoje no formato usado pelo banco: ano-mês-dia.
// Esse cuidado evita que a data apareça como o dia anterior ou seguinte.
function hojeLocal() {
  const agora = new Date();
  agora.setMinutes(agora.getMinutes() - agora.getTimezoneOffset());
  return agora.toISOString().slice(0, 10);
}
 
// Confere a autorização antes de mostrar a área administrativa.
async function verificarAdministrador() {
  const { data: sessaoData } = await db.auth.getSession();
  const sessao = sessaoData.session;
 
  if (!sessao) {
    window.location.href = 'login.html';
    return false;
  }
 
  const { data: perfil, error } = await db
    .from('profiles').select('role').eq('id', sessao.user.id).single();
 
  if (error || perfil.role !== 'admin') {
    await db.auth.signOut();
    window.location.href = 'login.html';
    return false;
  }
 
  aviso.textContent = 'Acesso autorizado.';
  return true;
}
 
// Quando clicar em Sair, fecha a conta e volta para a página inicial.
document.getElementById('sair').addEventListener('click', async () => {
  await db.auth.signOut();
  window.location.href = 'index.html';
});


// Estas listas guardam os dados que o painel acabou de buscar no banco.
let autores = [];
let assuntos = [];
let livros = [];
let alunos = [];
let emprestimos = [];
 
// Escreve um aviso na tela, como “Livro salvo” ou uma mensagem de erro.
function avisar(texto) {
  aviso.textContent = texto;
}
 
// Protege os textos antes de colocá-los na página.
function seguro(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[c]));
}
 
// Transforma a data para o formato que usamos no Brasil.
function dataBR(data) {
  if (!data) return '-';
  return new Date(data + 'T00:00:00').toLocaleDateString('pt-BR');
}


// Busca os autores e os assuntos para preencher as opções dos formulários.
async function carregarAutoresAssuntos() {
  const [resAutores, resAssuntos] = await Promise.all([
    db.from('authors').select('*').order('name'),
    db.from('subjects').select('*').order('name')
  ]);
  if (resAutores.error || resAssuntos.error) {
    avisar('Erro ao carregar autores/assuntos. Verifique as permissões.');
    return;
  }
  autores = resAutores.data;
  assuntos = resAssuntos.data;
 
  document.getElementById('autor').innerHTML = autores.map(a =>
    `<option value="${a.id}">${seguro(a.name)}</option>`).join('');
  document.getElementById('assunto').innerHTML = assuntos.map(s =>
    `<option value="${s.id}">${seguro(s.name)}</option>`).join('');
 
  document.getElementById('lista-autores').innerHTML = autores.map(a =>
    `<p>${seguro(a.name)}
      <button data-editar-autor="${a.id}">Editar</button>
      <button class="perigo" data-excluir-autor="${a.id}">Excluir</button></p>`).join('');
  document.getElementById('lista-assuntos').innerHTML = assuntos.map(s =>
    `<p>${seguro(s.name)}
      <button data-editar-assunto="${s.id}">Editar</button>
      <button class="perigo" data-excluir-assunto="${s.id}">Excluir</button></p>`).join('');
}


// Se ainda não existe um autor selecionado, cadastra um novo. Se existe, altera o atual.
document.getElementById('form-autor').addEventListener('submit', async e => {
  e.preventDefault();
  const id = document.getElementById('autor-id').value;
  const name = document.getElementById('nome-autor').value.trim();
  const consulta = id
    ? db.from('authors').update({ name }).eq('id', id)
    : db.from('authors').insert({ name });
  const { error } = await consulta;
  avisar(error ? error.message : 'Autor salvo.');
  e.target.reset(); document.getElementById('autor-id').value = '';
  carregarAutoresAssuntos();
});
 
// Para assuntos, usamos a mesma ideia do cadastro de autores.
document.getElementById('form-assunto').addEventListener('submit', async e => {
  e.preventDefault();
  const id = document.getElementById('assunto-id').value;
  const name = document.getElementById('nome-assunto').value.trim();
  const consulta = id
    ? db.from('subjects').update({ name }).eq('id', id)
    : db.from('subjects').insert({ name });
  const { error } = await consulta;
  avisar(error ? error.message : 'Assunto salvo.');
  e.target.reset(); document.getElementById('assunto-id').value = '';
  carregarAutoresAssuntos();
});


// Busca os livros cadastrados para mostrar na área administrativa.
async function carregarLivros() {
  const { data, error } = await db.from('books').select('*').order('title');
  if (error) { avisar(error.message); return; }
  livros = data;
 
  document.getElementById('lista-admin-livros').innerHTML = livros.map(l => {
    const autor = autores.find(a => a.id === l.author_id)?.name || 'Autor não encontrado';
    const assunto = assuntos.find(s => s.id === l.subject_id)?.name || 'Assunto não encontrado';
    return `<p><strong>${seguro(l.title)}</strong> — ${seguro(autor)} / ${seguro(assunto)}
      (${l.total_copies} exemplar(es)) — ${l.active ? 'Ativo' : 'Inativo'}
      <button data-editar-livro="${l.id}">Editar</button>
      ${l.active ? `<button data-inativar-livro="${l.id}">Inativar</button>` : `<button data-ativar-livro="${l.id}">Reativar</button>`}
      <button class="perigo" data-excluir-livro="${l.id}">Excluir</button></p>`;
  }).join('');
 
// No formulário de empréstimo, aparecem apenas livros que podem ser emprestados.
  document.getElementById('livro-emprestimo').innerHTML = livros
    .filter(l => l.active)
    .map(l => `<option value="${l.id}">${seguro(l.title)}</option>`).join('');
}
 
document.getElementById('form-livro').addEventListener('submit', async e => {
  e.preventDefault();
  const id = document.getElementById('livro-id').value;
  const registro = {
    title: document.getElementById('titulo').value.trim(),
    description: document.getElementById('descricao').value.trim(),
    publication_year: document.getElementById('ano').value ? Number(document.getElementById('ano').value) : null,
    total_copies: Number(document.getElementById('quantidade').value),
    author_id: document.getElementById('autor').value,
    subject_id: document.getElementById('assunto').value,
    active: document.getElementById('livro-ativo').checked
  };
  const consulta = id
    ? db.from('books').update(registro).eq('id', id)
    : db.from('books').insert(registro);
  const { error } = await consulta;
  avisar(error ? error.message : 'Livro salvo com sucesso.');
  if (!error) e.target.reset();
  document.getElementById('livro-id').value = '';
  await carregarLivros();
});
 
document.getElementById('limpar-livro').addEventListener('click', () => {
  document.getElementById('form-livro').reset();
  document.getElementById('livro-id').value = '';
});

// Busca os alunos cadastrados para mostrar no painel.
async function carregarAlunos() {
  const { data, error } = await db.from('students').select('*').order('name');
  if (error) { avisar(error.message); return; }
  alunos = data;
  document.getElementById('lista-alunos').innerHTML = alunos.map(a =>
    `<p>${seguro(a.ra)} - ${seguro(a.name)} - ${seguro(a.class_name)} — ${a.active ? 'Ativo' : 'Inativo'}
      <button data-editar-aluno="${a.id}">Editar</button>
      ${a.active ? `<button data-inativar-aluno="${a.id}">Inativar</button>` : `<button data-ativar-aluno="${a.id}">Reativar</button>`}
      <button class="perigo" data-excluir-aluno="${a.id}">Excluir</button></p>`).join('');
  document.getElementById('aluno-emprestimo').innerHTML = alunos
    .filter(a => a.active)
    .map(a => `<option value="${a.id}">${seguro(a.ra)} - ${seguro(a.name)}</option>`).join('');
}
 
document.getElementById('form-aluno').addEventListener('submit', async e => {
  e.preventDefault();
  const id = document.getElementById('aluno-id').value;
  const registro = {
    ra: document.getElementById('ra').value.trim(),
    name: document.getElementById('nome-aluno').value.trim(),
    email: document.getElementById('email-aluno').value.trim(),
    class_name: document.getElementById('turma').value.trim(),
    active: document.getElementById('aluno-ativo').checked
  };
  const consulta = id
    ? db.from('students').update(registro).eq('id', id)
    : db.from('students').insert(registro);
  const { error } = await consulta;
  avisar(error ? error.message : 'Aluno salvo.');
  if (!error) e.target.reset();
  document.getElementById('aluno-id').value = '';
  carregarAlunos();
});


// Quando o formulário for enviado, pede ao banco para registrar o empréstimo.
document.getElementById('form-emprestimo').addEventListener('submit', async e => {
  e.preventDefault();
// O site envia o pedido de empréstimo para o banco de dados.
// Antes de salvar, o banco confere se ainda existe exemplar livre.
  const { error } = await db.rpc('registrar_emprestimo', {
    p_student_id: document.getElementById('aluno-emprestimo').value,
    p_book_id: document.getElementById('livro-emprestimo').value,
    p_due_date: document.getElementById('data-prevista').value,
    p_notes: document.getElementById('observacoes').value.trim()
  });
  avisar(error ? error.message : 'Empréstimo registrado.');
  if (!error) e.target.reset();
  carregarEmprestimos();
});
 
// Busca os empréstimos e prepara a tabela que aparece na tela.
async function carregarEmprestimos() {
  const { data, error } = await db.from('loans').select('*').order('borrowed_at', { ascending: false });
  if (error) { avisar(error.message); return; }
  emprestimos = data;
  const linhas = emprestimos.map(e => {
    const aluno = alunos.find(a => a.id === e.student_id);
    const livro = livros.find(l => l.id === e.book_id);
    const atrasado = !e.returned_at && e.due_date < hojeLocal();
    const situacao = e.returned_at ? 'Devolvido' : (atrasado ? 'Atrasado' : 'Emprestado');
    return `<tr><td>${seguro(aluno?.ra || '')} - ${seguro(aluno?.name || '')}</td>
      <td>${seguro(livro?.title || '')}</td><td>${dataBR(e.borrowed_at)}</td>
      <td>${dataBR(e.due_date)}</td><td>${situacao}</td><td>
      ${e.returned_at ? '-' : `<button data-devolver="${e.id}">Registrar devolução</button>`}</td></tr>`;
  }).join('');
  document.getElementById('lista-emprestimos').innerHTML =
    `<table><tr><th>Aluno</th><th>Livro</th><th>Empréstimo</th><th>Previsão</th><th>Situação</th><th>Ação</th></tr>${linhas}</table>`;
 
// Aqui separamos os empréstimos que ainda estão ativos e os que passaram da data.
  const ativos = emprestimos.filter(e => !e.returned_at);
  const atrasados = ativos.filter(e => e.due_date < hojeLocal());
  document.getElementById('relatorio').innerHTML =
    `<p>Empréstimos ativos: <strong>${ativos.length}</strong></p>
     <p>Empréstimos atrasados: <strong>${atrasados.length}</strong></p>`;
}
 
// O banco registra a devolução sem apagar o empréstimo antigo.
document.addEventListener('click', async evento => {
  const id = evento.target.dataset.devolver;
  if (!id) return;
  if (!confirm('Confirmar a devolução deste livro?')) return;
  const { error } = await db.rpc('registrar_devolucao', { p_loan_id: id });
  avisar(error ? error.message : 'Devolução registrada.');
  carregarEmprestimos();
});


// Este trecho descobre qual botão foi clicado e executa a ação correspondente.
document.addEventListener('click', async evento => {
  const alvo = evento.target;
 
// Ao clicar em Editar, coloca os dados do livro de volta no formulário.
  if (alvo.dataset.editarLivro) {
    const l = livros.find(x => x.id === alvo.dataset.editarLivro);
    if (!l) return;
    document.getElementById('livro-id').value = l.id;
    document.getElementById('titulo').value = l.title;
    document.getElementById('descricao').value = l.description || '';
    document.getElementById('ano').value = l.publication_year || '';
    document.getElementById('quantidade').value = l.total_copies;
    document.getElementById('autor').value = l.author_id;
    document.getElementById('assunto').value = l.subject_id;
    document.getElementById('livro-ativo').checked = l.active;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
 
// Inativar esconde o livro do catálogo, mas mantém o registro e o histórico.
  if (alvo.dataset.inativarLivro || alvo.dataset.ativarLivro) {
    const idLivro = alvo.dataset.inativarLivro || alvo.dataset.ativarLivro;
    const novoEstado = Boolean(alvo.dataset.ativarLivro);
    const { error } = await db.from('books').update({ active: novoEstado }).eq('id', idLivro);
    avisar(error ? error.message : 'Situação do livro atualizada.');
    carregarLivros();
  }
 
// O banco pode impedir a exclusão quando o livro já aparece no histórico.
  if (alvo.dataset.excluirLivro) {
    if (!confirm('Excluir este livro?')) return;
    const { error } = await db.from('books').delete().eq('id', alvo.dataset.excluirLivro);
    avisar(error ? 'Não foi possível excluir. Confira se há histórico de empréstimos. ' + error.message : 'Livro excluído.');
    carregarLivros();
  }
 
  if (alvo.dataset.editarAutor) {
    const a = autores.find(x => x.id === alvo.dataset.editarAutor);
    document.getElementById('autor-id').value = a.id;
    document.getElementById('nome-autor').value = a.name;
  }
  if (alvo.dataset.excluirAutor) {
    if (!confirm('Excluir autor?')) return;
    const { error } = await db.from('authors').delete().eq('id', alvo.dataset.excluirAutor);
    avisar(error ? 'Este autor pode estar associado a um livro. ' + error.message : 'Autor excluído.');
    carregarAutoresAssuntos();
  }
 
  if (alvo.dataset.editarAssunto) {
    const s = assuntos.find(x => x.id === alvo.dataset.editarAssunto);
    document.getElementById('assunto-id').value = s.id;
    document.getElementById('nome-assunto').value = s.name;
  }
  if (alvo.dataset.excluirAssunto) {
    if (!confirm('Excluir assunto?')) return;
    const { error } = await db.from('subjects').delete().eq('id', alvo.dataset.excluirAssunto);
    avisar(error ? 'Este assunto pode estar associado a um livro. ' + error.message : 'Assunto excluído.');
    carregarAutoresAssuntos();
  }
 
  if (alvo.dataset.editarAluno) {
    const a = alunos.find(x => x.id === alvo.dataset.editarAluno);
    document.getElementById('aluno-id').value = a.id;
    document.getElementById('ra').value = a.ra;
    document.getElementById('nome-aluno').value = a.name;
    document.getElementById('email-aluno').value = a.email || '';
    document.getElementById('turma').value = a.class_name;
    document.getElementById('aluno-ativo').checked = a.active;
  }
  if (alvo.dataset.inativarAluno || alvo.dataset.ativarAluno) {
    const idAluno = alvo.dataset.inativarAluno || alvo.dataset.ativarAluno;
    const novoEstado = Boolean(alvo.dataset.ativarAluno);
    const { error } = await db.from('students').update({ active: novoEstado }).eq('id', idAluno);
    avisar(error ? error.message : 'Situação do aluno atualizada.');
    carregarAlunos();
  }
  if (alvo.dataset.excluirAluno) {
    if (!confirm('Excluir aluno?')) return;
    const { error } = await db.from('students').delete().eq('id', alvo.dataset.excluirAluno);
    avisar(error ? 'O aluno pode possuir empréstimos no histórico. ' + error.message : 'Aluno excluído.');
    carregarAlunos();
  }
});

async function iniciarPainel() {
  const autorizado = await verificarAdministrador();
  if (!autorizado) return;
 
// Primeiro carregamos autores e assuntos. Depois eles aparecem nas opções do formulário de livros.
  await carregarAutoresAssuntos();
  await carregarLivros();
  await carregarAlunos();
  await carregarEmprestimos();
}
 
iniciarPainel();
