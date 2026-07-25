import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext.jsx";
import { Button, Card, CardContent, Input } from "@/components/ui/index.jsx";
import { Landmark } from "lucide-react";

export default function LoginPage() {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") await login(email, password);
      else await register(email, password, name || undefined);
      navigate("/");
    } catch (submitError) {
      setError(submitError.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col justify-center gap-6 bg-primary p-12 text-primary-foreground md:flex">
        <Landmark className="h-12 w-12" />
        <h1 className="text-3xl font-bold leading-tight">UNESCO World Heritage Centre</h1>
        <p className="max-w-md text-primary-foreground/80">
          A secured, version-controlled portal over the World Heritage database — explore sites, funds,
          donations, committees and awards with full search and filtering.
        </p>
      </div>

      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6">
            <h2 className="mb-1 text-xl font-semibold">{mode === "login" ? "Sign in" : "Create account"}</h2>
            <p className="mb-5 text-sm text-muted-foreground">
              {mode === "login" ? "Access the heritage database portal." : "New accounts start with the User role."}
            </p>
            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === "register" && (
                <Input placeholder="Name (optional)" value={name} onChange={(event) => setName(event.target.value)} />
              )}
              <Input type="email" placeholder="Email" required value={email} onChange={(event) => setEmail(event.target.value)} />
              <Input type="password" placeholder="Password (min 8 chars)" required value={password} onChange={(event) => setPassword(event.target.value)} />
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
