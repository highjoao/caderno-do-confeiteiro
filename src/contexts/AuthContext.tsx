import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  empresaId: string | null;
  perfil: { id: string; nome: string; email: string } | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  empresaId: null,
  perfil: null,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [perfil, setPerfil] = useState<{ id: string; nome: string; email: string } | null>(null);

  const fetchPerfil = async (userId: string) => {
    const { data } = await supabase
      .from("perfis")
      .select("id, nome, email, empresa_id")
      .eq("user_id", userId)
      .single();
    if (data) {
      setEmpresaId(data.empresa_id);
      setPerfil({ id: data.id, nome: data.nome, email: data.email });
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchPerfil(session.user.id), 0);
        } else {
          setEmpresaId(null);
          setPerfil(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchPerfil(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, empresaId, perfil, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
