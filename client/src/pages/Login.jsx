import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth.jsx";
import { Button, Card, CardContent, Input } from "@/components/ui/index.jsx";
import { Landmark } from "lucide-react";

export default function Login() {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") await login(email, password);
      else await register(email, password, name || undefined);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="hidden md:flex flex-col justify-center gap-6 p-12 bg-primary text-primary-foreground">
        <Landmark className="h-12 w-12" />
        <h1 className="text-3xl font-bold leading-tight">UNESCO World Heritage Centre</h1>
        <p className="text-primary-foreground/80 max-w-md">
          A secured, version-controlled portal over the World Heritage database — explore sites, funds,
          donations, committees and awards with full search and filtering.
        </p>
        <div className="text-sm text-primary-foreground/70 space-y-1">
          <div>Demo admin — admin@whc.org / Admin@12345</div>
          <div>Demo user — user@whc.org / User@12345</div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6">
            <h2 className="text-xl font-semibold mb-1">{mode === "login" ? "Sign in" : "Create account"}</h2>
            <p className="text-sm text-muted-foreground mb-5">
              {mode === "login" ? "Access the heritage database portal." : "New accounts start with the User role."}
            </p>
            <form onSubmit={submit} className="space-y-3">
              {mode === "register" && (
                <Input placeholder="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
              )}
              <Input type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              <Input type="password" placeholder="Password (min 8 chars)" required value={password} onChange={(e) => setPassword(e.target.value)} />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Register"}
              </Button>
            </form>
            <button
              className="mt-4 text-sm text-primary hover:underline"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError("");
              }}
            >
              {mode === "login" ? "Need an account? Register" : "Have an account? Sign in"}
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
