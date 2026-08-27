"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

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

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } },
  });

  if (error) {
    if (/registered|already/i.test(error.message)) {
      return { error: "Este e-mail já possui conta. Faça login." };
    }
    return { error: error.message };
  }

  // If email confirmation is ON in Supabase, there's no session yet.
  if (!data.session) {
    return { info: "Enviamos um e-mail de confirmação. Confirme para acessar sua conta." };
  }

  redirect("/conta");
}

export async function customerSignIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Preencha e-mail e senha." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "E-mail ou senha incorretos." };

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

  const supabase = await createClient();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "https://usealbizia.com.br";

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/conta/redefinir`,
  });

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
  if (!user) return { error: "Link expirado. Solicite um novo." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "Não foi possível salvar. Tente novamente." };

  redirect("/conta");
}
