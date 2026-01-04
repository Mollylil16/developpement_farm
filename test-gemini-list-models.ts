/**
 * Script pour lister les modèles Gemini disponibles
 * Usage: npx tsx test-gemini-list-models.ts
 */

const GEMINI_API_KEY = 
  process.env.EXPO_PUBLIC_GEMINI_API_KEY || 
  process.env.GEMINI_API_KEY || 
  'AIzaSyDyHsxNriGf0EHGTjdH8d_nBQ5pbpyg0KU';

async function listGeminiModels() {
  try {
    console.log('🔍 Récupération de la liste des modèles Gemini disponibles...\n');
    
    // Endpoint pour lister les modèles
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Erreur:', errorData);
      throw new Error(`Erreur ${response.status}: ${errorData.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log('✅ Modèles disponibles:\n');
    
    if (data.models && Array.isArray(data.models)) {
      // Filtrer les modèles qui supportent generateContent
      const generateContentModels = data.models.filter((model: any) => 
        model.supportedGenerationMethods?.includes('generateContent')
      );
      
      console.log(`📋 ${generateContentModels.length} modèle(s) supportant generateContent:\n`);
      
      generateContentModels.forEach((model: any) => {
        console.log(`  - ${model.name}`);
        if (model.displayName) {
          console.log(`    Display Name: ${model.displayName}`);
        }
        if (model.description) {
          console.log(`    Description: ${model.description}`);
        }
        console.log('');
      });
      
      // Afficher les modèles recommandés
      const recommended = generateContentModels.filter((model: any) => 
        model.name.includes('flash') || model.name.includes('pro')
      );
      
      if (recommended.length > 0) {
        console.log('💡 Modèles recommandés pour notre usage:\n');
        recommended.forEach((model: any) => {
          console.log(`  - ${model.name}`);
        });
        console.log('');
      }
    } else {
      console.log('⚠️  Format de réponse inattendu:', data);
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des modèles:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
    }
    process.exit(1);
  }
}

listGeminiModels();

