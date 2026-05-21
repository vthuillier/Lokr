import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { api } from "../api/client";
import { encryptText, decryptText, generatePassword } from "../crypto/crypto";
import type { VaultItem, Folder, DecryptedFolder } from "../types/vault";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Plus, 
    Search, 
    LogOut, 
    Copy, 
    Check, 
    Trash2, 
    ExternalLink, 
    Eye, 
    EyeOff, 
    Key,
    Shield,
    RefreshCw,
    User as UserIcon,
    Globe,
    FileText,
    Pencil,
    X,
    AlertCircle,
    CheckCircle2,
    Folder as FolderIcon,
    FolderOpen
} from "lucide-react";
import { checkPasswordPwned } from "../service/hibpService";

type DecryptedItem = {
    id: string;
    name: string;
    username: string;
    password: string;
    url: string;
    notes: string;
    folderId?: string | null;
};

const Favicon = ({ url }: { url: string }) => {
    const [error, setError] = useState(false);
    
    const getFaviconUrl = (u: string) => {
        try {
            const domain = new URL(u).hostname;
            return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
        } catch {
            return null;
        }
    };

    const favicon = getFaviconUrl(url);

    if (error || !favicon) {
        return <Globe className="w-6 h-6 text-slate-400 group-hover:text-indigo-500 transition-colors" />;
    }

    return (
        <img 
            src={favicon} 
            alt="" 
            className="w-8 h-8 object-contain"
            onError={() => setError(true)}
        />
    );
};

