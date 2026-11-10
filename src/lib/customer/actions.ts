"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { sendBrandedRecoveryEmail, sendBrandedSignupEmail } from "@/lib/auth-email";
import { adminGenerateSignupToken } from "@/lib/supabase/admin";
import { traduzirErroLogin, traduzirErroNovaSenha } from "@/lib/auth-erros";

export type AuthState = { error?: string; info?: string };

const signUpSchema = z.object({
  name: z.string().min(1, "Informe seu nome."),
  email: z.string().email("E-mail inválido."),
  password: z.string().min(8, "A senha deve ter ao menos 8 caracteres."),
});

// Customer sign-up (email + password). Requires "Enable Signups" to be ON in
// Supabase Auth. The admin panel is protected by an email allowlist, so a new
// customer account can never reach it (see lib/auth/admins.ts).
export async function customerSignUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const { name, email, password } = parsed.data;

  // A conta é criada pela API de administrador, que NÃO manda e-mail, e a
  // confirmação sai pelo e-mail da ALBIZIA. Com o signUp do cliente JS, o
  // Supabase mandava "Confirm your signup", em inglês, como primeiro contato
  // do cliente com a marca.
  const gerado = await adminGenerateSignupToken({ email, password, nome: name });

  if (gerado.jaExiste) {
    // A resposta na tela é IGUAL à de um cadastro novo: dizer "este e-mail
    // já tem conta" deixaria qualquer um descobrir quem é cliente da loja.
    // Quem é dono do e-mail recebe, na caixa dele, o caminho para entrar.
    await sendBrandedRecoveryEmail(email, "cliente").catch(() => {});
    return { info: MSG_CONFIRMACAO };
  }
  if (gerado.error || !gerado.tokenHash) {
    console.error("Cadastro de cliente falhou", gerado.error);
    return { error: "Não foi possível criar a conta agora. Tente de novo em instantes." };
  }

  const enviado = await sendBrandedSignupEmail(email, name, gerado.tokenHash, gerado.tipo ?? "signup");
  if (!enviado.ok) {
    console.error("E-mail de confirmação falhou", enviado.error);
    return { error: "Criamos sua conta, mas o e-mail de confirmação não saiu. Use \"Esqueci minha senha\" para receber um link." };
  }
  return { info: MSG_CONFIRMACAO };
}

const MSG_CONFIRMACAO =
  "Enviamos um e-mail para confirmar seu cadastro. Abra o link para ativar sua conta. Se não chegar em alguns minutos, olhe a caixa de spam.";

export async function customerSignIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Preencha e-mail e senha." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: traduzirErroLogin(error).error };

  redirect("/conta");
}

export async function customerSignOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/conta");
}

export async function customerRequestPasswordReset(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Informe seu e-mail." };

  // Falha de proposito ignorada: e-mail inexistente nao pode ser
  // distinguido de e-mail existente, senao vira consulta de quem tem conta.
  await sendBrandedRecoveryEmail(email, "cliente").catch(() => {});

  // Always return ok — never reveal whether the e-mail exists.
  return { info: "Se este e-mail tiver uma conta, você receberá o link em instantes." };
}

export type NewPasswordState = { error?: string };

export async function customerSetNewPassword(
  _prev: NewPasswordState,
  formData: FormData,
): Promise<NewPasswordState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) return { error: "A senha deve ter ao menos 8 caracteres." };
  if (password !== confirm) return { error: "As senhas não coincidem." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "O link de recuperação expirou ou já foi usado. Peça um novo em \"Esqueci minha senha\"." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: traduzirErroNovaSenha(error) };

  redirect("/conta");
}
