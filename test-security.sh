#!/bin/bash

# Script de test de sécurité pour l'Audit SEO Tool
# Utilisez ce script pour vérifier que toutes les mesures de sécurité fonctionnent

echo "🔒 TEST DE SÉCURITÉ - Audit SEO Tool"
echo "===================================="

# Configuration
BASE_URL="http://localhost:3000"
if [ ! -z "$1" ]; then
    BASE_URL="$1"
fi

echo "🌐 Test sur : $BASE_URL"
echo ""

# Test 1: Headers de sécurité
echo "📋 Test 1: Vérification des headers de sécurité"
echo "----------------------------------------------"
response=$(curl -s -I "$BASE_URL")
echo "$response" | grep -E "(Content-Security-Policy|X-Frame-Options|X-Content-Type-Options|Referrer-Policy)"
echo ""

# Test 2: Protection CSRF
echo "🛡️  Test 2: Protection CSRF (devrait échouer sans header)"
echo "--------------------------------------------------------"
curl -s -X POST "$BASE_URL/api/audit" \
  -H "Content-Type: application/json" \
  -d '{"domain": "example.com", "timestamp": '$(date +%s000)'}' | jq .
echo ""

# Test 3: Validation domaine malveillant
echo "⚠️  Test 3: Tentative d'injection domaine (devrait échouer)"
echo "----------------------------------------------------------"
curl -s -X POST "$BASE_URL/api/audit" \
  -H "Content-Type: application/json" \
  -H "X-Requested-With: XMLHttpRequest" \
  -d '{"domain": "javascript:alert(1)", "timestamp": '$(date +%s000)'}' | jq .
echo ""

# Test 4: Validation timestamp
echo "⏰ Test 4: Timestamp expiré (devrait échouer)"
echo "--------------------------------------------"
old_timestamp=$(($(date +%s) - 600))000  # 10 minutes ago
curl -s -X POST "$BASE_URL/api/audit" \
  -H "Content-Type: application/json" \
  -H "X-Requested-With: XMLHttpRequest" \
  -d '{"domain": "example.com", "timestamp": '$old_timestamp'}' | jq .
echo ""

# Test 5: Rate limiting
echo "🚦 Test 5: Rate limiting (5+ requêtes rapides)"
echo "----------------------------------------------"
for i in {1..7}; do
    echo -n "Requête $i: "
    curl -s -X POST "$BASE_URL/api/audit" \
      -H "Content-Type: application/json" \
      -H "X-Requested-With: XMLHttpRequest" \
      -d '{"domain": "example.com", "timestamp": '$(date +%s000)'}' | jq -r '.error // "OK"'
    sleep 0.5
done
echo ""

# Test 6: Email avec caractères dangereux
echo "📧 Test 6: Email avec injection (devrait échouer)"
echo "------------------------------------------------"
curl -s -X POST "$BASE_URL/api/send-audit" \
  -H "Content-Type: application/json" \
  -H "X-Requested-With: XMLHttpRequest" \
  -d '{"domain": "example.com", "email": "test<script>alert(1)</script>@evil.com", "timestamp": '$(date +%s000)'}' | jq .
echo ""

# Test 7: Domaine local bloqué
echo "🏠 Test 7: Domaine local (devrait échouer)"
echo "-----------------------------------------"
curl -s -X POST "$BASE_URL/api/audit" \
  -H "Content-Type: application/json" \
  -H "X-Requested-With: XMLHttpRequest" \
  -d '{"domain": "localhost:3000", "timestamp": '$(date +%s000)'}' | jq .
echo ""

# Test 8: Mode invalide
echo "❌ Test 8: Mode d'audit invalide (devrait échouer)"
echo "-------------------------------------------------"
curl -s -X POST "$BASE_URL/api/audit" \
  -H "Content-Type: application/json" \
  -H "X-Requested-With: XMLHttpRequest" \
  -d '{"domain": "example.com", "mode": "malicious", "timestamp": '$(date +%s000)'}' | jq .
echo ""

# Test 9: Requête légitime
echo "✅ Test 9: Requête légitime (devrait réussir)"
echo "--------------------------------------------"
curl -s -X POST "$BASE_URL/api/audit" \
  -H "Content-Type: application/json" \
  -H "X-Requested-With: XMLHttpRequest" \
  -d '{"domain": "example.com", "mode": "fast", "timestamp": '$(date +%s000)'}' | jq -r '.success // .error'
echo ""

echo "🔍 Vérification des logs de sécurité:"
echo "------------------------------------"
if [ -f "logs/security.log" ]; then
    echo "Dernières entrées du log de sécurité:"
    tail -5 logs/security.log | jq .
else
    echo "⚠️  Fichier de log non trouvé (logs/security.log)"
fi

echo ""
echo "✅ Tests de sécurité terminés !"
echo "Vérifiez que les tests 'devrait échouer' ont bien échoué."
