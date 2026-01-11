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
    
    // MÉTHODE 1 : API Catalog avec limite correcte (30 max)
    try {
      const catalogUrl = `https://catalog.roblox.com/v1/search/items/details?Category=11&CreatorTargetId=${userId}&CreatorType=1&Limit=30`;
      const catalogResponse = await fetch(catalogUrl);
      
      if (catalogResponse.ok) {
        const catalogData = await catalogResponse.json();
        
        if (catalogData.data && catalogData.data.length > 0) {
          for (const item of catalogData.data) {
            if (item.price && item.price > 0 && !gamepassIds.has(item.id)) {
              gamepasses.push({
                Id: item.id,
                Name: item.name || 'Gamepass',
                Price: item.price,
                IconImageAssetId: item.iconImageAssetId || 0
              });
              gamepassIds.add(item.id);
            }
          }
        }
      }
    } catch (err) {
      console.error('Erreur Catalog API:', err.message);
    }
    
    // MÉTHODE 2 : Via les jeux (si méthode 1 échoue)
    if (gamepasses.length === 0) {
      const gamesUrl = `https://games.roblox.com/v2/users/${userId}/games?accessFilter=2&limit=50&sortOrder=Asc`;
      const gamesResponse = await fetch(gamesUrl);
      
      if (gamesResponse.ok) {
        const gamesData = await gamesResponse.json();
        
        if (gamesData.data && gamesData.data.length > 0) {
          for (const game of gamesData.data) {
            const universeId = game.id;
            
            try {
              const passUrl = `https://games.roblox.com/v1/games/${universeId}/game-passes?limit=100&sortOrder=Asc`;
              const passResponse = await fetch(passUrl);
              
              if (passResponse.ok) {
                const passData = await passResponse.json();
                
                if (passData.data && passData.data.length > 0) {
                  for (const pass of passData.data) {
                    if (pass.price && pass.price > 0 && !gamepassIds.has(pass.id)) {
                      gamepasses.push({
                        Id: pass.id,
                        Name: pass.name,
                        Price: pass.price,
                        IconImageAssetId: pass.iconImageAssetId || 0,
                        GameName: game.name
                      });
                      gamepassIds.add(pass.id);
                    }
                  }
                }
              }
            } catch (err) {
              console.error(`Erreur pour universeId ${universeId}:`, err.message);
            }
            
            await new Promise(resolve => setTimeout(resolve, 150));
          }
        }
      }
    }
    
    return res.status(200).json({
      success: true,
      gamepasses: gamepasses,
      count: gamepasses.length,
      userId: userId
    });
    
  } catch (error) {
    console.error('Erreur serveur:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
