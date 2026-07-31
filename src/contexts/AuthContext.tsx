import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  signOut: () => Promise<void>;
  refreshAdmin: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const checkAdmin = async (userId: string | undefined) => {
    if (!userId) { setIsAdmin(false); setIsSuperAdmin(false); return; }
    const { data } = await supabase
      .from("user_roles")
      .select("role, is_super_admin")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    setIsAdmin(!!data);
    setIsSuperAdmin(!!(data as any)?.is_super_admin);
  };

  useEffect(() => {
    // Set up listener FIRST
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      // Defer the role lookup to avoid deadlock inside the callback.
      if (sess?.user) {
        setTimeout(() => { checkAdmin(sess.user.id); }, 0);
      } else {
        setIsAdmin(false);
        setIsSuperAdmin(false);
      }
    });

    // THEN fetch existing session
    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) checkAdmin(sess.user.id);
      setLoading(false);
    });

    return () => { sub.subscription.unsubscribe(); };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null); setSession(null); setIsAdmin(false); setIsSuperAdmin(false);
  };

  const refreshAdmin = async () => { await checkAdmin(user?.id); };

  return (
    <Ctx.Provider value={{ user, session, loading, isAdmin, isSuperAdmin, signOut, refreshAdmin }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};