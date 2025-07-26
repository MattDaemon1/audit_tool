// Utilitaire pour tester la validation base64 robuste
function testBase64Validation() {
    console.log('🔧 Test de validation base64...');

    // Fonction de validation (copie de celle dans emailService)
    const isValidBase64 = (str) => {
        try {
            // Vérifier que ce n'est pas vide
            if (!str || str.length === 0) return false;

            // Vérifier le format base64
            if (!/^[A-Za-z0-9+/]*={0,2}$/.test(str)) return false;

            // Vérifier la longueur (doit être multiple de 4)
            if (str.length % 4 !== 0) return false;

            // Test de décodage
            Buffer.from(str, 'base64');
            return true;
        } catch {
            return false;
        }
    };

    const testCases = [
        { name: 'Base64 valide', content: 'SGVsbG8gV29ybGQ=', expected: true },
        { name: 'Base64 avec padding', content: 'SGVsbG8=', expected: true },
        { name: 'Base64 sans padding', content: 'SGVsbG8', expected: false },
        { name: 'Caractères invalides', content: 'SGVs#bG8=', expected: false },
        { name: 'Chaîne vide', content: '', expected: false },
        { name: 'Longueur incorrecte', content: 'SGVsbG', expected: false }
    ];

    testCases.forEach(test => {
        const result = isValidBase64(test.content);
        const status = result === test.expected ? '✅' : '❌';
        console.log(`${status} ${test.name}: ${result} (attendu: ${test.expected})`);
    });
}

testBase64Validation();
