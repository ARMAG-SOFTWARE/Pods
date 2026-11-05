// =========================================
// CONFIGURAÇÃO DO CATÁLOGO
// =========================================
// Edite os valores abaixo. Veja o passo a passo completo no README.md.

window.CATALOG_CONFIG = {
  // Nome da loja e frase exibidos no topo do catálogo
  storeName: "Catálogo de Pods",
  tagline: "Confira os pods disponíveis e peça pelo WhatsApp",

  // WhatsApp que recebe os pedidos (DDI + DDD + número, somente dígitos).
  // Ex: "5547999999999". Enquanto estiver vazio, o site esconde os botões
  // de WhatsApp e os cards mostram "Ver detalhes".
  whatsappNumber: "",

  // Supabase (banco de dados + fotos + login do admin).
  // Enquanto estes dois campos estiverem vazios, o catálogo roda em
  // "modo demonstração": os dados ficam salvos SÓ no seu navegador
  // e o cliente NÃO vai enxergar os pods que você cadastrar.
  // Chave "anon" é pública por natureza: quem protege os dados são as regras do supabase.sql.
  supabaseUrl: "https://hgrkqkucdtcydpxnrwxg.supabase.co",
  supabaseAnonKey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhncmtxa3VjZHRjeWRweG5yd3hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzNzQyNzksImV4cCI6MjEwODk1MDI3OX0.-BDcdy1puRGbEOh0VXFyMmiEy05i6mBQU2Qs1gyNVhM",

  // Nome do bucket de fotos no Supabase Storage (criado pelo supabase.sql)
  storageBucket: "pod-images",
};
