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
    
    // ÉTAPE 1 : Récupérer les jeux du joueur
    const gamesUrl = `https://games.roblox.com/v2/users/${userId}/games?accessFilter=2&limit=50&sortOrder=Asc`;
    const gamesResponse = await fetch(gamesUrl);
    
    if (!gamesResponse.ok) {
      throw new Error(`Erreur API jeux: ${gamesResponse.status}`);
    }
    
    const gamesData = await gamesResponse.json();
    
    if (!gamesData.data || gamesData.data.length === 0) {
      return res.status(200).json({
        success: true,
        gamepasses: [],
        message: 'Aucun jeu public trouvé',
        count: 0,
        userId: userId
      });
    }
    
    // ÉTAPE 2 : Pour chaque jeu, récupérer les gamepasses
    for (const game of gamesData.data) {
      const universeId = game.id;
      
      try {
        // Méthode 1 : API game-passes (la plus fiable)
        const passUrl = `https://games.roblox.com/v1/games/${universeId}/game-passes?limit=100&sortOrder=Asc`;
        const passResponse = await fetch(passUrl);
        
        if (passResponse.ok) {
          const passData = await passResponse.json();
          
          if (passData.data && passData.data.length > 0) {
            for (const pass of passData.data) {
              // Garder tous les gamepasses actifs avec un prix
              if (pass.price && pass.price > 0) {
                gamepasses.push({
                  Id: pass.id,
                  Name: pass.name,
                  Price: pass.price,
                  IconImageAssetId: pass.iconImageAssetId || 0,
                  GameName: game.name
                });
              }
            }
          }
        }
        
        // Petit délai pour éviter le rate limit
        await new Promise(resolve => setTimeout(resolve, 150));
        
      } catch (err) {
        console.error(`Erreur pour jeu ${universeId}:`, err.message);
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
