import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createFileStore } from './file-store.js';
import { delay } from 'baileys';
import { ShopManager } from './shop-manager.js';
import { WebSocketServer } from "ws";
        const fileStore = await createFileStore();
        const activeShops = await fileStore.getShops();
        const shopManager = await ShopManager.getInstance();

    try {

        for (const shop of activeShops) {
            const shopId = shop._id.toString();
            const status = shopManager.getShopStatus(shopId);
            console.log(`Vérification boutique ${shopId} - Statut : ${status}`);
            try {
                await delay(500);
                await shopManager.getOrCreateClient(shopId)
                console.log(`Boutique ${shopId} reconnexion initiée.`);
            }
            catch (error) {
                console.error(`Échec redémarrage boutique ${shopId}:`, error);
            }
        }
// Créer le serveur WebSocket

        const wss = new WebSocketServer({ port: 4000 });
        console.log("Bot WebSocket en écoute sur ws://localhost:4000");
        wss.on("connection", (ws) => {
            console.log("Nouvelle connexion API ↔ bot");

            ws.on("message", async (msg) => {
                try {
                const { action, data } = JSON.parse(msg);

                if (action === "getShopStatus") {
                    const status = shopManager.getShopStatus(data.shopId);
                    console.log("status",status)
                    ws.send(JSON.stringify({ action, status }));
                }

                if (action === "restartShop") {
                    await shopManager.getOrCreateClient(data.shopId);
                    ws.send(JSON.stringify({ action, success: true }));
                }
                } catch (err) {
                console.error("Erreur WebSocket:", err);
                ws.send(JSON.stringify({ error: err.message }));
                }
            });
        });
    }
    catch (error) {
        console.error('Erreur pendant la vérification:', error);
    }

console.log('Monitoring des boutiques démarré. Vérification horaire activée.');
process.on('uncaughtException', err => {
    console.error('Erreur fatale non gérée:', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Rejet non géré:', reason);
});


