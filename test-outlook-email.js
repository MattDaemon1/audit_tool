// Test de l'email avec le nouveau template compatible Outlook
async function testOutlookEmail() {
    try {
        console.log('🧪 Test de l\'email compatible Outlook...');

        const response = await fetch('http://localhost:3000/api/send-audit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                domain: 'google.com',
                email: 'info@mattkonnect.com', // Email de test
                mode: 'fast'
            })
        });

        const data = await response.json();

        if (response.ok) {
            console.log('✅ Test Outlook réussi!');
            console.log('📊 Résultats:', {
                success: data.success,
                emailSent: data.emailSent,
                messageId: data.messageId,
                pdfGenerated: data.pdfGenerated
            });
            console.log('📧 Vérifiez l\'affichage de l\'en-tête dans Outlook PC maintenant!');
        } else {
            console.log('❌ Erreur:', data.error);
        }
    } catch (error) {
        console.error('💥 Erreur de test:', error.message);
    }
}

testOutlookEmail();
