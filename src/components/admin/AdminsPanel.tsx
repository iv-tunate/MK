import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { KeyRound, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface AdminRow {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  has_password: boolean;
  created_at: string;
}

export const AdminsPanel = () => {
  const { user, isSuperAdmin } = useAuth();
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [busy, setBusy] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [pwTarget, setPwTarget] = useState<AdminRow | null>(null);
  const [pw, setPw] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc("list_admins");
    if (error) toast.error(error.message);
    else setRows((data ?? []) as any);
    setBusy(false);
  };
  useEffect(() => { load(); }, []);

  const grant = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email) return;
    const { error } = await supabase.rpc("grant_admin_by_email", { _email: email });
    if (error) { toast.error(error.message); return; }
    toast.success("Admin role granted. Set their password next.");
    setNewEmail("");
    load();
  };

  const revoke = async (r: AdminRow) => {
    if (!confirm(`Revoke admin role from ${r.email}?`)) return;
    const { error } = await supabase.rpc("revoke_admin_by_user_id", { _user_id: r.user_id });
    if (error) { toast.error(error.message); return; }
    toast.success("Admin revoked");
    load();
  };

  const savePassword = async () => {
    if (!pwTarget) return;
    if (pw.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (pw !== pwConfirm) { toast.error("Passwords don't match"); return; }
    setSaving(true);
    const { error } = await supabase.rpc("set_admin_password", {
      _user_id: pwTarget.user_id,
      _password: pw,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Password set for ${pwTarget.email}`);
    setPwTarget(null); setPw(""); setPwConfirm("");
    load();
  };

  return (
    <div className="grid gap-6">
      <section className="rounded-md border border-primary/30 bg-card p-4">
        <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          <UserPlus className="h-4 w-4" /> Add an admin
        </h3>
        <p className="mb-3 text-[11px] text-muted-foreground">
          The person must already have an account on the site (sign in once with that email). Then add them here and set their admin password.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="user@example.com"
            className="max-w-sm"
          />
          <Button onClick={grant} className="bg-gradient-gold text-primary-foreground">Grant admin</Button>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Current admins</h3>
        {busy ? (
          <div className="grid gap-2">{[1,2].map((i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : (
          <div className="overflow-hidden rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-card text-left text-xs uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="px-3 py-3">Admin</th>
                  <th className="px-3 py-3">Password</th>
                  <th className="px-3 py-3">Since</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const isMe = r.user_id === user?.id;
                  return (
                    <tr key={r.user_id} className="border-t border-border">
                      <td className="px-3 py-3">
                        <div className="font-medium">{r.first_name} {r.last_name} {isMe && <span className="text-[10px] uppercase tracking-widest text-primary">(you)</span>}</div>
                        <div className="text-[11px] text-muted-foreground">{r.email}</div>
                      </td>
                      <td className="px-3 py-3">
                        {r.has_password
                          ? <Badge variant="outline" className="border-emerald-500/40 text-emerald-400">Set</Badge>
                          : <Badge variant="outline" className="border-destructive/40 text-destructive">Not set</Badge>}
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">{format(parseISO(r.created_at), "d MMM yyyy")}</td>
                      <td className="px-3 py-3 text-right">
                        <div className="inline-flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => { setPwTarget(r); setPw(""); setPwConfirm(""); }}>
                            <KeyRound className="mr-1.5 h-3.5 w-3.5" /> {r.has_password ? "Reset password" : "Set password"}
                          </Button>
                          {!isMe && isSuperAdmin && (
                            <Button size="sm" variant="outline" onClick={() => revoke(r)} className="border-destructive/40 text-destructive hover:bg-destructive/10">
                              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Revoke
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Dialog open={!!pwTarget} onOpenChange={(o) => !o && setPwTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Admin password</DialogTitle>
            <DialogDescription>
              For {pwTarget?.email}. Minimum 8 characters. They'll use this every time they sign in to admin.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs">New password</Label>
              <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Confirm</Label>
              <Input type="password" value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwTarget(null)}>Cancel</Button>
            <Button onClick={savePassword} disabled={saving} className="bg-gradient-gold text-primary-foreground">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};