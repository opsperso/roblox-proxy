export default async function handler(req, res) {
  // Headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const { userId } = req.query;
  
  if (!userId || isNaN(userId)) {
    return res.status(400).json({
      success: false,
      error: 'userId invalide ou manquant'
    });
  }
  
  try {
    const gamepasses = [];
    const gamepassIds = new Set();
    
    console.log('🔍 Recherche gamepasses pour userId:', userId);
    
    // ════════════════════════════════════════════════════
    // MÉTHODE 1 : Via les jeux du créateur
    // ════════════════════════════════════════════════════
    try {
      const gamesUrl = `https://games.roblox.com/v2/users/${userId}/games?accessFilter=2&limit=50&sortOrder=Asc`;
      console.log('📡 Requête games:', gamesUrl);
      
      const gamesResponse = await fetch(gamesUrl);
      
      if (gamesResponse.ok) {
        const gamesData = await gamesResponse.json();
        console.log('📦 Jeux trouvés:', gamesData.data?.length || 0);
        
        if (gamesData.data && gamesData.data.length > 0) {
          for (const game of gamesData.data) {
            const universeId = game.id;
            console.log('🎮 Vérification du jeu:', game.name, '(Universe ID:', universeId, ')');
            
            try {
              const passUrl = `https://games.roblox.com/v1/games/${universeId}/game-passes?limit=100&sortOrder=Asc`;
              const passResponse = await fetch(passUrl);
              
              if (passResponse.ok) {
                const passData = await passResponse.json();
                console.log('  → Gamepasses dans ce jeu:', passData.data?.length || 0);
                
                if (passData.data && passData.data.length > 0) {
                  for (const pass of passData.data) {
                    // ⭐ CHANGEMENT ICI : On prend TOUS les gamepasses, même gratuits
                    if (!gamepassIds.has(pass.id)) {
                      gamepasses.push({
                        Id: pass.id,
                        Name: pass.name,
                        Price: pass.price || 0, // 0 si gratuit
                        IconImageAssetId: pass.iconImageAssetId || 0,
                        GameName: game.name
                      });
                      gamepassIds.add(pass.id);
                      console.log('    ✅', pass.name, '-', pass.price || 0, 'Robux');
                    }
                  }
                }
              }
            } catch (err) {
              console.error('Erreur pour universeId', universeId, ':', err.message);
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      }
    } catch (err) {
      console.error('Erreur Games API:', err.message);
    }
    
    // ════════════════════════════════════════════════════
    // MÉTHODE 2 : Via Catalog API (backup)
    // ════════════════════════════════════════════════════
    if (gamepasses.length === 0) {
      try {
        console.log('🔄 Tentative via Catalog API...');
        const catalogUrl = `https://catalog.roblox.com/v1/search/items/details?Category=11&CreatorTargetId=${userId}&CreatorType=1&Limit=30`;
        const catalogResponse = await fetch(catalogUrl);
        
        if (catalogResponse.ok) {
          const catalogData = await catalogResponse.json();
          console.log('📦 Résultats Catalog:', catalogData.data?.length || 0);
          
          if (catalogData.data && catalogData.data.length > 0) {
            for (const item of catalogData.data) {
              if (!gamepassIds.has(item.id)) {
                gamepasses.push({
                  Id: item.id,
                  Name: item.name || 'Gamepass',
                  Price: item.price || 0,
                  IconImageAssetId: item.iconImageAssetId || 0
                });
                gamepassIds.add(item.id);
                console.log('  ✅', item.name, '-', item.price || 0, 'Robux');
              }
            }
          }
        }
      } catch (err) {
        console.error('Erreur Catalog API:', err.message);
      }
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RÉSULTAT FINAL:', gamepasses.length, 'gamepasses');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    return res.status(200).json({
      success: true,
      gamepasses: gamepasses,
      count: gamepasses.length,
      userId: userId
    });
    
  } catch (error) {
    console.error('❌ Erreur serveur:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
