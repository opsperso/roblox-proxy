export default async function handler(req, res) {
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
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 Recherche TOUS les gamepasses');
    console.log('👤 UserId:', userId);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // ════════════════════════════════════════════════════
    // MÉTHODE 1 : Jeux PUBLICS (accessFilter=2)
    // ════════════════════════════════════════════════════
    try {
      console.log('📡 Méthode 1 : Jeux publics');
      const publicGamesUrl = `https://games.roblox.com/v2/users/${userId}/games?accessFilter=2&limit=50&sortOrder=Asc`;
      const publicResponse = await fetch(publicGamesUrl);
      
      if (publicResponse.ok) {
        const publicData = await publicResponse.json();
        console.log('  → Jeux publics trouvés:', publicData.data?.length || 0);
        
        if (publicData.data && publicData.data.length > 0) {
          for (const game of publicData.data) {
            await scanGameForPasses(game, gamepasses, gamepassIds);
          }
        }
      }
    } catch (err) {
      console.error('Erreur Méthode 1:', err.message);
    }
    
    // ════════════════════════════════════════════════════
    // MÉTHODE 2 : TOUS les jeux (accessFilter=1) - inclut privés
    // ════════════════════════════════════════════════════
    try {
      console.log('📡 Méthode 2 : Tous les jeux (y compris privés)');
      const allGamesUrl = `https://games.roblox.com/v2/users/${userId}/games?accessFilter=1&limit=50&sortOrder=Asc`;
      const allResponse = await fetch(allGamesUrl);
      
      if (allResponse.ok) {
        const allData = await allResponse.json();
        console.log('  → Tous les jeux trouvés:', allData.data?.length || 0);
        
        if (allData.data && allData.data.length > 0) {
          for (const game of allData.data) {
            await scanGameForPasses(game, gamepasses, gamepassIds);
          }
        }
      }
    } catch (err) {
      console.error('Erreur Méthode 2:', err.message);
    }
    
    // ════════════════════════════════════════════════════
    // MÉTHODE 3 : Via Catalog API
    // ════════════════════════════════════════════════════
    try {
      console.log('📡 Méthode 3 : Catalog API');
      const catalogUrl = `https://catalog.roblox.com/v1/search/items/details?Category=11&CreatorTargetId=${userId}&CreatorType=1&Limit=30`;
      const catalogResponse = await fetch(catalogUrl);
      
      if (catalogResponse.ok) {
        const catalogData = await catalogResponse.json();
        console.log('  → Résultats Catalog:', catalogData.data?.length || 0);
        
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
              console.log('    ✅', item.name, '-', item.price || 0, 'Robux');
            }
          }
        }
      }
    } catch (err) {
      console.error('Erreur Méthode 3:', err.message);
    }
    
    // ════════════════════════════════════════════════════
    // MÉTHODE 4 : Via Badges API (pour trouver les jeux indirectement)
    // ════════════════════════════════════════════════════
    try {
      console.log('📡 Méthode 4 : Via Badges');
      const badgesUrl = `https://badges.roblox.com/v1/users/${userId}/badges?limit=100&sortOrder=Asc`;
      const badgesResponse = await fetch(badgesUrl);
      
      if (badgesResponse.ok) {
        const badgesData = await badgesResponse.json();
        
        if (badgesData.data && badgesData.data.length > 0) {
          const universeIds = new Set();
          
          // Extraire les universe IDs des badges
          for (const badge of badgesData.data) {
            if (badge.awardingUniverse && badge.awardingUniverse.id) {
              universeIds.add(badge.awardingUniverse.id);
            }
          }
          
          console.log('  → Univers trouvés via badges:', universeIds.size);
          
          // Scanner chaque univers
          for (const universeId of universeIds) {
            try {
              const passUrl = `https://games.roblox.com/v1/games/${universeId}/game-passes?limit=100&sortOrder=Asc`;
              const passResponse = await fetch(passUrl);
              
              if (passResponse.ok) {
                const passData = await passResponse.json();
                
                if (passData.data && passData.data.length > 0) {
                  console.log('  → Gamepasses dans univers', universeId, ':', passData.data.length);
                  
                  for (const pass of passData.data) {
                    if (!gamepassIds.has(pass.id)) {
                      gamepasses.push({
                        Id: pass.id,
                        Name: pass.name,
                        Price: pass.price || 0,
                        IconImageAssetId: pass.iconImageAssetId || 0
                      });
                      gamepassIds.add(pass.id);
                      console.log('    ✅', pass.name, '-', pass.price || 0, 'Robux');
                    }
                  }
                }
              }
              
              await new Promise(resolve => setTimeout(resolve, 100));
            } catch (err) {
              console.error('Erreur scan univers', universeId, ':', err.message);
            }
          }
        }
      }
    } catch (err) {
      console.error('Erreur Méthode 4:', err.message);
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RÉSULTAT FINAL:', gamepasses.length, 'gamepasses');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
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

// ════════════════════════════════════════════════════
// Fonction pour scanner un jeu et récupérer ses passes
// ════════════════════════════════════════════════════
async function scanGameForPasses(game, gamepasses, gamepassIds) {
  const universeId = game.id;
  console.log('  🎮 Scan:', game.name, '(Universe:', universeId, ')');
  
  try {
    const passUrl = `https://games.roblox.com/v1/games/${universeId}/game-passes?limit=100&sortOrder=Asc`;
    const passResponse = await fetch(passUrl);
    
    if (passResponse.ok) {
      const passData = await passResponse.json();
      
      if (passData.data && passData.data.length > 0) {
        console.log('    → Passes trouvés:', passData.data.length);
        
        for (const pass of passData.data) {
          if (!gamepassIds.has(pass.id)) {
            gamepasses.push({
              Id: pass.id,
              Name: pass.name,
              Price: pass.price || 0,
              IconImageAssetId: pass.iconImageAssetId || 0,
              GameName: game.name
            });
            gamepassIds.add(pass.id);
            console.log('      ✅', pass.name, '-', pass.price || 0, 'Robux');
          }
        }
      }
    }
  } catch (err) {
    console.error('    ❌ Erreur scan:', err.message);
  }
  
  await new Promise(resolve => setTimeout(resolve, 100));
}
