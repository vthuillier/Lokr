import type { FormEvent } from "react";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { generateSalt, uint8ArrayToBase64, deriveKey, encryptText, generateRsaKeyPair } from "../crypto/crypto";
import { checkPasswordPwned } from "../service/hibpService";
import { motion } from "framer-motion";
import { Shield, Mail, Lock, UserPlus, ArrowRight, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";

export default function RegisterPage() {
    const { setAuth } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [remember, setRemember] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [pwnedCount, setPwnedCount] = useState<number | null>(null);
    const [checkingPwned, setCheckingPwned] = useState(false);

    useEffect(() => {
        if (!password) {
            setPwnedCount(null);
            setCheckingPwned(false);
            return;
        }

        if (password.length < 8) {
            setPwnedCount(null);
            setCheckingPwned(false);
            return;
        }

        setCheckingPwned(true);
        const timer = setTimeout(async () => {
            const count = await checkPasswordPwned(password);
            setPwnedCount(count);
            setCheckingPwned(false);
        }, 500);

        return () => clearTimeout(timer);
    }, [password]);

    async function handleRegister(e: FormEvent) {
        e.preventDefault();
        try {
            setLoading(true);
            setError("");
            
            const salt = generateSalt();
            const saltBase64 = uint8ArrayToBase64(salt);
            const derivedKey = await deriveKey(password, salt);
            const verification = await encryptText("VERIFIED", derivedKey);

            // Generate and encrypt RSA Key Pair
            const { publicKeySpki, privateKeyPkcs8 } = await generateRsaKeyPair();
            const encryptedPriv = await encryptText(privateKeyPkcs8, derivedKey);

            const response = await api.post("/auth/register", {
                email,
                password,
                kdfSalt: saltBase64,
                encryptedVerification: verification.ciphertext,
                verificationNonce: verification.iv,
                publicKey: publicKeySpki,
                encryptedPrivateKey: encryptedPriv.ciphertext,
                privateKeyNonce: encryptedPriv.iv
            });

            localStorage.setItem("email", email);
            await setAuth(
                response.data.token, 
                password, 
                saltBase64, 
                verification.ciphertext, 
                verification.iv,
                remember,
                publicKeySpki,
                encryptedPriv.ciphertext,
                encryptedPriv.iv
            );
            navigate("/vault");
        } catch (err: any) {
            setError(err.response?.data?.message || "Erreur lors de la création du compte.");
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
                    <h2 className="text-3xl font-bold text-slate-900">Bienvenue sur SafeVault</h2>
                    <p className="mt-2 text-slate-500 font-medium">
                        Créez votre coffre-fort chiffré en quelques secondes.
                    </p>
                </div>

                <div className="bg-white p-10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100">
                    <form className="space-y-6" onSubmit={handleRegister}>
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
                                        placeholder="Min. 8 caractères"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>
                                {checkingPwned && (
                                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 animate-pulse">
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                        Vérification de la sécurité du mot de passe...
                                    </p>
                                )}
                                {!checkingPwned && pwnedCount !== null && (
                                    pwnedCount > 0 ? (
                                        <motion.div
                                            initial={{ opacity: 0, y: -5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="text-xs text-rose-600 bg-rose-50 border border-rose-100 p-2.5 rounded-xl flex items-start gap-1.5 mt-1.5"
                                        >
                                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                            <span>
                                                <strong>Attention !</strong> Ce mot de passe est compromis et est apparu dans <strong>{pwnedCount.toLocaleString()}</strong> fuites de données. Nous vous recommandons fortement d'en choisir un autre.
                                            </span>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            initial={{ opacity: 0, y: -5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl flex items-start gap-1.5 mt-1.5"
                                        >
                                            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                                            <span>
                                                Ce mot de passe n'a pas été trouvé dans les fuites de données connues (sûr).
                                            </span>
                                        </motion.div>
                                    )
                                )}
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

                        <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 space-y-2">
                            <div className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-indigo-600 mt-0.5" />
                                <p className="text-xs text-indigo-900 font-medium leading-tight">Chiffrement AES-GCM 256 bits</p>
                            </div>
                            <div className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-indigo-600 mt-0.5" />
                                <p className="text-xs text-indigo-900 font-medium leading-tight">Clé dérivée localement (PBKDF2)</p>
                            </div>
                        </div>

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

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full py-4 flex items-center justify-center gap-2 group"
                        >
                            {loading ? (
                                <RefreshCw className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <UserPlus className="w-5 h-5" />
                                    Créer mon compte
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-slate-500 font-medium">
                            Déjà inscrit ?{" "}
                            <Link to="/login" className="text-indigo-600 hover:text-indigo-700 font-bold underline decoration-indigo-200 underline-offset-4">
                                Se connecter
                            </Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}