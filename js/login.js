const formLogin = document.getElementById('form-login');
const mensagemLogin = document.getElementById('mensagem-login');
 
// Quando o formulário for enviado, começa a conferência do e-mail e da senha.
formLogin.addEventListener('submit', async evento => {
  evento.preventDefault(); // Evita que o navegador recarregue a página.
  mensagemLogin.textContent = 'Verificando acesso...';
 
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('senha').value;
 
// Envia o e-mail e a senha para o Supabase conferir se estão corretos.
// O Supabase confere se o e-mail e a senha estão corretos.
  const { data, error } = await db.auth.signInWithPassword({ email, password });
 
  if (error) {
    mensagemLogin.textContent = 'Não foi possível entrar. Confira e-mail e senha.';
    return;
  }
 
// Ter uma conta não basta: também é preciso ter autorização de administrador.
  const { data: perfil, error: erroPerfil } = await db
    .from('profiles').select('role').eq('id', data.user.id).single();
 
  if (erroPerfil || perfil.role !== 'admin') {
    await db.auth.signOut();
    mensagemLogin.textContent = 'Esta conta não está autorizada para administrar a biblioteca.';
    return;
  }
 
  window.location.href = 'admin.html';
});
