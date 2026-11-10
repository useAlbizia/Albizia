// Tradução dos erros de login do Supabase para o que a pessoa precisa saber.
//
// Antes, toda falha virava "E-mail ou senha incorretos", inclusive bloqueio
// por excesso de tentativas e queda de conexão: a pessoa tentava a mesma
// senha certa de novo e de novo. O caso de credencial errada continua sem
// dizer QUAL dos dois está errado, de propósito: dizer "este e-mail não tem
// conta" ensina a quem tenta invadir quais e-mails existem.

export type ErroLogin = { error: string; sugerirRecuperar?: boolean };

type ErroSupabase = { code?: string; status?: number; message?: string } | null | undefined;

export function traduzirErroLogin(e: ErroSupabase): ErroLogin {
  const code = e?.code ?? "";
  const status = e?.status ?? 0;
  const msg = (e?.message ?? "").toLowerCase();

  if (code === "over_request_rate_limit" || code === "over_email_send_rate_limit" || status === 429) {
    return { error: "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo." };
  }
  if (code === "email_not_confirmed" || msg.includes("not confirmed")) {
    return { error: "Este e-mail ainda não foi confirmado. Procure o e-mail de confirmação na sua caixa de entrada." };
  }
  if (code === "user_banned") {
    return { error: "Este acesso está bloqueado. Fale com um administrador." };
  }
  if (code === "invalid_credentials" || status === 400) {
    return {
      error: "E-mail ou senha não conferem. Confira se o e-mail está certo e use o olho para ver a senha que digitou.",
      sugerirRecuperar: true,
    };
  }
  return { error: "Não foi possível entrar agora. Verifique sua conexão e tente de novo." };
}

/** Resposta do Supabase ao salvar a senha nova, em português. */
export function traduzirErroNovaSenha(e: ErroSupabase): string {
  const code = e?.code ?? "";
  const msg = (e?.message ?? "").toLowerCase();
  if (code === "same_password" || msg.includes("different from the old")) {
    return "A nova senha precisa ser diferente da anterior.";
  }
  if (code === "weak_password" || msg.includes("weak") || msg.includes("pwned") || msg.includes("leaked")) {
    // A proteção contra senha vazada do Supabase recusa senhas que já
    // apareceram em vazamentos públicos.
    return "Essa senha é fraca ou já apareceu em vazamentos de outros sites. Escolha outra, com letras, números e símbolos.";
  }
  if (code === "session_not_found" || code === "session_expired" || msg.includes("session")) {
    return "O link de recuperação expirou. Peça um novo em \"Esqueci a senha\".";
  }
  return "Não foi possível salvar agora. Tente de novo.";
}
