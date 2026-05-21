/**
 * Vérifie si un mot de passe est compromis via le service HIBP
 * @param password Mot de passe à vérifier
 * @returns Nombre de fois où le mot de passe a été compromis, 0 sinon
 */
export async function checkPasswordPwned(password: string): Promise<number> {
    if (!password) return 0;

    // 1. Hachage SHA-1 du mot de passe
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-1", data);

    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();

    // 2. Préfixe (5 premiers caractères) pour la requête
    const prefix = hashHex.slice(0, 5);
    const suffix = hashHex.slice(5);

    try {
        const response = await fetch(
            `https://api.pwnedpasswords.com/range/${prefix}`,
            {
                headers: {
                    // Indique que tu utilises l'API de manière responsable
                    "Add-Padding": "true",
                },
            }
        );

        if (!response.ok) {
            console.error("Erreur récupération HIBP:", response.status);
            return 0;
        }

        const text = await response.text();
        const lines = text.split("\n");

        // 3. Chercher le suffixe dans les résultats
        const pwnedEntry = lines.find(line => line.startsWith(suffix));

        if (pwnedEntry) {
            // Compte les occurrences
            const count = parseInt(pwnedEntry.split(":")[1]);
            return count;
        }

        return 0;

    } catch (error) {
        console.error("Erreur checkPasswordPwned:", error);
        return 0;
    }
}