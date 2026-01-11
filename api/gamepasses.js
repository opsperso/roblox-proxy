export default async function handler(req, res) {
  // Configuration CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const { userId } = req.query;
  
  console.log('Requête reçue pour userId:', userId);
  
  if (!userId || isNaN(userId)) {
    return res.status(400).json({
      success: false,
      error: 'userId invalide ou manquant'
    });
  }
  
  try {
    const gamepasses = [];
    
    console.log('Récupération des jeux...');
    
    // Récupérer les jeux du joueur
    const gamesUrl = `https://games.roblox.com/v2/users/${userId}/games?accessFilter=2&limit=50&sortOrder=Asc`;
    const gamesResponse = await fetch(gamesUrl);
    
    if (!gamesResponse.ok) {
      throw new Error(`Erreur API jeux: ${gamesResponse.status}`);
    }
    
    const gamesData = await gamesResponse.json();
    
    if (!gamesData.data || gamesData.data.length === 0) {
      console.log('Aucun jeu trouvé');
      return res.status(200).json({
        success: true,
        gamepasses: [],
        message: 'Aucun jeu public trouvé'
      });
    }
    
    console.log(`${gamesData.data.length} jeu(x) trouvé(s)`);
    
    // Pour chaque jeu, récupérer les gamepasses
    for (const game of gamesData.data) {
      const universeId = game.id;
      console.log(`Analyse du jeu: ${game.name} (ID: ${universeId})`);
      
      try {
        const passUrl = `https://games.roblox.com/v1/games/${universeId}/game-passes?limit=100&sortOrder=Asc`;
        const passResponse = await fetch(passUrl);
        
        if (!passResponse.ok) {
          console.warn(`Erreur gamepasses pour jeu ${universeId}`);
          continue;
        }
        
        const passData = await passResponse.json();
        
        if (passData.data && passData.data.length > 0) {
          console.log(`${passData.data.length} gamepass(es) trouvé(s)`);
          
          for (const pass of passData.data) {
            // Ne garder que les gamepasses payants
            if (pass.price && pass.price > 0) {
              gamepasses.push({
                Id: pass.id,
                Name: pass.name,
                Price: pass.price,
                IconImageAssetId: pass.iconImageAssetId || 0,
                GameName: game.name
              });
              console.log(`  ✓ ${pass.name} - ${pass.price} Robux`);
            }
          }
        }
        
        // Petit délai pour éviter le rate limit
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (err) {
        console.error(`Erreur pour jeu ${universeId}:`, err.message);
      }
    }
    
    console.log(`Total: ${gamepasses.length} gamepass(es) en vente`);
    
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
