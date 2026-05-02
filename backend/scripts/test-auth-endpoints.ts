/**
 * Script de test pour les endpoints Auth
 * Usage: tsx scripts/test-auth-endpoints.ts
 */

/**
 * Script de test pour les endpoints Auth
 *
 * Installation:
 * npm install axios
 *
 * Usage:
 * npx tsx scripts/test-auth-endpoints.ts
 * ou
 * npm run test:auth
 */

import axios from 'axios';

const BASE_URL = process.env.API_URL || 'http://localhost:3000';
let accessToken = '';
let refreshToken = '';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  data?: any;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<any>): Promise<void> {
  try {
    console.log(`\n🧪 Test: ${name}`);
    const data = await fn();
    results.push({ name, passed: true, data });
    console.log(`✅ Réussi`);
    if (data && typeof data === 'object') {
      console.log(`   Réponse:`, JSON.stringify(data, null, 2).substring(0, 200));
    }
  } catch (error: any) {
    results.push({
      name,
      passed: false,
      error: error.response?.data?.message || error.message,
    });
    console.log(`❌ Échoué: ${error.response?.data?.message || error.message}`);
    if (error.response?.data) {
      console.log(`   Détails:`, JSON.stringify(error.response.data, null, 2).substring(0, 200));
    }
  }
}

async function main() {
  console.log('🚀 Tests des endpoints Auth\n');
  console.log(`📍 URL de base: ${BASE_URL}\n`);

  // Test 1: Register
  await test('POST /auth/register - Inscription', async () => {
    const response = await axios.post(`${BASE_URL}/auth/register`, {
      email: `test_${Date.now()}@example.com`,
      password: 'TestPassword123!',
      nom: 'Test',
      prenom: 'User',
      telephone: `+336${Math.floor(Math.random() * 100000000)}`,
    });

    accessToken = response.data.access_token;
    refreshToken = response.data.refresh_token;

    if (!accessToken || !refreshToken) {
      throw new Error('Tokens manquants dans la réponse');
    }

    return response.data;
  });

  // Test 2: Login
  let testEmail = '';
  let testPassword = 'TestPassword123!';

  await test('POST /auth/login - Connexion', async () => {
    // D'abord créer un utilisateur
    testEmail = `test_login_${Date.now()}@example.com`;
    await axios.post(`${BASE_URL}/auth/register`, {
      email: testEmail,
      password: testPassword,
      nom: 'Login',
      prenom: 'Test',
    });

    // Ensuite se connecter
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: testEmail,
      password: testPassword,
    });

    accessToken = response.data.access_token;
    refreshToken = response.data.refresh_token;

    return response.data;
  });

  // Test 3: Get Profile (avec token)
  await test('GET /auth/me - Profil utilisateur (protégé)', async () => {
    if (!accessToken) {
      throw new Error('Token manquant - login requis');
    }

    const response = await axios.get(`${BASE_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data;
  });

  // Test 4: Refresh Token
  await test('POST /auth/refresh - Rafraîchir le token', async () => {
    if (!refreshToken) {
      throw new Error('Refresh token manquant');
    }

    const response = await axios.post(`${BASE_URL}/auth/refresh`, {
      refresh_token: refreshToken,
    });

    if (response.data.access_token) {
      accessToken = response.data.access_token;
    }

    return response.data;
  });

  // Test 5: Login avec mauvais mot de passe
  await test('POST /auth/login - Mauvais mot de passe (doit échouer)', async () => {
    if (!testEmail) {
      throw new Error('Email de test manquant');
    }

    try {
      await axios.post(`${BASE_URL}/auth/login`, {
        email: testEmail,
        password: 'WrongPassword123!',
      });
      throw new Error('Devrait échouer avec un mauvais mot de passe');
    } catch (error: any) {
      if (error.response?.status === 401) {
        return { message: 'Erreur 401 attendue - test réussi' };
      }
      throw error;
    }
  });

  // Test 6: Accès sans token (doit échouer)
  await test('GET /auth/me - Sans token (doit échouer)', async () => {
    try {
      await axios.get(`${BASE_URL}/auth/me`);
      throw new Error('Devrait échouer sans token');
    } catch (error: any) {
      if (error.response?.status === 401) {
        return { message: 'Erreur 401 attendue - test réussi' };
      }
      throw error;
    }
  });

  // Test 7: Register avec email existant (doit échouer)
  await test('POST /auth/register - Email existant (doit échouer)', async () => {
    if (!testEmail) {
      throw new Error('Email de test manquant');
    }

    try {
      await axios.post(`${BASE_URL}/auth/register`, {
        email: testEmail,
        password: testPassword,
        nom: 'Duplicate',
        prenom: 'Test',
      });
      throw new Error('Devrait échouer avec un email existant');
    } catch (error: any) {
      if (error.response?.status === 409) {
        return { message: 'Erreur 409 attendue - test réussi' };
      }
      throw error;
    }
  });

  // Test 8: Logout
  await test('POST /auth/logout - Déconnexion', async () => {
    if (!refreshToken) {
      throw new Error('Refresh token manquant');
    }

    const response = await axios.post(
      `${BASE_URL}/auth/logout`,
      { refresh_token: refreshToken },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return response.data;
  });

  // Résumé
  console.log('\n' + '='.repeat(60));
  console.log('📊 RÉSUMÉ DES TESTS');
  console.log('='.repeat(60));

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  results.forEach((result, index) => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${index + 1}. ${result.name}`);
    if (!result.passed && result.error) {
      console.log(`   Erreur: ${result.error}`);
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Réussis: ${passed}/${results.length}`);
  console.log(`❌ Échoués: ${failed}/${results.length}`);
  console.log('='.repeat(60));

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});
