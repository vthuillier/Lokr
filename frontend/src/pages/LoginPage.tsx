import type { FormEvent } from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { motion } from "framer-motion";
import { Shield, Mail, Lock, LogIn, ArrowRight, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
    const { setAuth } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [remember, setRemember] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    
    // TOTP state
    const [totpRequired, setTotpRequired] = useState(false);
    const [totpCode, setTotpCode] = useState("");

    async function handleLogin(e: FormEvent) {
        e.preventDefault();
        try {
            setLoading(true);
            setError("");
            
            const payload: any = { email, password };
            if (totpRequired) {
                payload.code = totpCode;
            }

            const response = await api.post("/auth/login", payload);
            
            // If the server indicates that TOTP is enabled and hasn't returned a token yet
            if (response.data.totpEnabled && !response.data.token) {
                setTotpRequired(true);
                setLoading(false);
                return;
            }

            localStorage.setItem("email", email);
            await setAuth(
                response.data.token, 
                password, 
                response.data.kdfSalt,
                response.data.encryptedVerification,
                response.data.verificationNonce,
                remember,
                response.data.publicKey,
                response.data.encryptedPrivateKey,
                response.data.privateKeyNonce
            );
            navigate("/vault");
        } catch (err: any) {
            setError(err.response?.data?.message || "Identifiants incorrects ou erreur serveur.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full space-y-8"
            >
                <div className="text-center">
                    <div className="mx-auto h-16 w-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-200 mb-6">
                        <Shield className="w-8 h-8" />
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900">
                        {totpRequired ? "Double Authentification" : "Content de vous revoir"}
                    </h2>
                    <p className="mt-2 text-slate-500 font-medium">
                        {totpRequired 
                            ? "Saisissez le code de validation à 6 chiffres pour accéder à votre coffre." 
                            : "Connectez-vous pour déverrouiller votre coffre."}
                    </p>
                </div>

                <div className="bg-white p-10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100">
                    <form className="space-y-6" onSubmit={handleLogin}>
                        {!totpRequired ? (
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-600 ml-1">Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                                        <input
                                            type="email"
                                            required
                                            className="input-field pl-12"
                                            placeholder="votre@email.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-600 ml-1">Mot de passe maître</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                                        <input
                                            type="password"
                                            required
                                            className="input-field pl-12"
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <label className="flex items-start gap-3 cursor-pointer group py-2">
                                    <div className="relative flex items-center mt-1">
                                        <input
                                            type="checkbox"
                                            className="peer sr-only"
                                            checked={remember}
                                            onChange={(e) => setRemember(e.target.checked)}
                                        />
                                        <div className="w-5 h-5 border-2 border-slate-200 rounded-lg peer-checked:bg-indigo-600 peer-checked:border-indigo-600 transition-all" />
                                        <CheckCircle2 className="absolute w-3.5 h-3.5 text-white scale-0 peer-checked:scale-100 transition-transform left-0.5" />
                                    </div>
                                    <div className="flex-1">
                                        <span className="text-sm font-bold text-slate-700">Se souvenir du mot de passe maître</span>
                                        {remember && (
                                            <motion.p 
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                className="text-[10px] text-amber-600 font-bold mt-1 leading-tight"
                                            >
                                                ⚠️ Risque de sécurité : votre mot de passe sera stocké sur cet ordinateur.
                                            </motion.p>
                                        )}
                                    </div>
                                </label>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-600 ml-1">Code de double authentification (TOTP)</label>
                                    <div className="relative">
                                        <Shield className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                                        <input
                                            type="text"
                                            required
                                            pattern="[0-9]{6}"
                                            maxLength={6}
                                            autoFocus
                                            className="input-field pl-12 tracking-[0.5em] text-center text-lg font-bold"
                                            placeholder="000000"
                                            value={totpCode}
                                            onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Saisissez le code à 6 chiffres affiché dans votre application d'authentification (Google Authenticator, Bitwarden, etc.).
                                    </p>
                                </div>
                            </div>
                        )}

                        {error && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex items-center gap-3 text-red-600 text-sm bg-red-50 p-4 rounded-2xl border border-red-100"
                            >
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <p className="font-medium">{error}</p>
                            </motion.div>
                        )}

                        <div className="flex flex-col gap-3">
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary w-full py-4 flex items-center justify-center gap-2 group"
                            >
                                {loading ? (
                                    <RefreshCw className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <LogIn className="w-5 h-5" />
                                        {totpRequired ? "Vérifier le code" : "Connexion"}
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>

                            {totpRequired && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setTotpRequired(false);
                                        setTotpCode("");
                                        setError("");
                                    }}
                                    className="text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors py-2 text-center"
                                >
                                    Retour aux identifiants
                                </button>
                            )}
                        </div>
                    </form>

                    {!totpRequired && (
                        <div className="mt-8 text-center">
                            <p className="text-slate-500 font-medium">
                                Nouveau ici ?{" "}
                                <Link to="/register" className="text-indigo-600 hover:text-indigo-700 font-bold underline decoration-indigo-200 underline-offset-4">
                                    Créer un compte
                                </Link>
                            </p>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}