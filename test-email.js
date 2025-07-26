// Test script pour diagnostiquer le problème de base64
const fs = require('fs');

// Créer un petit PDF de test valide
const testPdfBase64 = "JVBERi0xLjQKJcOkw7zDtsO8CjIgMCBvYmoKPDwKL0xlbmd0aCAzIDAgUgovRmlsdGVyIC9GbGF0ZURlY29kZQo+PgpzdHJlYW0KeJxLzs8rziypjE8tTk5NyslPTVEoyUhNzStRyC9LLVIoLU4tykvMTVUoAEkBBQD//2JNCmVuZHN0cmVhbQplbmRvYmoKCjMgMCBvYmoKMTEyCmVuZG9iagoKNCAwIG9iago8PAovVHlwZSAvUGFnZQovUGFyZW50IDUgMCBSCi9Db250ZW50cyAyIDAgUgo+PgplbmRvYmoKCjUgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFs0IDAgUl0KL0NvdW50IDEKL1Jlc291cmNlcyA8PAovUHJvY1NldCBbL1BERiAvVGV4dF0KPj4KL01lZGlhQm94IFswIDAgNjEyIDc5Ml0KPj4KZW5kb2JqCgo2IDAgb2JqCjw8Ci9UeXBlIC9DYXRhbG9nCi9QYWdlcyA1IDAgUgo+PgplbmRvYmoKCnhyZWYKMCA3CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAwOSAwMDAwMCBuIAowMDAwMDAwMDc0IDAwMDAwIG4gCjAwMDAwMDAyMDQgMDAwMDAgbiAKMDAwMDAwMDIyNSAwMDAwMCBuIAowMDAwMDAwMjkzIDAwMDAwIG4gCjAwMDAwMDA0MjEgMDAwMDAgbiAKdHJhaWxlcgo8PAovU2l6ZSA3Ci9Sb290IDYgMCBSCj4+CnN0YXJ0eHJlZgo0NzAKJSVFT0Y=";

// Test du contenu
console.log('Longueur base64:', testPdfBase64.length);
console.log('Est divisible par 4:', testPdfBase64.length % 4 === 0);
console.log('Contient seulement des caractères base64 valides:', /^[A-Za-z0-9+/=]*$/.test(testPdfBase64));

// Test avec l'API Brevo
const testBrevoAPI = async () => {
    try {
        // Lire le fichier .env.local manuellement
        const fs = require('fs');
        const envContent = fs.readFileSync('.env.local', 'utf8');
        const apiKey = envContent.match(/BREVO_API_KEY=(.+)/)?.[1];

        if (!apiKey) {
            console.error('❌ Clé API Brevo non trouvée');
            return;
        }

        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'content-type': 'application/json',
                'api-key': apiKey
            },
            body: JSON.stringify({
                sender: {
                    name: "Konnect Insights by Matt Konnect",
                    email: "info@mattkonnect.com"
                },
                to: [{
                    email: "info@mattkonnect.com",
                    name: "Test"
                }],
                subject: "Test PDF Attachment",
                htmlContent: "<p>Test avec petit PDF</p>",
                attachment: [{
                    name: "test.pdf",
                    content: testPdfBase64
                }]
            })
        });

        if (response.ok) {
            const result = await response.json();
            console.log('✅ Email envoyé avec succès!', result.messageId);
        } else {
            const error = await response.json();
            console.error('❌ Erreur Brevo:', error);
        }
    } catch (error) {
        console.error('❌ Erreur réseau:', error.message);
    }
};

testBrevoAPI();
