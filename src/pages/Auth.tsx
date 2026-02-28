import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Cake } from "lucide-react";

type AuthMode = "login" | "cadastro" | "recuperar";

const Auth = () => {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [nomeEmpresa, setNomeEmpresa] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: "Erro ao entrar", description: error.message, variant: "destructive" });
    } else {
      navigate("/");
    }
    setLoading(false);
  };

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nome, nome_empresa: nomeEmpresa || "Minha Confeitaria" },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) {
      toast({ title: "Erro no cadastro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Cadastro realizado!", description: "Verifique seu e-mail para confirmar a conta." });
      setMode("login");
    }
    setLoading(false);
  };

  const handleRecuperar = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "E-mail enviado!", description: "Verifique sua caixa de entrada." });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Cake className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl">
            {mode === "login" && "Entrar"}
            {mode === "cadastro" && "Criar Conta"}
            {mode === "recuperar" && "Recuperar Senha"}
          </CardTitle>
          <CardDescription>
            {mode === "login" && "Acesse seu painel de gestão"}
            {mode === "cadastro" && "Cadastre sua confeitaria"}
            {mode === "recuperar" && "Enviaremos um link para redefinir sua senha"}
          </CardDescription>
        </CardHeader>

        <form onSubmit={mode === "login" ? handleLogin : mode === "cadastro" ? handleCadastro : handleRecuperar}>
          <CardContent className="space-y-4">
            {mode === "cadastro" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="nome">Seu Nome</Label>
                  <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required placeholder="Maria Silva" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nomeEmpresa">Nome da Confeitaria</Label>
                  <Input id="nomeEmpresa" value={nomeEmpresa} onChange={(e) => setNomeEmpresa(e.target.value)} placeholder="Doce Encanto" />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="seu@email.com" />
            </div>

            {mode !== "recuperar" && (
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="••••••" />
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Aguarde..." : mode === "login" ? "Entrar" : mode === "cadastro" ? "Cadastrar" : "Enviar Link"}
            </Button>

            <div className="flex flex-col items-center gap-1 text-sm">
              {mode === "login" && (
                <>
                  <button type="button" onClick={() => setMode("cadastro")} className="text-primary hover:underline">
                    Criar uma conta
                  </button>
                  <button type="button" onClick={() => setMode("recuperar")} className="text-muted-foreground hover:underline">
                    Esqueci minha senha
                  </button>
                </>
              )}
              {mode !== "login" && (
                <button type="button" onClick={() => setMode("login")} className="text-primary hover:underline">
                  Voltar ao login
                </button>
              )}
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default Auth;
