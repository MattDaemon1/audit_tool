// Script de test pour vérifier la correction du PDF par email
async function testPdfEmail() {
    try {
        console.log('🧪 Test de l\'envoi d\'email avec PDF...');

        const response = await fetch('http://localhost:3000/api/send-audit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                domain: 'example.com',
                email: 'test@mattkonnect.com', // Email de test
                mode: 'fast'
            })
        });

        const data = await response.json();

        if (response.ok) {
            console.log('✅ Test réussi!');
            console.log('📊 Résultats:', {
                success: data.success,
                emailSent: data.emailSent,
                messageId: data.messageId,
                pdfGenerated: data.pdfGenerated
            });
        } else {
            console.log('❌ Erreur:', data.error);
        }
    } catch (error) {
        console.error('💥 Erreur de test:', error.message);
    }
}

// Attendre que le serveur soit prêt puis lancer le test
setTimeout(testPdfEmail, 10000); // 10 secondes pour que Next.js soit prêt