export default function VaultPage() {
    const { derivedKey, logout } = useAuth();

    const [items, setItems] = useState<DecryptedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

    const [editingId, setEditingId] = useState<string | null>(null);
    const [name, setName] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [url, setUrl] = useState("");
    const [notes, setNotes] = useState("");
    const [showFormPassword, setShowFormPassword] = useState(false);
    const [formPwnedCount, setFormPwnedCount] = useState<number | null>(null);
    const [checkingFormPwned, setCheckingFormPwned] = useState(false);
    const [pwnedCounts, setPwnedCounts] = useState<Record<string, number>>({});

    // Folder State
    const [folders, setFolders] = useState<DecryptedFolder[]>([]);
    const [selectedFolderId, setSelectedFolderId] = useState<string>("all");
    const [itemFolderId, setItemFolderId] = useState<string>("none");
    const [newFolderName, setNewFolderName] = useState("");
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
    const [editingFolderName, setEditingFolderName] = useState("");

    // Security / MFA state
    const [showSecurityModal, setShowSecurityModal] = useState(false);
    const [mfaEnabled, setMfaEnabled] = useState(false);
    const [totpSetupData, setTotpSetupData] = useState<{ secret: string; otpauthUri: string } | null>(null);
    const [verifyCode, setVerifyCode] = useState("");
    const [securityError, setSecurityError] = useState("");
    const [securitySuccess, setSecuritySuccess] = useState("");
    const [securityLoading, setSecurityLoading] = useState(false);

    useEffect(() => {
        if (derivedKey) {
            loadItems();
            loadFolders();
            checkMfaStatus();
        }
    }, [derivedKey]);

    // Real-time HIBP check for form password input
    useEffect(() => {
        if (!password) {
            setFormPwnedCount(null);
            setCheckingFormPwned(false);
            return;
        }

        setCheckingFormPwned(true);
        const timer = setTimeout(async () => {
            const count = await checkPasswordPwned(password);
            setFormPwnedCount(count);
            setCheckingFormPwned(false);
        }, 500);

        return () => clearTimeout(timer);
    }, [password]);

    // Check pwned status for all items in the vault asynchronously
    useEffect(() => {
        if (items.length === 0) return;

        const uniquePasswords = Array.from(new Set(items.map(item => item.password).filter(Boolean)));
        
        uniquePasswords.forEach(async (pwd) => {
            if (pwnedCounts[pwd] !== undefined) return;
            const count = await checkPasswordPwned(pwd);
            setPwnedCounts(prev => ({ ...prev, [pwd]: count }));
        });
    }, [items]);

    async function checkMfaStatus() {
        try {
            const response = await api.get("/me");
            setMfaEnabled(response.data.totpEnabled);
        } catch (err) {
            console.error("Failed to fetch MFA status:", err);
        }
    }

    async function handleSetupTotp() {
        try {
            setSecurityLoading(true);
            setSecurityError("");
            setSecuritySuccess("");
            const response = await api.post("/user/totp/setup");
            setTotpSetupData(response.data);
        } catch (err: any) {
            setSecurityError(err.response?.data?.message || "Erreur lors de la configuration du TOTP.");
        } finally {
            setSecurityLoading(false);
        }
    }

    async function handleEnableTotp(e: FormEvent) {
        e.preventDefault();
        try {
            setSecurityLoading(true);
            setSecurityError("");
            setSecuritySuccess("");
            await api.post("/user/totp/enable", { code: verifyCode });
            setSecuritySuccess("Double authentification activée avec succès !");
            setMfaEnabled(true);
            setTotpSetupData(null);
            setVerifyCode("");
        } catch (err: any) {
            setSecurityError(err.response?.data?.message || "Code de validation incorrect.");
        } finally {
            setSecurityLoading(false);
        }
    }

    async function handleDisableTotp(e: FormEvent) {
        e.preventDefault();
        try {
            setSecurityLoading(true);
            setSecurityError("");
            setSecuritySuccess("");
            await api.post("/user/totp/disable", { code: verifyCode });
            setSecuritySuccess("Double authentification désactivée.");
            setMfaEnabled(false);
            setVerifyCode("");
        } catch (err: any) {
            setSecurityError(err.response?.data?.message || "Code de validation incorrect.");
        } finally {
            setSecurityLoading(false);
        }
    }

    async function loadItems() {
        if (!derivedKey) return;

        try {
            setLoading(true);
            const response = await api.get<VaultItem[]>("/vault/items");
            const decrypted = await Promise.all(
                response.data.map(async (item) => ({
                    id: item.id,
                    folderId: item.folderId,
                    name: await decryptText(item.encryptedName, item.nonce, derivedKey),
                    username: item.encryptedUsername
                        ? await decryptText(item.encryptedUsername, item.nonce, derivedKey)
                        : "",
                    password: item.encryptedPassword
                        ? await decryptText(item.encryptedPassword, item.nonce, derivedKey)
                        : "",
                    url: item.encryptedUrl
                        ? await decryptText(item.encryptedUrl, item.nonce, derivedKey)
                        : "",
                    notes: item.encryptedNotes
                        ? await decryptText(item.encryptedNotes, item.nonce, derivedKey)
                        : "",
                }))
            );
            setItems(decrypted);
        } catch (err) {
            console.error("Failed to load items:", err);
        } finally {
            setLoading(false);
        }
    }

    async function loadFolders() {
        if (!derivedKey) return;
        try {
            const response = await api.get<Folder[]>("/folders");
            const decrypted = await Promise.all(
                response.data.map(async (f) => ({
                    id: f.id,
                    name: await decryptText(f.encryptedName, f.nonce, derivedKey),
                }))
            );
            setFolders(decrypted);
        } catch (err) {
            console.error("Failed to load folders:", err);
        }
    }

    async function handleCreateFolder(e: React.FormEvent) {
        e.preventDefault();
        if (!newFolderName.trim() || !derivedKey) return;
        try {
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const encrypted = await encryptText(newFolderName.trim(), derivedKey, iv);
            await api.post("/folders", {
                encryptedName: encrypted.ciphertext,
                nonce: encrypted.iv
            });
            setNewFolderName("");
            setIsCreatingFolder(false);
            await loadFolders();
        } catch (err) {
            console.error("Failed to create folder:", err);
        }
    }

    async function handleRenameFolder(folderId: string) {
        if (!editingFolderName.trim() || !derivedKey) return;
        try {
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const encrypted = await encryptText(editingFolderName.trim(), derivedKey, iv);
            await api.put(`/folders/${folderId}`, {
                encryptedName: encrypted.ciphertext,
                nonce: encrypted.iv
            });
            setEditingFolderId(null);
            setEditingFolderName("");
            await loadFolders();
        } catch (err) {
            console.error("Failed to rename folder:", err);
        }
    }

    async function handleDeleteFolder(folderId: string) {
        if (!confirm("Voulez-vous vraiment supprimer ce dossier ? Les identifiants à l'intérieur ne seront pas supprimés.")) return;
        try {
            await api.delete(`/folders/${folderId}`);
            if (selectedFolderId === folderId) {
                setSelectedFolderId("all");
            }
            await loadFolders();
            await loadItems();
        } catch (err) {
            console.error("Failed to delete folder:", err);
        }
    }

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        if (!derivedKey) return;

        try {
            setSaving(true);
            const iv = crypto.getRandomValues(new Uint8Array(12));
            
            const encryptedName = await encryptText(name, derivedKey, iv);
            const encryptedUsername = await encryptText(username, derivedKey, iv);
            const encryptedPassword = await encryptText(password, derivedKey, iv);
            const encryptedUrl = await encryptText(url, derivedKey, iv);
            const encryptedNotes = await encryptText(notes, derivedKey, iv);

            const payload = {
                encryptedName: encryptedName.ciphertext,
                encryptedUsername: encryptedUsername.ciphertext,
                encryptedPassword: encryptedPassword.ciphertext,
                encryptedUrl: encryptedUrl.ciphertext,
                encryptedNotes: encryptedNotes.ciphertext,
                nonce: encryptedName.iv,
            };

            if (editingId) {
                await api.put(`/vault/items/${editingId}`, payload);
                const originalItem = items.find(i => i.id === editingId);
                const oldFolderId = originalItem?.folderId || "none";
                if (itemFolderId !== oldFolderId) {
                    await api.patch(`/folders/items/${editingId}/move`, {
                        folderId: itemFolderId === "none" ? null : itemFolderId
                    });
                }
            } else {
                const response = await api.post("/vault/items", payload);
                const createdItem = response.data;
                if (itemFolderId && itemFolderId !== "none") {
                    await api.patch(`/folders/items/${createdItem.id}/move`, {
                        folderId: itemFolderId
                    });
                }
            }

            cancelEdit();
            await loadItems();
        } catch (err) {
            console.error("Failed to save item:", err);
        } finally {
            setSaving(false);
        }
    }

    function startEdit(item: DecryptedItem) {
        console.log("Start editing item:", item.id);
        setEditingId(item.id);
        setName(item.name);
        setUsername(item.username);
        setPassword(item.password);
        setUrl(item.url);
        setNotes(item.notes);
        setItemFolderId(item.folderId || "none");
        setShowFormPassword(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function cancelEdit() {
        setEditingId(null);
        setName("");
        setUsername("");
        setPassword("");
        setUrl("");
        setNotes("");
        setItemFolderId("none");
        setShowFormPassword(false);
        setFormPwnedCount(null);
        setCheckingFormPwned(false);
    }

    async function handleDelete(id: string) {
        try {
            setDeletingId(id);
            await api.delete(`/vault/items/${id}`);
            await loadItems();
            setConfirmDeleteId(null);
        } catch (err) {
            console.error("Delete failed:", err);
            alert("Erreur lors de la suppression.");
        } finally {
            setDeletingId(null);
        }
    }

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const togglePasswordVisibility = (id: string) => {
        setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const filteredItems = items
        .filter(item => {
            if (selectedFolderId === "all") return true;
            if (selectedFolderId === "none") return !item.folderId;
            return item.folderId === selectedFolderId;
        })
        .filter(item => 
            item.name.toLowerCase().includes(search.toLowerCase()) ||
            item.username.toLowerCase().includes(search.toLowerCase()) ||
            item.url.toLowerCase().includes(search.toLowerCase())
        );

    return (
        <div className="min-h-screen bg-slate-50/50">
            {/* Header / Navbar */}
            <header className="sticky top-0 z-30 w-full border-b bg-white/80 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="bg-indigo-600 p-1.5 rounded-lg shadow-lg shadow-indigo-200">
                            <Shield className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-indigo-400">
                            SafeVault
                        </h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setShowSecurityModal(true)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-indigo-600 hover:bg-indigo-50/50 rounded-xl transition-all cursor-pointer"
                        >
                            <Shield className="w-4 h-4" />
                            Double Auth (MFA)
                        </button>
                        <button
                            onClick={logout}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                        >
                            <LogOut className="w-4 h-4" />
                            Déconnexion
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* Sidebar / Form */}
                    <aside className="lg:col-span-4 space-y-6">
                        <motion.div 
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`glass-card rounded-3xl p-6 border-2 transition-all ${editingId ? 'border-indigo-400 shadow-indigo-100 shadow-2xl' : 'border-transparent'}`}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2">
                                    {editingId ? <Pencil className="w-5 h-5 text-indigo-600" /> : <Plus className="w-5 h-5 text-indigo-600" />}
                                    <h2 className="text-lg font-bold text-slate-800">
                                        {editingId ? "Modifier l'identifiant" : "Ajouter un identifiant"}
                                    </h2>
                                </div>
                                {editingId && (
                                    <button 
                                        onClick={cancelEdit}
                                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-500 transition-all"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                )}
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-600 ml-1">Nom</label>
                                    <input
                                        className="input-field"
                                        placeholder="ex: Gmail, GitHub..."
                                        value={name}
                                        required
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-600 ml-1">Identifiant</label>
                                    <div className="relative">
                                        <UserIcon className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                                        <input
                                            className="input-field pl-11"
                                            placeholder="Email ou nom d'utilisateur"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-600 ml-1">Mot de passe</label>
                                    <div className="relative">
                                        <Key className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                                        <input
                                            className="input-field pl-11 pr-32"
                                            placeholder="••••••••"
                                            type={showFormPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                        />
                                        <div className="absolute right-2 top-2 bottom-2 flex gap-1">
                                            <button
                                                type="button"
                                                onClick={() => setShowFormPassword(!showFormPassword)}
                                                className="px-2.5 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl transition-all"
                                            >
                                                {showFormPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setPassword(generatePassword());
                                                    setShowFormPassword(true);
                                                }}
                                                className="px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition-all"
                                            >
                                                <RefreshCw className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    {checkingFormPwned && (
                                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 animate-pulse">
                                            <RefreshCw className="w-3 h-3 animate-spin" />
                                            Vérification HIBP...
                                        </p>
                                    )}
                                    {!checkingFormPwned && formPwnedCount !== null && (
                                        formPwnedCount > 0 ? (
                                            <motion.div
                                                initial={{ opacity: 0, y: -5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="text-xs text-rose-600 bg-rose-50 border border-rose-100 p-2 rounded-xl flex items-start gap-1.5 mt-1"
                                            >
                                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                                <span>
                                                    <strong>Compromis !</strong> Ce mot de passe est apparu {formPwnedCount.toLocaleString()} fois.
                                                </span>
                                            </motion.div>
                                        ) : (
                                            <motion.div
                                                initial={{ opacity: 0, y: -5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 p-2 rounded-xl flex items-start gap-1.5 mt-1"
                                            >
                                                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                                                <span>Mot de passe sûr (non compromis).</span>
                                            </motion.div>
                                        )
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-600 ml-1">URL</label>
                                    <div className="relative">
                                        <Globe className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                                        <input
                                            className="input-field pl-11"
                                            placeholder="https://..."
                                            value={url}
                                            onChange={(e) => setUrl(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-600 ml-1">Dossier</label>
                                    <div className="relative">
                                        <FolderIcon className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                                        <select
                                            className="input-field pl-11 bg-white"
                                            value={itemFolderId}
                                            onChange={(e) => setItemFolderId(e.target.value)}
                                        >
                                            <option value="none">Aucun dossier (Racine)</option>
                                            {folders.map(f => (
                                                <option key={f.id} value={f.id}>{f.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-600 ml-1">Notes</label>
                                    <div className="relative">
                                        <FileText className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                                        <textarea
                                            className="input-field pl-11 min-h-[100px] resize-none"
                                            placeholder="Notes additionnelles..."
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <button 
                                    disabled={saving || !name}
                                    className={`btn-primary w-full mt-4 flex items-center justify-center gap-2 transition-all ${editingId ? 'bg-indigo-700 shadow-indigo-200' : ''}`}
                                >
                                    {saving ? (
                                        <RefreshCw className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            {editingId ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                                            {editingId ? "Mettre à jour" : "Ajouter au coffre"}
                                        </>
                                    )}
                                </button>
                            </form>
                        </motion.div>

                        {/* Folders Management Sidebar Card */}
                        <motion.div
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="glass-card rounded-3xl p-6 border border-slate-100 space-y-4"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <FolderIcon className="w-5 h-5 text-indigo-600" />
                                    <h2 className="text-lg font-bold text-slate-800">Dossiers</h2>
                                </div>
                                <button
                                    onClick={() => setIsCreatingFolder(!isCreatingFolder)}
                                    className="p-1.5 hover:bg-indigo-50 rounded-xl text-indigo-600 transition-all cursor-pointer"
                                >
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>

                            {isCreatingFolder && (
                                <form onSubmit={handleCreateFolder} className="flex gap-2">
                                    <input
                                        className="input-field py-2 px-3 text-sm"
                                        placeholder="Nom du dossier..."
                                        value={newFolderName}
                                        onChange={(e) => setNewFolderName(e.target.value)}
                                        required
                                        autoFocus
                                    />
                                    <button type="submit" className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl cursor-pointer shrink-0">
                                        <Check className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setIsCreatingFolder(false); setNewFolderName(""); }}
                                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl cursor-pointer shrink-0"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </form>
                            )}

                            <div className="space-y-1">
                                <button
                                    onClick={() => setSelectedFolderId("all")}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                                        selectedFolderId === "all"
                                            ? "bg-indigo-50 text-indigo-600"
                                            : "text-slate-600 hover:bg-slate-50/50"
                                    }`}
                                >
                                    <span className="flex items-center gap-2">
                                        <FolderOpen className="w-4 h-4" />
                                        Tous les éléments
                                    </span>
                                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                                        {items.length}
                                    </span>
                                </button>

                                <button
                                    onClick={() => setSelectedFolderId("none")}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                                        selectedFolderId === "none"
                                            ? "bg-indigo-50 text-indigo-600"
                                            : "text-slate-600 hover:bg-slate-50/50"
                                    }`}
                                >
                                    <span className="flex items-center gap-2">
                                        <FolderIcon className="w-4 h-4 text-slate-400" />
                                        Hors dossier
                                    </span>
                                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                                        {items.filter(i => !i.folderId).length}
                                    </span>
                                </button>

                                <div className="w-full h-px bg-slate-100 my-2" />

                                {folders.map(folder => {
                                    const folderItemsCount = items.filter(i => i.folderId === folder.id).length;
                                    const isEditing = editingFolderId === folder.id;

                                    return (
                                        <div key={folder.id} className="group flex items-center justify-between">
                                            {isEditing ? (
                                                <form 
                                                    onSubmit={(e) => {
                                                        e.preventDefault();
                                                        handleRenameFolder(folder.id);
                                                    }}
                                                    className="flex gap-1.5 w-full py-1"
                                                >
                                                    <input
                                                        className="input-field py-1 px-2 text-xs"
                                                        value={editingFolderName}
                                                        onChange={(e) => setEditingFolderName(e.target.value)}
                                                        required
                                                        autoFocus
                                                    />
                                                    <button
                                                        type="submit"
                                                        className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg cursor-pointer shrink-0"
                                                    >
                                                        <Check className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => { setEditingFolderId(null); setEditingFolderName(""); }}
                                                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg cursor-pointer shrink-0"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </form>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => setSelectedFolderId(folder.id)}
                                                        className={`flex-1 flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold transition-all truncate cursor-pointer ${
                                                            selectedFolderId === folder.id
                                                                ? "bg-indigo-50 text-indigo-600"
                                                                : "text-slate-600 hover:bg-slate-50/50"
                                                        }`}
                                                    >
                                                        <span className="flex items-center gap-2 truncate">
                                                            <FolderIcon className="w-4 h-4 shrink-0 text-indigo-400" />
                                                            <span className="truncate">{folder.name}</span>
                                                        </span>
                                                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full shrink-0 group-hover:hidden">
                                                            {folderItemsCount}
                                                        </span>
                                                    </button>
                                                    <div className="hidden group-hover:flex items-center gap-1 pl-1">
                                                        <button
                                                            onClick={() => {
                                                                setEditingFolderId(folder.id);
                                                                setEditingFolderName(folder.name);
                                                            }}
                                                            className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 cursor-pointer"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteFolder(folder.id)}
                                                            className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-rose-600 cursor-pointer"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </aside>

                    {/* Main Content / Items List */}
                    <div className="lg:col-span-8 space-y-6">
                        
                        {/* Search Bar */}
                        <div className="relative group">
                            <Search className="absolute left-5 top-4.5 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                            <input 
                                className="w-full bg-white border border-slate-200 rounded-3xl py-4 pl-14 pr-6 text-lg shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                                placeholder="Rechercher par nom, site ou identifiant..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        {/* List */}
                        <div className="space-y-4">
                            {loading ? (
                                // Skeleton Loaders
                                [1, 2, 3].map(i => (
                                    <div key={i} className="h-32 rounded-3xl animate-shimmer" />
                                ))
                            ) : (
                                <AnimatePresence mode="popLayout">
                                    {filteredItems.length === 0 ? (
                                        <motion.div 
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center"
                                        >
                                            <div className="bg-slate-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                                <Search className="w-8 h-8 text-slate-400" />
                                            </div>
                                            <h3 className="text-xl font-bold text-slate-800">
                                                {search ? "Aucun résultat trouvé" : "Votre coffre est vide"}
                                            </h3>
                                            <p className="text-slate-500 mt-2">
                                                {search 
                                                    ? "Essayez d'ajuster vos filtres de recherche." 
                                                    : "Commencez par ajouter votre premier identifiant à l'aide du formulaire."}
                                            </p>
                                        </motion.div>
                                    ) : (
                                        filteredItems.map((item) => (
                                            <motion.div
                                                layout
                                                key={item.id}
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                className={`bg-white border rounded-3xl p-6 flex items-start gap-4 group transition-all ${editingId === item.id ? 'border-indigo-500 ring-2 ring-indigo-500/10' : 'border-slate-200 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5'}`}
                                            >
                                                <div className="bg-slate-50 w-12 h-12 rounded-2xl flex items-center justify-center group-hover:bg-indigo-50 transition-colors overflow-hidden border border-slate-100 shrink-0">
                                                    <Favicon url={item.url} />
                                                </div>

                                                <div className="flex-1 min-w-0 space-y-3">
                                                    <div className="flex items-start justify-between">
                                                        <div className="min-w-0">
                                                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 truncate">
                                                                <span className="truncate">{item.name}</span>
                                                                {item.url && (
                                                                    <a 
                                                                        href={item.url} 
                                                                        target="_blank" 
                                                                        rel="noopener noreferrer"
                                                                        className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-all shrink-0"
                                                                    >
                                                                        <ExternalLink className="w-4 h-4" />
                                                                    </a>
                                                                )}
                                                            </h3>
                                                            <p className="text-slate-500 text-sm font-medium truncate">{item.username}</p>
                                                        </div>

                                                        <div className="flex items-center gap-1 shrink-0 z-10">
                                                            {confirmDeleteId === item.id ? (
                                                                <div className="flex items-center gap-1 animate-in">
                                                                    <button 
                                                                        onClick={() => setConfirmDeleteId(null)}
                                                                        className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-all"
                                                                    >
                                                                        Annuler
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => handleDelete(item.id)}
                                                                        disabled={deletingId === item.id}
                                                                        className="px-3 py-1.5 text-xs font-bold bg-red-500 text-white hover:bg-red-600 rounded-lg shadow-sm shadow-red-200 transition-all flex items-center gap-1.5"
                                                                    >
                                                                        {deletingId === item.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                                                        Sûr ?
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <button 
                                                                        onClick={() => startEdit(item)}
                                                                        className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                                                    >
                                                                        <Pencil className="w-5 h-5" />
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => setConfirmDeleteId(item.id)}
                                                                        className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                                    >
                                                                        <Trash2 className="w-5 h-5" />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-3">
                                                        <div className="flex-1 min-w-[200px] bg-slate-50 rounded-2xl border border-slate-100 p-1.5 flex items-center gap-2">
                                                            <div className="flex-1 px-3 py-1.5 overflow-hidden">
                                                                <code className="text-sm font-mono font-bold text-indigo-900 truncate block">
                                                                    {visiblePasswords[item.id] ? item.password : "••••••••••••••••"}
                                                                </code>
                                                            </div>
                                                            <button 
                                                                onClick={() => togglePasswordVisibility(item.id)}
                                                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-all shrink-0"
                                                            >
                                                                {visiblePasswords[item.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                            </button>
                                                            <div className="w-px h-6 bg-slate-200 mx-1 shrink-0" />
                                                            <button 
                                                                onClick={() => handleCopy(item.password, item.id)}
                                                                className={`p-2 flex items-center gap-2 rounded-xl transition-all shrink-0 ${
                                                                    copiedId === item.id 
                                                                        ? "bg-green-500 text-white" 
                                                                        : "text-slate-400 hover:text-indigo-600 hover:bg-white"
                                                                }`}
                                                            >
                                                                {copiedId === item.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                                                {copiedId === item.id && <span className="text-xs font-bold pr-1">Copié</span>}
                                                            </button>
                                                        </div>
                                                        {pwnedCounts[item.password] !== undefined && pwnedCounts[item.password] > 0 && (
                                                            <motion.span 
                                                                initial={{ opacity: 0, scale: 0.9 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-2xl text-[11px] font-bold bg-rose-50 text-rose-600 border border-rose-100 shrink-0"
                                                            >
                                                                <AlertCircle className="w-3.5 h-3.5" />
                                                                Compromis ({pwnedCounts[item.password].toLocaleString()} fuites)
                                                            </motion.span>
                                                        )}
                                                    </div>

                                                    {item.notes && (
                                                        <div className="bg-amber-50/50 border border-amber-100/50 p-3 rounded-2xl">
                                                            <p className="text-xs text-amber-700 leading-relaxed font-medium">
                                                                {item.notes}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        ))
                                    )}
                                </AnimatePresence>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* Security Modal */}
            <AnimatePresence>
                {showSecurityModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => {
                                setShowSecurityModal(false);
                                setTotpSetupData(null);
                                setVerifyCode("");
                                setSecurityError("");
                                setSecuritySuccess("");
                            }}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />

                        {/* Modal container */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden z-10 p-8 space-y-6"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Shield className="w-6 h-6 text-indigo-600" />
                                    <h3 className="text-xl font-bold text-slate-800">
                                        Double Authentification (MFA)
                                    </h3>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowSecurityModal(false);
                                        setTotpSetupData(null);
                                        setVerifyCode("");
                                        setSecurityError("");
                                        setSecuritySuccess("");
                                    }}
                                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {securitySuccess && (
                                <div className="bg-green-50 border border-green-100 text-green-700 p-4 rounded-2xl flex items-center gap-3 animate-in">
                                    <Check className="w-5 h-5 text-green-600 shrink-0" />
                                    <p className="text-sm font-semibold">{securitySuccess}</p>
                                </div>
                            )}

                            {securityError && (
                                <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-2xl flex items-center gap-3 animate-in">
                                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                                    <p className="text-sm font-semibold">{securityError}</p>
                                </div>
                            )}

                            {mfaEnabled ? (
                                <div className="space-y-6">
                                    <div className="bg-indigo-50 border border-indigo-100/50 p-6 rounded-2xl text-center space-y-2">
                                        <div className="mx-auto w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
                                            <Shield className="w-6 h-6" />
                                        </div>
                                        <h4 className="font-bold text-indigo-900">La double authentification est activée</h4>
                                        <p className="text-sm text-indigo-700">
                                            Votre compte est protégé par une validation supplémentaire à chaque connexion.
                                        </p>
                                    </div>

                                    <form onSubmit={handleDisableTotp} className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-semibold text-slate-600 ml-1">
                                                Désactiver la double authentification
                                            </label>
                                            <p className="text-xs text-slate-500 mb-2">
                                                Saisissez un code à 6 chiffres pour confirmer la désactivation.
                                            </p>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    required
                                                    pattern="[0-9]{6}"
                                                    maxLength={6}
                                                    className="input-field text-center tracking-[0.5em] font-bold"
                                                    placeholder="000000"
                                                    value={verifyCode}
                                                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                                                />
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={securityLoading || verifyCode.length !== 6}
                                            className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3.5 rounded-2xl transition-all shadow-lg shadow-red-100 flex items-center justify-center gap-2 cursor-pointer"
                                        >
                                            {securityLoading ? (
                                                <RefreshCw className="w-5 h-5 animate-spin" />
                                            ) : (
                                                "Désactiver MFA"
                                            )}
                                        </button>
                                    </form>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {!totpSetupData ? (
                                        <div className="space-y-6">
                                            <p className="text-slate-500 text-sm leading-relaxed">
                                                Renforcez la sécurité de votre coffre en ajoutant un deuxième facteur d'authentification. Vous devrez saisir un code à usage unique généré par votre smartphone pour vous connecter.
                                            </p>
                                            <button
                                                onClick={handleSetupTotp}
                                                disabled={securityLoading}
                                                className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 cursor-pointer"
                                            >
                                                {securityLoading ? (
                                                    <RefreshCw className="w-5 h-5 animate-spin" />
                                                ) : (
                                                    "Configurer le TOTP"
                                                )}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            <div className="space-y-4">
                                                <p className="text-sm font-semibold text-slate-700">
                                                    1. Scannez ce QR Code avec votre application d'authentification (Google Authenticator, Microsoft Authenticator, Bitwarden, Authy, etc.) :
                                                </p>
                                                
                                                <div className="flex justify-center py-2">
                                                    <img 
                                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(totpSetupData.otpauthUri)}`} 
                                                        alt="QR Code MFA" 
                                                        className="border-4 border-slate-50 p-2 bg-white rounded-2xl shadow-md"
                                                    />
                                                </div>

                                                <p className="text-xs font-semibold text-slate-500 text-center">
                                                    Ou saisissez manuellement cette clé : 
                                                    <code className="block bg-slate-50 text-indigo-600 font-mono text-sm py-1.5 px-3 rounded-lg border border-slate-100 select-all font-bold mt-1 text-center">
                                                        {totpSetupData.secret}
                                                    </code>
                                                </p>
                                            </div>

                                            <div className="w-full h-px bg-slate-100" />

                                            <form onSubmit={handleEnableTotp} className="space-y-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-sm font-semibold text-slate-700">
                                                        2. Confirmez l'activation :
                                                    </label>
                                                    <p className="text-xs text-slate-500 mb-2">
                                                        Saisissez le code à 6 chiffres généré par votre application d'authentification.
                                                    </p>
                                                    <input
                                                        type="text"
                                                        required
                                                        pattern="[0-9]{6}"
                                                        maxLength={6}
                                                        className="input-field text-center tracking-[0.5em] font-bold"
                                                        placeholder="000000"
                                                        value={verifyCode}
                                                        onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                                                    />
                                                </div>

                                                <button
                                                    type="submit"
                                                    disabled={securityLoading || verifyCode.length !== 6}
                                                    className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 cursor-pointer"
                                                >
                                                    {securityLoading ? (
                                                        <RefreshCw className="w-5 h-5 animate-spin" />
                                                    ) : (
                                                        "Activer MFA"
                                                    )}
                                                </button>
                                            </form>
                                        </div>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}