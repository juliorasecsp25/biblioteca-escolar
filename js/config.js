// Este arquivo liga o nosso site ao banco de dados Supabase.
// Estes dois dados são próprios para uso no site. Mesmo assim, não compartilhe senhas.
// Nunca coloque aqui a chave secreta do projeto. Ela não pode ficar no navegador.
 
const SUPABASE_URL = "https://ndblnheoabztbivgicwk.supabase.co/";
const SUPABASE_ANON_KEY = "sb_publishable_WdIYZ27F-jqahx__JrHGhw_NRPCHXGz";
 
// A variável db será usada nos outros arquivos para acessar o banco.
const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
