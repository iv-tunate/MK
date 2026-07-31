import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/mk/Navbar";
import { Footer } from "@/components/mk/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Mail, ArrowLeft, ShieldCheck } from "lucide-react";
import { InfoTip } from "@/components/mk/InfoTip";

const detailsSchema = z.object({
  first_name: z.string().trim().min(1, "First name required").max(50),
  last_name:  z.string().trim().min(1, "Last name required").max(50),
  email:      z.string().trim().email("Valid email required").max(255),
  phone:      z.string().trim().min(7, "Valid phone required").max(20),
});

const Auth = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as any)?.redirectTo || "/dashboard";

  const [step, setStep] = useState<"email" | "details" | "otp" | "admin-password" | "create-admin-password">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [confirmAdminPassword, setConfirmAdminPassword] = useState("");
  const [adminPasswordRequired, setAdminPasswordRequired] = useState(false);
  const [details, setDetails] = useState({ first_name: "", last_name: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const [knownUser, setKnownUser] = useState(false);

  useEffect(() => {
    // If signed in AND we don't have an outstanding admin gate, redirect.
    if (user && step !== "admin-password" && step !== "create-admin-password") {
      navigate(redirectTo, { replace: true });
    }
  }, [user, navigate, redirectTo, step]);

  const checkEmail = async () => {
    const ok = z.string().trim().email().safeParse(email);
    if (!ok.success) { toast.error("Please enter a valid email"); return; }
    setBusy(true);
    try {
      // Check if profile exists
      const { data } = await supabase.from("profiles").select("id").eq("email", email.trim().toLowerCase()).maybeSingle();
      if (data) {
        setKnownUser(true);
        await sendOtp(true);
      } else {
        setKnownUser(false);
        setStep("details");
      }
    } finally { setBusy(false); }
  };

  const sendOtp = async (existing: boolean) => {
    setBusy(true);
    try {
      const meta = existing ? undefined : {
        first_name: details.first_name.trim(),
        last_name:  details.last_name.trim(),
        phone:      details.phone.trim(),
      };
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { shouldCreateUser: !existing, data: meta, emailRedirectTo: window.location.origin },
      });
      if (error) { toast.error(error.message); return; }
      setStep("otp");
      toast.success(`6-digit code sent to ${email}`);
    } finally { setBusy(false); }
  };

  const submitDetails = () => {
    const parsed = detailsSchema.safeParse({ ...details, email });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    sendOtp(false);
  };

  const verifyOtp = async () => {
    if (otp.length !== 6) { toast.error("Enter the 6-digit code"); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: otp,
        type: "email",
      });
      if (error) { toast.error(error.message); return; }
      // Check if this email is registered as an admin — if so, gate behind password.
      const { data: isAdmin } = await supabase.rpc("is_admin_email", { _email: email.trim().toLowerCase() });
      if (isAdmin) {
        setAdminPasswordRequired(true);
        // Check if admin has password set
        const { data: hasPassword } = await supabase.rpc("admin_has_password", { _email: email.trim().toLowerCase() });
        if (hasPassword) {
          setStep("admin-password");
          toast.success("Admin sign-in — extra password required");
        } else {
          setStep("create-admin-password");
          toast.success("Admin first-time login — set your password");
        }
      } else {
        toast.success("Signed in");
        navigate(redirectTo, { replace: true });
      }
    } finally { setBusy(false); }
  };

  const verifyAdminPassword = async () => {
    if (adminPassword.length < 8) { toast.error("Enter your admin password"); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("verify_admin_password", {
        _email: email.trim().toLowerCase(),
        _password: adminPassword,
      });
      if (error || !data) {
        // Password wrong — sign the user out, force them to start over.
        await supabase.auth.signOut();
        toast.error("Incorrect admin password");
        setAdminPassword("");
        return;
      }
      toast.success("Admin verified");
      navigate(redirectTo === "/dashboard" ? "/admin" : redirectTo, { replace: true });
    } finally { setBusy(false); }
  };

  const handleCreateAdminPassword = async () => {
    if (newAdminPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (newAdminPassword !== confirmAdminPassword) { toast.error("Passwords don't match"); return; }
    setBusy(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) {
        toast.error("Session not found. Please try again.");
        setStep("email");
        return;
      }
      const { error } = await supabase.rpc("set_admin_password", {
        _user_id: userId,
        _password: newAdminPassword,
      });
      if (error) { toast.error(error.message); return; }
      toast.success("Admin password created successfully");
      navigate(redirectTo === "/dashboard" ? "/admin" : redirectTo, { replace: true });
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto flex max-w-md flex-col px-4 py-16">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="font-display text-2xl tracking-wide">
              {step === "email" && "Sign in or register"}
              {step === "details" && "Tell us about you"}
              {step === "otp" && "Enter verification code"}
              {step === "admin-password" && "Admin password"}
              {step === "create-admin-password" && "Create admin password"}
            </CardTitle>
            <CardDescription>
              {step === "email" && "We'll email you a 6-digit code. No password needed."}
              {step === "details" && "We need a name and phone so our team can reach you about your orders."}
              {step === "otp" && `Code sent to ${email}`}
              {step === "admin-password" && "Your account has admin access. Confirm your admin password to continue."}
              {step === "create-admin-password" && "Your account has admin access, but no password is set yet. Create a password to continue."}
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            {step === "email" && (
              <>
                <div className="grid gap-2">
                  <Label className="flex items-center gap-1.5">
                    Email <InfoTip text="We use this for login codes and order updates. We never share it." />
                  </Label>
                  <Input type="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                </div>
                <Button onClick={checkEmail} disabled={busy} className="w-full bg-gradient-gold text-primary-foreground">
                  <Mail className="mr-2 h-4 w-4" /> Continue
                </Button>
              </>
            )}

            {step === "details" && (
              <>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <Label>First name</Label>
                    <Input value={details.first_name} onChange={(e) => setDetails({ ...details, first_name: e.target.value })} />
                  </div>
                  <div>
                    <Label>Last name</Label>
                    <Input value={details.last_name} onChange={(e) => setDetails({ ...details, last_name: e.target.value })} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label className="flex items-center gap-1.5">
                    Phone <InfoTip text="Include country code, e.g. +234..." />
                  </Label>
                  <Input value={details.phone} onChange={(e) => setDetails({ ...details, phone: e.target.value })} placeholder="+234..." />
                </div>
                <div className="grid gap-2">
                  <Label>Email</Label>
                  <Input value={email} disabled />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep("email")}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                  <Button onClick={submitDetails} disabled={busy} className="flex-1 bg-gradient-gold text-primary-foreground">Send code</Button>
                </div>
              </>
            )}

            {step === "otp" && (
              <>
                <div className="grid place-items-center py-4">
                  <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <p className="text-center text-xs text-muted-foreground pb-2">
                  (If you received a link instead of a code, just click it to log in)
                </p>
                <Button onClick={verifyOtp} disabled={busy || otp.length !== 6} className="w-full bg-gradient-gold text-primary-foreground">Verify & continue</Button>
                <button onClick={() => sendOtp(knownUser)} disabled={busy} className="text-xs text-muted-foreground hover:text-primary">
                  Didn't get it? Resend code
                </button>
                <button onClick={() => { setOtp(""); setStep("email"); }} className="text-xs text-muted-foreground hover:text-primary">
                  Use a different email
                </button>
              </>
            )}

            {step === "admin-password" && (
              <>
                <div className="grid gap-2">
                  <Label className="flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-primary" /> Admin password
                  </Label>
                  <Input
                    type="password"
                    autoFocus
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") verifyAdminPassword(); }}
                    placeholder="Your admin password"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    This is set by an existing admin in the admin dashboard. If you don't have one yet, ask an existing admin to set it for you.
                  </p>
                </div>
                <Button onClick={verifyAdminPassword} disabled={busy} className="w-full bg-gradient-gold text-primary-foreground">
                  <ShieldCheck className="mr-2 h-4 w-4" /> Unlock admin
                </Button>
                <button
                  onClick={async () => { await supabase.auth.signOut(); setStep("email"); setAdminPassword(""); setOtp(""); }}
                  className="text-xs text-muted-foreground hover:text-primary"
                >
                  Cancel and sign out
                </button>
              </>
            )}

            {step === "create-admin-password" && (
              <>
                <div className="grid gap-3">
                  <div className="grid gap-1.5">
                    <Label className="flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-primary" /> New password
                    </Label>
                    <Input
                      type="password"
                      autoFocus
                      value={newAdminPassword}
                      onChange={(e) => setNewAdminPassword(e.target.value)}
                      placeholder="At least 8 characters"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Confirm password</Label>
                    <Input
                      type="password"
                      value={confirmAdminPassword}
                      onChange={(e) => setConfirmAdminPassword(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleCreateAdminPassword(); }}
                      placeholder="Confirm password"
                    />
                  </div>
                </div>
                <Button onClick={handleCreateAdminPassword} disabled={busy} className="w-full bg-gradient-gold text-primary-foreground">
                  <ShieldCheck className="mr-2 h-4 w-4" /> Save & continue
                </Button>
                <button
                  onClick={async () => { await supabase.auth.signOut(); setStep("email"); setNewAdminPassword(""); setConfirmAdminPassword(""); }}
                  className="text-xs text-muted-foreground hover:text-primary"
                >
                  Cancel and sign out
                </button>
              </>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default Auth;