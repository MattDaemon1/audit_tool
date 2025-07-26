// Test simple d'envoi d'email sans PDF
const fs = require('fs');

const testEmailSimple = async () => {
    try {
        // Lire le fichier .env.local
        const envContent = fs.readFileSync('.env.local', 'utf8');
        const apiKey = envContent.match(/BREVO_API_KEY=(.+)/)?.[1];
        const fromEmail = envContent.match(/FROM_EMAIL=(.+)/)?.[1];
        const fromName = envContent.match(/FROM_NAME=(.+)/)?.[1];

        console.log(`Envoi depuis: ${fromName} <${fromEmail}>`);

        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'content-type': 'application/json',
                'api-key': apiKey
            },
            body: JSON.stringify({
                sender: {
                    name: fromName,
                    email: fromEmail
                },
                to: [{
                    email: "info@mattkonnect.com",
                    name: "Test Email"
                }],
                subject: "🧪 Test Email - Konnect Insights",
                htmlContent: `
                    <h1>🎉 Test Email Réussi !</h1>
                    <p>Cet email confirme que votre configuration Brevo fonctionne avec la nouvelle adresse <strong>${fromEmail}</strong></p>
                    <p>Votre système d'audit automatique avec emails est prêt !</p>
                    <hr>
                    <p>Matt Konnect - Test System</p>
                `
            })
        });

        if (response.ok) {
            const result = await response.json();
            console.log('✅ Email envoyé avec succès!');
            console.log('📧 Message ID:', result.messageId);
            console.log('📨 Vérifiez votre boîte email: info@mattkonnect.com');
        } else {
            const error = await response.json();
            console.error('❌ Erreur Brevo:', error);
        }
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    }
};

testEmailSimple();
